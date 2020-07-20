// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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
const path = require('path');
const util = require('util');
const FormData = require('form-data');
const mime = require('mime');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('upload-device', {
            addHelp: true,
            description: "Upload a device to Thingpedia."
        });
        parser.addArgument('--zipfile', {
            required: false,
            help: "ZIP file to upload."
        });
        parser.addArgument('--icon', {
            required: false,
            help: "Icon file to upload."
        });
        parser.addArgument('--manifest', {
            required: true,
            help: "ThingTalk class definition file."
        });
        parser.addArgument('--dataset', {
            required: true,
            help: "ThingTalk dataset file with the class's primitive templates."
        });
        parser.addArgument('--approve', {
            action: 'storeTrue',
            help: "Approve the device automatically (if possible)."
        });
    },

    async execute(args) {
        if (!args.access_token)
            throw new Error(`You must pass a valid OAuth access token to talk to Thingpedia`);

        const manifest = await util.promisify(fs.readFile)(args.manifest, { encoding: 'utf8' });
        let parsed;
        try {
            parsed = ThingTalk.Grammar.parse(manifest);
        } catch(e) {
            throw new Error(`Error parsing manifest.tt: ${e.message}`);
        }
        if (!parsed.isLibrary || parsed.classes.length !== 1)
            throw new Error(`The manifest file must contain exactly one class definition`);

        const classDef = parsed.classes[0];
        const fd = new FormData();

        fd.append('primary_kind', classDef.kind);
        if (classDef.metadata.thingpedia_name)
            fd.append('name', classDef.metadata.thingpedia_name);
        else if (classDef.metadata.name)
            fd.append('name', classDef.metadata.name);
        else
            throw new Error(`Missing required class annotation #_[name]`);
        if (classDef.metadata.thingpedia_description)
            fd.append('description', classDef.metadata.thingpedia_description);
        else if (classDef.metadata.description)
            fd.append('description', classDef.metadata.description);
        else
            throw new Error(`Missing required class annotation #_[description]`);

        for (let annot of ['license', 'license_gplcompatible', 'subcategory']) {
            if (!classDef.annotations[annot])
                throw new Error(`Missing required class annotation #[${annot}]`);

            const value = classDef.annotations[annot].toJS();
            if (typeof value === 'boolean') {
                if (value)
                    fd.append(annot, '1');
            } else {
                fd.append(annot, value);
            }
        }
        for (let annot of ['website', 'repository', 'issue_tracker']) {
            if (classDef.annotations[annot])
                fd.append(annot, classDef.annotations[annot].toJS());
        }

        const dataset = await util.promisify(fs.readFile)(args.dataset, { encoding: 'utf8' });
        // sanitiy check it locally
        ThingTalk.Grammar.parse(dataset);

        fd.append('code', manifest);
        fd.append('dataset', dataset);
        if (args.approve)
            fd.append('approve', '1');

        for (let key of ['zipfile', 'icon']) {
            if (args[key]) {
                const stream = fs.createReadStream(args[key]);
                const filename = path.basename(args[key]);
                const contentType = mime.getType(args[key]);
                fd.append(key, stream, { filename, contentType });
            }
        }
        await Tp.Helpers.Http.postStream(args.thingpedia_url + '/api/v3/devices/create', fd, {
            dataContentType:  'multipart/form-data; boundary=' + fd.getBoundary(),
            extraHeaders: {
                Authorization: 'Bearer ' + args.access_token
            },
            useOAuth2: true
        });

        console.log('Success!');
    }
};
