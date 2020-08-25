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

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.add_parser('upload-string-values', {
            add_help: true,
            description: "Upload a string value dataset to Thingpedia."
        });
        parser.add_argument('input_file', {
            help: "The .tsv file of the string values to upload."
        });
        parser.add_argument('--type-name', {
            required: true,
            help: "The id (type) of the string dataset."
        });
        parser.add_argument('--name', {
            required: true,
            help: "The name of the string dataset."
        });
        parser.add_argument('--license', {
            required: false,
            choices: ['public-domain', 'free-permissive', 'free-copyleft', 'non-commercial', 'proprietary'],
            default: "public-domain",
            help: "The license of the string dataset."
        });
        parser.add_argument('--preprocessed', {
            action: 'store_true',
            help: 'If the values are already tokenized.',
            default: false
        });
    },

    createUpload(args) {
        const fd = new FormData();
        fd.append('upload', fs.createReadStream(args.input_file), {
            filename: 'strings.tsv',
            contentType: 'text/tab-separated-values;charset=utf8'
        });
        for (let key of ['type_name', 'name', 'license', 'preprocessed'])
            fd.append(key, args[key]);
        return fd;
    },

    async execute(args) {
        if (!args.access_token)
            throw new Error(`You must pass a valid OAuth access token to talk to Thingpedia`);

        args.preprocessed = args.preprocessed ? '1' : '';
        const fd = this.createUpload(args);
        await Tp.Helpers.Http.postStream(args.thingpedia_url + '/api/v3/strings/upload', fd, {
            dataContentType:  'multipart/form-data; boundary=' + fd.getBoundary(),
            auth: 'Bearer ' + args.access_token
        });

        console.log('Success!');
    }
};
