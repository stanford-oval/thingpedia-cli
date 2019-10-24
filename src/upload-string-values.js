// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const fs = require('fs');
const FormData = require('form-data');

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.addParser('upload-string-values', {
            addHelp: true,
            description: "Upload a string value dataset to Thingpedia."
        });
        parser.addArgument('--file', {
            required: true,
            help: "The .tsv file of the string values to upload."
        });
        parser.addArgument('--type-name', {
            required: true,
            help: "The id (type) of the string dataset."
        });
        parser.addArgument('--name', {
            required: true,
            help: "The name of the string dataset."
        });
        parser.addArgument('--license', {
            required: false,
            defaultValue: "public-domain",
            help: "The license of the string dataset."
        });
        parser.addArgument('--preprocessed', {
            nargs: 0,
            action: 'storeTrue',
            help: 'If the values are already tokenized.',
            defaultValue: false
        });
    },

    async createUpload(args) {
        const fd = new FormData();
        fd.append('upload', fs.createReadStream(args.file), { file: 'strings.tsv', contentType: 'text/csv;charset=utf8' });
        for (let key of ['type_name', 'name', 'license', 'preprocessed'])
            fd.append(key, args[key]);
        return fd;
    },

    async execute(args) {
        if (!args.access_token)
            throw new Error(`You must pass a valid OAuth access token to talk to Thingpedia`);

        args.preprocessed = args.preprocessed ? '1' : '';
        const fd = await this.createUpload(args);
        await Tp.Helpers.Http.postStream(args.thingpedia_url + '/api/v3/strings/upload', fd, {
            dataContentType:  'multipart/form-data; boundary=' + fd.getBoundary(),
            extraHeaders: {
                Authorization: 'Bearer ' + args.access_token
            },
            useOAuth2: true
        });

        console.log('Success!');
    }
};
