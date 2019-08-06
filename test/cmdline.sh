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

rm -rf $workdir
