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

module.exports = {
    waitFinish(stream) {
        return new Promise((resolve, reject) => {
            stream.once('finish', resolve);
            stream.on('error', reject);
        });
    }
};
