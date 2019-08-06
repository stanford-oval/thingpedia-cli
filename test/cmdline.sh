#!/bin/bash

set -e
set -x

srcdir=`dirname $0`/..
srcdir=`realpath $srcdir`

workdir=`mktemp -t -d genie-XXXXXX`
workdir=`realpath $workdir`
on_error() {
    rm -fr $workdir
}
trap on_error ERR INT TERM

oldpwd=`pwd`
cd $workdir

$srcdir/src/main.js --help

# download commands

$srcdir/src/main.js download-snapshot -o thingpedia.tt
$srcdir/src/main.js download-snapshot -o thingpedia8.tt --snapshot 8
diff -u thingpedia8.tt $srcdir/test/data/expected-thingpedia8.tt

$srcdir/src/main.js download-entities -o entities.json
$srcdir/src/main.js download-entity-values -d entities --manifest entities.tsv

$srcdir/src/main.js download-templates -o templates.tt

rm -rf $workdir
