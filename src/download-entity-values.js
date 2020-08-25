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

const Tp = require('thingpedia');
const fs = require('fs');
const path = require('path');
const util = require('util');

const StreamUtils = require('./lib/stream-utils');
const ProgressBar = require('./lib/progress_bar');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.add_parser('download-entity-values', {
            add_help: true,
            description: "Download one or more entity dataset from Thingpedia."
        });
        parser.add_argument('-d', '--output-dir', {
            required: true,
        });
        parser.add_argument('--type', {
            required: false,
            action: 'append',
            default: [],
            help: `identifier of the Thingpedia entity datasets to download (if omitted, all entities are downloaded)`
        });
        parser.add_argument('--manifest', {
            required: false,
            help: `write a parameter dataset manifest to this location (suitable for Genie)`
        });
        parser.add_argument('--append-manifest', {
            required: false,
            action: 'store_true',
            help: `append to the manifest instead of replacing`
        });

        parser.add_argument('--debug', {
            action: 'store_true',
            help: 'Enable debugging.',
            default: false
        });
        parser.add_argument('--no-debug', {
            action: 'store_false',
            dest: 'debug',
            help: 'Disable debugging.',
        });
    },

    async execute(args) {
        await util.promisify(fs.mkdir)(args.output_dir, { recursive: true });

        if (args.type.length === 0) {
            let listUrl = args.thingpedia_url + '/api/v3/entities/all?locale=' + args.locale;
            if (args.developer_key)
                listUrl += '&developer_key=' + args.developer_key;

            args.type = JSON.parse(await Tp.Helpers.Http.get(listUrl, { accept: 'application/json' }))
                .data.filter((e) => !e.is_well_known && e.has_ner_support).map((e) => e.type);
        }

        let progbar;
        if (!args.debug) {
            progbar = new ProgressBar(args.type.length);
            // issue an update now to show the progress bar
            progbar.update(0);
        }

        let manifest;
        if (args.manifest)
            manifest = fs.createWriteStream(args.manifest, { flags: args.append_manifest ? 'a' : 'w' });

        let progress = 0;
        for (let type of args.type) {
            let url = args.thingpedia_url + '/api/v3/entities/list/' + type + '?locale=' + args.locale;
            if (args.developer_key)
                url += '&developer_key=' + args.developer_key;

            const outputpath = path.resolve(args.output_dir, type + '.json');
            const output = fs.createWriteStream(outputpath);

            if (manifest)
                manifest.write(`entity\t${args.locale}\t${type}\t${path.relative(path.dirname(args.manifest), outputpath)}\n`);

            (await Tp.Helpers.Http.getStream(url)).pipe(output);
            await StreamUtils.waitFinish(output);

            progress++;
            if (progbar)
                progbar.update(progress);
        }

        if (manifest) {
            manifest.end();
            await StreamUtils.waitFinish(manifest);
        }
    }
};
