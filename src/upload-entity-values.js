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

    async createUpload(args) {
        const fd = new FormData();
        if (args.csv) {
            fd.append('upload', fs.createReadStream(args.csv), {
                filename: 'entity.csv',
                contentType: 'text/csv;charset=utf8'
            });
        } else if (args.json) {
            const json = JSON.parse(fs.readFileSync(args.json, 'utf8'));
            const csv = json.data.map((row) => [row.value, row.name]);
            const string = csvstringify(csv, {  delimiter:',' });
            fd.append('upload', string, {
                filename: 'entity.csv',
                contentType: 'text/csv;charset=utf8'
            });
        }
        for (let key of ['entity_id', 'entity_name', 'no_ner_support'])
            fd.append(key, args[key]);
        return fd;
    },

    async execute(args) {
        if (!args.access_token)
            throw new Error(`You must pass a valid OAuth access token to talk to Thingpedia`);

        args.no_ner_support = args.no_ner_support ? '1' : '';
        const fd = await this.createUpload(args);
        await Tp.Helpers.Http.postStream(args.thingpedia_url + '/api/v3/entities/create', fd, {
            dataContentType:  'multipart/form-data; boundary=' + fd.getBoundary(),
            extraHeaders: {
                Authorization: 'Bearer ' + args.access_token
            },
            useOAuth2: true
        });

        console.log('Success!');
    }
};
