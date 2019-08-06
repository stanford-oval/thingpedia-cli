#!/bin/sh

set -e
set -x

srcdir=`dirname $0`/..

node $srcdir/test/unit.js

$srcdir/test/cmdline.sh
