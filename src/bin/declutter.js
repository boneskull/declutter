#!/usr/bin/env node
'use strict';

const declutter = require('..');
const yargs = require('yargs');
const _ = require('lodash');
const Promise = require('bluebird');

const dirs = [];
const argv = _.pick(yargs
  .usage('$0 [options] [...directory]')
  .option('dry-run', {
    describe: `Don't actually do anything (implies --verbose)`,
    boolean: true,
    'default': false
  })
  .option('debug', {
    describe: 'Lots of output',
    boolean: true,
    'default': false
  })
  .version(() => declutter.version)
  .help('help')
  .alias('help', 'h')
  .showHelpOnFail(true)
  .check(args => {
    dirs.push.apply(dirs, args._.length ? args._ : [process.cwd()]);
    args.debug = args.debug || Boolean(args.dryRun);
    return true;
  })
  .argv, (value, key) => key.length > 1);

Promise.each(dirs, dir => declutter(dir, argv));

