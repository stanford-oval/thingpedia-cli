#!/bin/bash

set -e
set -x

srcdir=`dirname $0`/..
srcdir=`realpath $srcdir`

workdir=`mktemp -t -d thingpedia-cli-XXXXXX`
workdir=`realpath $workdir`
on_error() {
    rm -fr $workdir
}
trap on_error ERR INT TERM

oldpwd=`pwd`
cd $workdir

$srcdir/src/main.js --help

# init commands

$srcdir/src/main.js init-project my-awesome-devices
cd my-awesome-devices

git config thingpedia.url https://almond-dev.stanford.edu/thingpedia
git config thingpedia.developer-key 88c03add145ad3a3aa4074ffa828be5a391625f9d4e1d0b034b445f18c595656

# download commands

$srcdir/src/main.js download-snapshot -o thingpedia.tt
$srcdir/src/main.js --url https://almond.stanford.edu/thingpedia download-snapshot -o thingpedia8.tt --snapshot 8
diff -u thingpedia8.tt $srcdir/test/data/expected-thingpedia8.tt
$srcdir/src/main.js download-templates -o templates.tt

$srcdir/src/main.js download-entities -o entities.json
$srcdir/src/main.js download-entity-values -d parameters --manifest parameters/parameter-datasets.tsv

$srcdir/src/main.js download-strings -o strings.json
$srcdir/src/main.js download-string-values -d parameters --manifest parameters/parameter-datasets.tsv --append-manifest

# upload commands

$srcdir/src/main.js init-device com.foo
$srcdir/src/main.js init-device --loader org.thingpedia.generic_rest.v1 com.foo.generic_rest

cp -r $srcdir/test/data/com.test .
make
#yarn test
test -f com.foo.zip
test -f com.test.zip

# skip the test if we don't have a token
if test -n "${THINGPEDIA_ACCESS_TOKEN}" ; then
	$srcdir/src/main.js upload-device \
	  --manifest com.test/manifest.tt \
	  --dataset com.test/dataset.tt \
	  --zipfile com.test.zip
fi

cd $oldpwd
rm -rf $workdir
