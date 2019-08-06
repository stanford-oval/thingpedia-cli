// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const fs = require('fs');
const Tp = require('thingpedia');

const StreamUtils = require('./lib/stream-utils');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('download-entities', {
            addHelp: true,
            description: "Download a snapshot of Thingpedia."
        });
        parser.addArgument(['-o', '--output'], {
            required: true,
            type: fs.createWriteStream
        });
        parser.addArgument('--snapshot', {
            required: false,
            defaultValue: '-1',
            help: `identifier of the Thingpedia snapshot to download (or -1 for the latest snapshot)`
        });
    },

    async execute(args) {
        let url = args.thingpedia_url + '/api/v3/entities/all?snapshot=' + args.snapshot + '&locale=' + args.locale;
        if (args.developer_key)
            url += '&developer_key=' + args.developer_key;

        args.output.end(JSON.stringify(JSON.parse(
            await Tp.Helpers.Http.get(url, { accept: 'application/json' })),
            undefined, 2));
        await StreamUtils.waitFinish(args.output);
    }
};
