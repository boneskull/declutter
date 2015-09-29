#!/usr/bin/env node
'use strict';

import declutter from '..';
import yargs from 'yargs';
import pkg from '../package.json';
import _ from 'lodash';
import Promise from 'bluebird';

const argv = yargs
  .usage('$0 [options] <directory> [...directory]')
  .option('dry-run', {
    describe: `Don't actually do anything`,
    boolean: true,
    'default': false
  })
  .option('verbose', {
    describe: 'More output',
    boolean: true,
    'default': false
  })
  .option('debug', {
    describe: 'Even more output',
    boolean: true,
    'default': false
  })
  .version(() => pkg.version)
  .help('help')
  .alias('help', 'h')
  .showHelpOnFail(true)
  .check((args) => {
    args._[0] = args._[0] || process.cwd();
    return true;
  })
  .argv;

Promise.each(argv._,
  (dir) => declutter(dir, _.pick(argv, (value, key) => key.length > 1)));

