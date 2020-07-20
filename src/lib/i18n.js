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
//
// See LICENSE for details
"use strict";

const path = require('path');
const Gettext = require('node-gettext');
const gettextParser = require('gettext-parser');
const fs = require('fs');

function loadTextdomainDirectory(gt, locale, domain, modir) {
    let split = locale.split(/[-_.@]/);
    let mo = modir + '/' + split.join('_') + '.mo';

    while (!fs.existsSync(mo) && split.length) {
        split.pop();
        mo = modir + '/' + split.join('_') + '.mo';
    }
    if (split.length === 0)
        return;
    try {
        let loaded = gettextParser.mo.parse(fs.readFileSync(mo), 'utf-8');
        gt.addTranslations(locale, domain, loaded);
    } catch(e) {
        console.log(`Failed to load translations for ${locale}/${domain}: ${e.message}`);
    }
}

module.exports = {
    init
};

function init() {
    const locale = (process.env.LC_MESSAGES || process.env.LANG || 'en_US')
        .split('.')[0].replace(/[^a-zA-Z]/g, '-');

    const gt = new Gettext();
    if (locale !== 'en-US') {
        let modir = path.resolve(path.dirname(module.filename), '../po');//'
        loadTextdomainDirectory(gt, locale, 'thingpedia-cli', modir);
        modir = path.resolve(path.dirname(module.filename), '../node_modules/thingtalk/po');
        loadTextdomainDirectory(gt, locale, 'thingtalk', modir);
    }
    gt.textdomain('thingpedia-cli');
    gt.setLocale(locale);
    module.exports.locale = locale;

    // prebind the gt for ease of use, because the usual gettext API is not object-oriented
    module.exports.gettext = module.exports._ = gt.gettext.bind(gt);
    module.exports.ngettext = gt.ngettext.bind(gt);
    module.exports.pgettext = gt.pgettext.bind(gt);

    module.exports.dgettext = gt.dgettext.bind(gt);
    module.exports.dngettext = gt.dngettext.bind(gt);
    module.exports.dpgettext = gt.dpgettext.bind(gt);
}
