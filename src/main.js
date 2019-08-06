#!/usr/bin/env node
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

process.on('unhandledRejection', (up) => { throw up; });

// require('thingpedia') immediately to initialize the polyfills
require('thingpedia');

const argparse = require('argparse');

const I18n = require('./i18n');

const subcommands = {};

async function main() {
    I18n.init();

    const parser = new argparse.ArgumentParser({
        addHelp: true,
        description: I18n._("A tool to interact with the Thingpedia open API repository.")
    });

    const subparsers = parser.addSubparsers({ title: 'Available sub-commands', dest: 'subcommand' });
    for (let subcommand in subcommands)
        subcommands[subcommand].initArgparse(subparsers);

    const args = parser.parseArgs();
    await subcommands[args.subcommand].execute(args);
}
main();
