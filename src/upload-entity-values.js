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
// Author: Silei Xu <silei@cs.stanford.edu>
"use strict";

const Tp = require('thingpedia');
const fs = require('fs');
const FormData = require('form-data');
const csvstringify = require('csv-stringify');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('upload-entity-values', {
            addHelp: true,
            description: "Upload a new entity type to Thingpedia."
        });
        parser.addArgument('--csv', {
            required: false,
            help: "The .csv file of the entity values to upload."
        });
        parser.addArgument('--json', {
            required: false,
            help: "The .json file of the entity values to upload"
        });
        parser.addArgument('--entity-id', {
            required: true,
            help: "The id (type) of the string dataset."
        });
        parser.addArgument('--entity-name', {
            required: true,
            help: "The name of the string dataset."
        });
        parser.addArgument('--no-ner-support', {
            nargs: 0,
            action: 'storeTrue',
            help: 'If this entity is an opaque identifier that cannot be used from natural language.',
            defaultValue: false
        });
    },

    createUpload(args) {
        const fd = new FormData();
        if (args.no_ner_support !== '1') {
            if (args.csv) {
                fd.append('upload', fs.createReadStream(args.csv), {
                    filename: 'entity.csv',
                    contentType: 'text/csv;charset=utf8'
                });
            } else if (args.json) {
                const json = JSON.parse(fs.readFileSync(args.json, 'utf8'));
                const csv = json.data.map((row) => [row.value, row.name]);
                const string = csvstringify(csv, {delimiter: ','});
                fd.append('upload', string, {
                    filename: 'entity.csv',
                    contentType: 'text/csv;charset=utf8'
                });
            } else {
                throw new Error(`Either a json file or a csv file is needed.`);
            }
        }
        for (let key of ['entity_id', 'entity_name', 'no_ner_support'])
            fd.append(key, args[key]);
        return fd;
    },

    async execute(args) {
        if (!args.access_token)
            throw new Error(`You must pass a valid OAuth access token to talk to Thingpedia`);

        args.no_ner_support = args.no_ner_support ? '1' : '';
        const fd = this.createUpload(args);
        await Tp.Helpers.Http.postStream(args.thingpedia_url + '/api/v3/entities/create', fd, {
            dataContentType:  'multipart/form-data; boundary=' + fd.getBoundary(),
            auth: 'Bearer ' + args.access_token
        });

        console.log('Success!');
    }
};
