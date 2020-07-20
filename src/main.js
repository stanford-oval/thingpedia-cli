#!/usr/bin/env node
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

process.on('unhandledRejection', (up) => { throw up; });

// require('thingpedia') immediately to initialize the polyfills
require('thingpedia');

const argparse = require('argparse');

const I18n = require('./lib/i18n');
const Config = require('./lib/config');

const DEFAULT_THINGPEDIA_URL = 'https://thingpedia.stanford.edu/thingpedia';

const subcommands = {
    'download-snapshot': require('./download-snapshot'),
    'download-templates': require('./download-templates'),
    'download-entities': require('./download-entities'),
    'download-entity-values': require('./download-entity-values'),
    'download-strings': require('./download-strings'),
    'download-string-values': require('./download-string-values'),

    'init-project': require('./init-project'),
    'init-device': require('./init-device'),

    'upload-device': require('./upload-device'),
    'upload-string-values': require('./upload-string-values'),
    'upload-entity-values': require('./upload-entity-values'),

    'lint-device': require('./lint-device')
};

async function main() {
    I18n.init();

    const parser = new argparse.ArgumentParser({
        addHelp: true,
        description: I18n._("A tool to interact with the Thingpedia open API repository.")
    });

    parser.addArgument('--url', {
        required: false,
        dest: 'thingpedia_url',
        help: `Base URL of Thingpedia server to contact; defaults to as configured in git, or ${DEFAULT_THINGPEDIA_URL}`
    });
    parser.addArgument(['-l', '--locale'], {
        required: false,
        defaultValue: 'en-US',
        help: `BGP 47 tag of the locale to use when querying Thingpedia`
    });
    parser.addArgument('--developer-key', {
        required: false,
        help: `Developer key to use when contacting Thingpedia`
    });
    parser.addArgument('--access-token', {
        required: false,
        help: `OAuth access token to use when contacting Thingpedia`
    });

    const subparsers = parser.addSubparsers({ title: 'Available sub-commands', dest: 'subcommand' });
    for (let subcommand in subcommands)
        subcommands[subcommand].initArgparse(subparsers);

    const args = parser.parseArgs();
    if (!args.thingpedia_url)
        args.thingpedia_url = await Config.get('thingpedia.url', process.env.THINGPEDIA_URL || DEFAULT_THINGPEDIA_URL);
    if (!args.developer_key)
        args.developer_key = await Config.get('thingpedia.developer-key', process.env.THINGPEDIA_DEVELOPER_KEY || null);
    if (!args.access_token)
        args.access_token = await Config.get('thingpedia.access-token', process.env.THINGPEDIA_ACCESS_TOKEN || null);

    try {
        await subcommands[args.subcommand].execute(args);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
main();
