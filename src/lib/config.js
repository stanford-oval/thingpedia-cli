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
const util = require('util');

async function get(key, _default) {
    try {
        const args = ['config', '--get', '--default', _default || '', key];
        const { stdout, stderr } = await util.promisify(child_process.execFile)('git', args);
        process.stderr.write(stderr);
        return stdout.trim() || _default;
    } catch(e) {
        // ignore error if git is not installed
        if (e.code !== 'ENOENT')
            throw e;
        // also ignore error if the key
        return _default;
    }
}

module.exports = {
    get,
};
