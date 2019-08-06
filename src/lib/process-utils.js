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

const child_process = require('child_process');

module.exports = {
    execCommand(argv, options = {}) {
        return new Promise((resolve, reject) => {
            const [argv0, ...args] = argv;
            if (!options.stdio)
                options.stdio = ['ignore', 'inherit', 'inherit'];

            console.log(`+ ${argv0} ${args.map((a) => "'" + a + "'").join(' ')}`);
            const child = child_process.spawn(argv0, args, options);
            child.on('error', reject);
            child.on('exit', (code, signal) => {
                if (signal) {
                    if (signal === 'SIGINT' || signal === 'SIGTERM')
                        reject(new Error(`Killed`));
                    else
                        reject(new Error(`Command crashed with signal ${signal}`));
                } else {
                    if (code !== 0)
                        reject(new Error(`Command exited with code ${code}`));
                    else
                        resolve();
                }
            });
        });
    }
};
