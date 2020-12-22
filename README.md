# Thingpedia Command Line Tools

[![Build Status](https://travis-ci.com/stanford-oval/thingpedia-cli.svg?branch=master)](https://travis-ci.com/stanford-oval/thingpedia-cli) [![Coverage Status](https://coveralls.io/repos/github/stanford-oval/thingpedia-cli/badge.svg?branch=master)](https://coveralls.io/github/stanford-oval/thingpedia-cli?branch=master) [![Dependency Status](https://david-dm.org/stanford-oval/thingpedia-cli/status.svg)](https://david-dm.org/stanford-oval/thingpedia-cli)

## An Open, Crowdsourced Repository of APIs

Thingpedia is the open repository of API used by the [Almond Virtual Assistant](https://almond.stanford.edu).
Anyone can contribute the interface code to access any device or web service, and publish it on Thingpedia.

This package contains a command line tool to interact with Thingpedia.
The tool helps with creating new devices, packing them for publication,
and using the Thingpedia APIs.

ThingTalk is developed by the Stanford Open Virtual Assistant Lab, a research
initiative led by prof. Monica Lam, from Stanford University. 
You can find more information at <https://oval.cs.stanford.edu>.

## Installation

To install this tool, run:
```bash
npm install -g thingpedia-cli
```

The resulting command will be called `thingpedia`.

## Documentation

See `thingpedia --help` to learn all the available commands and options.

### Using thingpedia-cli to develop Thingpedia devices

You can use this tool to help developing new Thingpedia devices.
First initialize a new repository to work into:

```bash
thingpedia --developer-key [developer-key] init-project --license BSD-3-Clause my-awesome-devices
```

This will initialize a new repository called `my-awesome-devices`
and download the skeleton for testing and packaging.

You should provide a Thingpedia developer key to the command if you have one.
You can also set it later with `git config thingpedia.developer-key`.

Inside the repository, you can now run:

```bash
thingpedia init-device --loader org.thingpedia.v2 com.example.myawesomedevice
```

This will initialize a new empty manifest and JavaScript package.

You or your contributors can test the new device with
```
npm run test -- com.example.myawesomedevice
```
and package it for upload to Thingpedia with
```
make com.example.myawesomedevice.zip
```

## License

This package is covered by the Apache 2.0 license. See [LICENSE](LICENSE) for details.
