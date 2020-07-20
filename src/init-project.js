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

const fs = require('fs');
const util = require('util');
const path = require('path');
const Tp = require('thingpedia');

const { execCommand } = require('./lib/process-utils');
const { waitFinish } = require('./lib/stream-utils');
const ProgressBar = require('./lib/progress_bar');
const Config = require('./lib/config');

const LICENSES = {
    'BSD-3-Clause': 'bsd3',
    'BSD-2-Clause': 'bsd2',
    'MIT': 'mit',
    'CC0': 'cc0',
    'Apache-2.0': 'apache',
    'GPL-3.0': 'gpl3',
    'GPL-2.0': 'gpl2',
    'ISC': 'isc'
};

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('init-project', {
            addHelp: true,
            description: "Initialize a repository to develop Thingpedia devices."
        });
        parser.addArgument('--description', {
            required: false,
            defaultValue: '',
            help: "A description for the repository"
        });
        parser.addArgument('--author', {
            required: false,
            help: "The name and email to use as the author and copyright owner"
        });
        parser.addArgument('--license', {
            required: false,
            defaultValue: 'BSD-3-Clause',
            choices: Object.keys(LICENSES),
            help: "The code license to use for the repository, as a SPDX identifier (defaults to BSD-3-Clause)"
        });
        parser.addArgument('output_dir', {
        });
    },

    async execute(args) {
        try {
            await util.promisify(fs.rmdir)(args.output_dir);
        } catch(e) {
            if (e.code !== 'ENOENT') {
                console.error(`${args.output_dir} already exists and is not an empty directory`);
                return;
            }
        }

        const name = path.basename(args.output_dir);

        if (!args.author)
            args.author = `${await Config.get('user.name')} <${await Config.get('user.email')}>`;

        const parentDir = path.dirname(path.resolve(args.output_dir));
        await util.promisify(fs.mkdir)(parentDir, { recursive: true });

        console.log('Downloading skeleton...');
        const zipFile = fs.createWriteStream(path.resolve(parentDir, 'skeleton.zip'));
        const stream = await Tp.Helpers.Http.getStream('https://github.com/stanford-oval/thingpedia-common-devices/archive/skeleton.zip');

        let progbar;
        if (stream.headers['content-length'])
            progbar = new ProgressBar(parseFloat(stream.headers['content-length']));

        stream.on('data', (buf) => {
            if (progbar)
                progbar.add(buf.length);
            zipFile.write(buf);
        });
        stream.on('end', () => {
            zipFile.end();
        });

        await waitFinish(zipFile);
        await execCommand(['unzip', 'skeleton.zip'], { cwd: parentDir });
        await util.promisify(fs.rename)(path.resolve(parentDir, 'thingpedia-common-devices-skeleton'), args.output_dir);
        await util.promisify(fs.unlink)(path.resolve(parentDir, 'skeleton.zip'));

        console.log('Initializing Git repository...');
        await execCommand(['git', 'init'], { cwd: args.output_dir });

        await execCommand(['git', 'config', 'thingpedia.url', args.thingpedia_url], { cwd: args.output_dir });
        if (args.developer_key)
            await execCommand(['git', 'config', 'thingpedia.developer-key', args.developer_key], { cwd: args.output_dir });

        if (process.platform === 'darwin') {
            await execCommand(['sed', '-i', '.backup',
            '-e', `s|@@name@@|${name}|`,
            '-e', `s|@@description@@|${args.description}|`,
            '-e', `s|@@author@@|${args.author}|`,
            '-e', `s|@@license@@|${args.license}|`,
            path.resolve(args.output_dir, 'package.json')]);
            await execCommand(['rm', path.resolve(args.output_dir, 'package.json.backup')]);
        }
        else {
            await execCommand(['sed', '-i',
            '-e', `s|@@name@@|${name}|`,
            '-e', `s|@@description@@|${args.description}|`,
            '-e', `s|@@author@@|${args.author}|`,
            '-e', `s|@@license@@|${args.license}|`,
            path.resolve(args.output_dir, 'package.json')]);
        }

        const licenseFD = await util.promisify(fs.open)(path.resolve(args.output_dir, 'LICENSE'), 'w');
        await execCommand(['licejs',
            '-o', args.author,
            '-p', name,
            '-y', String((new Date).getFullYear()),
            LICENSES[args.license]
            ], { stdio: ['ignore', licenseFD, 'inherit'] });
        await util.promisify(fs.close)(licenseFD);

        console.log('Creating initial commit...');

        await execCommand(['git', 'add', '.'], { cwd: args.output_dir });
        await execCommand(['git', 'commit', '-m', 'Initial commit'], { cwd: args.output_dir });

        console.log('Installing dependencies...');

        await execCommand(['yarn'], { cwd: args.output_dir });

        console.log('Success!');
    }
};
