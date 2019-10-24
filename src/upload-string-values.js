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
        parser.addArgument('input_file', {
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
            choices: ['public-domain', 'free-permissive', 'free-copyleft', 'non-commercial', 'proprietary'],
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
