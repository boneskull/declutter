#!/usr/bin/env node
'use strict';

var declutter = require('..');
var yargs = require('yargs');
var _ = require('lodash');
var Promise = require('bluebird');

var dirs = [];
var argv = _.pick(yargs.usage('$0 [options] [...directory]').option('dry-run', {
  describe: 'Don\'t actually do anything (implies --verbose)',
  boolean: true,
  'default': false
}).option('debug', {
  describe: 'Lots of output',
  boolean: true,
  'default': false
}).version(function () {
  return declutter.version;
}).help('help').alias('help', 'h').showHelpOnFail(true).check(function (args) {
  dirs.push.apply(dirs, args._.length ? args._ : [process.cwd()]);
  args.debug = args.debug || Boolean(args.dryRun);
  return true;
}).argv, function (value, key) {
  return key.length > 1;
});

Promise.each(dirs, function (dir) {
  return declutter(dir, argv);
});
//# sourceMappingURL=declutter.js.map
