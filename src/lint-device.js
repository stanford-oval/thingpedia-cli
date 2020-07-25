// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
"use strict";

const ThingTalk = require('thingtalk');
const Tp = require('thingpedia');
const fs = require('fs');
const util = require('util');

const { splitParams } = require('./lib/tokenize');

const ALLOWED_ARG_METADATA = new Set(['canonical', 'prompt']);
const ALLOWED_FUNCTION_METADATA = new Set(['canonical', 'confirmation', 'confirmation_remote', 'formatted']);
const ALLOWED_CLASS_METADATA = new Set(['name', 'description', 'thingpedia_name', 'thingpedia_description']);
const SUBCATEGORIES = new Set(['service','media','social-network','communication','home','health','data-management']);

function warning(msg) {
    console.error(`WARNING: ${msg}`);
}

let _anyError = false;
function error(msg) {
    _anyError = true;
    console.error(`ERROR: ${msg}`);
}

function validateMetadata(metadata, allowed) {
    for (let name of Object.getOwnPropertyNames(metadata)) {
        if (!allowed.has(name))
            warning(`Invalid natural language annotation ${name}`);
    }
}

async function loadClassDef(args, classCode, datasetCode) {
    const tpClient = new Tp.HttpClient({ getDeveloperKey() { return args.developer_key; } });
    const schemaRetriever = new ThingTalk.SchemaRetriever(tpClient, null, true);

    let parsed;
    try {
        parsed = await ThingTalk.Grammar.parseAndTypecheck(`${classCode}\n${datasetCode}`, schemaRetriever, true);
    } catch(e) {
        if (e.name === 'SyntaxError' && e.location) {
            let lineNumber = e.location.start.line;
            // add 1 for the \n that we add to separate classCode and datasetCode
            console.log(classCode);
            const classLength = 1 + classCode.split('\n').length;
            const fileName = lineNumber > classLength ? 'dataset.tt' : 'manifest.tt';
            // mind the 1-based line numbers...
            lineNumber = lineNumber > classLength ? lineNumber - classLength + 1 : lineNumber;
            throw new Error(`Syntax error in ${fileName} line ${lineNumber}: ${e.message}`);
        } else {
            throw new Error(e.message);
        }
    }

    if (!parsed.isMeta || parsed.classes.length !== 1)
        throw new Error("Invalid manifest file: must contain exactly one class, with the same identifier as the device");
    const classDef = parsed.classes[0];

    if (parsed.datasets.length > 1 || (parsed.datasets.length > 0 && parsed.datasets[0].name !== '@' + parsed.classes[0].kind))
        error("Invalid dataset file: must contain exactly one dataset, with the same identifier as the class");
    if (parsed.datasets.length > 0 && parsed.datasets[0].language !== 'en')
        error("The dataset must be for English: use `en` as the language tag.");
    const dataset = parsed.datasets.length > 0 ? parsed.datasets[0] :
        new ThingTalk.Ast.Dataset(null, '@' + parsed.classes[0].kind, 'en', [], {});

    return [classDef, dataset];
}

function validateDevice(classDef) {
    if (!classDef.metadata.thingpedia_name)
        warning(`Missing required class annotation #_[thingpedia_name]`);
    if (!classDef.metadata.thingpedia_description)
        warning(`Missing required class annotation #_[thingpedia_description]`);

    for (let annot of ['license', 'license_gplcompatible', 'subcategory']) {
        if (!classDef.annotations[annot]) {
            warning(`Missing required class annotation #[${annot}]`);
            continue;
        }

        if (annot === 'subcategory') {
            const value = classDef.annotations[annot].toJS();
            if (!SUBCATEGORIES.has(value))
                error(`Invalid device category ${value}`);
        }
    }

    validateMetadata(classDef.metadata, ALLOWED_CLASS_METADATA);

    if (!classDef.is_abstract) {
        if (!classDef.loader)
            error("loader mixin missing from class declaration");
        if (!classDef.config)
            classDef.imports.push(new ThingTalk.Ast.ImportStmt.Mixin(null, ['config'], 'org.thingpedia.config.none', []));
    }

    validateAllInvocations(classDef, {
        checkPollInterval: !classDef.is_abstract,
    });
}

function validateDataset(dataset, kind) {
    const names = new Set;
    dataset.examples.forEach((ex, i) => {
        try {
            let ruleprog = ex.toProgram();

            // try and convert to NN
            ThingTalk.NNSyntax.toNN(ruleprog, {});

            let foundOurDevice = false;
            for (let [, prim] of ex.iteratePrimitives()) {
                if (prim.selector.isDevice && prim.selector.kind === kind) {
                    foundOurDevice = true;
                    break;
                }
            }
            if (!foundOurDevice)
                warning(`Example ${i+1} does not use any function from this device`);

            // validate placeholders in all utterances
            if (ex.utterances.length === 0) {
                if (Object.prototype.hasOwnProperty.call(ex.annotations, 'utterances'))
                    throw new Error(`utterances must be a natural language annotation (with #_[]), not an implementation annotation`);
                else
                    throw new Error(`missing utterances annotation`);
            }

            if (ex.annotations.name) {
                if (typeof ex.annotations.name !== 'string')
                    throw new Error(`invalid #[name] annotation (must be a string)`);
                if (ex.annotations.name.length > 128)
                    throw new Error(`the #[name] annotation must be at most 128 characters`);
                if (names.has(ex.annotations.name))
                    throw new Error(`duplicate name`);
                names.add(ex.annotations.name);
            }

            for (let utterance of ex.utterances)
                validateUtterance(ex.args, utterance);
        } catch(e) {
            error(`Error in example ${i+1}: ${e.message}`);
        }
    });
}

function validateUtterance(args, utterance) {
    if (/_{4}/.test(utterance))
        throw new Error('Do not use blanks (4 underscores or more) in utterance, use placeholders');

    let placeholders = new Set;
    for (let chunk of splitParams(utterance.trim())) {
        if (chunk === '')
            continue;
        if (typeof chunk === 'string')
            continue;

        let [match, param1, param2, opt] = chunk;
        if (match === '$$')
            continue;
        let param = param1 || param2;
        if (!(param in args))
            throw new Error(`Invalid placeholder ${param}`);
        if (opt && opt !== 'const' && opt !== 'no-undefined')
            throw new Error(`Invalid placeholder option ${opt} for ${param}`);
        placeholders.add(param);
    }

    for (let arg in args) {
        if (!placeholders.has(arg))
            throw new Error(`Missing placeholder for argument ${arg}`);
    }
}

function validateAllInvocations(classDef, options = {}) {

    let entities = new Set;
    let stringTypes = new Set;
    validateInvocation(classDef.kind, classDef.actions, 'action', entities, stringTypes, options);
    validateInvocation(classDef.kind, classDef.queries, 'query', entities, stringTypes, options);
    return [Array.from(entities), Array.from(stringTypes)];
}

function validateInvocation(kind, where, what, entities, stringTypes, options = {}) {
    for (const name in where) {
        const fndef = where[name];

        validateMetadata(fndef.metadata, ALLOWED_FUNCTION_METADATA);

        if (fndef.metadata.canonical && fndef.metadata.canonical.indexOf('$') >= 0)
            warning(`Detected placeholder in canonical form for ${name}: this is incorrect, the canonical form must not contain parameters`);
        if (!fndef.metadata.confirmation)
            warning(`Missing confirmation for ${name}`);
        if (fndef.annotations.confirm) {
            if (!where[name].annotations.confirm.isBoolean)
                error(`Invalid #[confirm] annotation for ${name}, must be a Boolean`);
        }
        if (options.checkPollInterval && what === 'query' && where[name].is_monitorable) {
            if (!fndef.annotations.poll_interval)
                error(`Missing poll interval for monitorable query ${name}`);
            else if (fndef.annotations.poll_interval.toJS() < 0)
                error(`Invalid negative poll interval for monitorable query ${name}`);
        }

        for (const argname of where[name].args) {
            let type = fndef.getArgType(argname);
            while (type.isArray)
                type = type.elem;
            const arg = fndef.getArgument(argname);
            validateMetadata(arg.metadata, ALLOWED_ARG_METADATA);

            if (type.isEntity) {
                entities.add(type.type);
                if (arg.annotations['string_values'])
                    stringTypes.add(arg.annotations['string_values'].toJS());
            } else if (type.isString) {
                if (arg.annotations['string_values'])
                    stringTypes.add(arg.annotations['string_values'].toJS());
            } else {
                if (arg.annotations['string_values'])
                    error('The string_values annotation is valid only for String-typed parameters');
            }
        }
    }
}

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('lint-device', {
            addHelp: true,
            description: "Check the manifest for a Thingpedia device."
        });
        parser.addArgument('--manifest', {
            required: true,
            help: "ThingTalk class definition file."
        });
        parser.addArgument('--dataset', {
            required: true,
            help: "ThingTalk dataset file with the class's primitive templates."
        });
    },

    async execute(args) {
        const manifestCode = await util.promisify(fs.readFile)(args.manifest, { encoding: 'utf8' });
        const datasetCode = await util.promisify(fs.readFile)(args.dataset, { encoding: 'utf8' });

        const [classDef, dataset] = await loadClassDef(args, manifestCode, datasetCode);

        validateDevice(classDef);
        validateDataset(dataset, classDef.kind);

        if (_anyError)
            throw new Error(`Some errors occurred`);
    }
};
