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

const fs = require('fs');
const Tp = require('thingpedia');

const StreamUtils = require('./lib/stream-utils');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.add_parser('download-snapshot', {
            add_help: true,
            description: "Download a snapshot of Thingpedia."
        });
        parser.add_argument('-o', '--output', {
            required: true,
            type: fs.createWriteStream
        });
        parser.add_argument('--snapshot', {
            required: false,
            default: '-1',
            help: `identifier of the Thingpedia snapshot to download (or -1 for the latest snapshot)`
        });
    },

    async execute(args) {
        let url = args.thingpedia_url + '/api/v3/snapshot/' + args.snapshot + '?meta=1&locale=' + args.locale;
        if (args.developer_key)
            url += '&developer_key=' + args.developer_key;

        args.output.end(await Tp.Helpers.Http.get(url, { accept: 'application/x-thingtalk' }));
        await StreamUtils.waitFinish(args.output);
    }
};
