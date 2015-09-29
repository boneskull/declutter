#!/usr/bin/env node

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _2 = require('..');

var _3 = _interopRequireDefault(_2);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _packageJson = require('../package.json');

var _packageJson2 = _interopRequireDefault(_packageJson);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var argv = _yargs2['default'].usage('$0 [options] <directory> [...directory]').option('dry-run', {
  describe: 'Don\'t actually do anything',
  boolean: true,
  'default': false
}).option('verbose', {
  describe: 'More output',
  boolean: true,
  'default': false
}).option('debug', {
  describe: 'Even more output',
  boolean: true,
  'default': false
}).version(function () {
  return _packageJson2['default'].version;
}).help('help').alias('help', 'h').showHelpOnFail(true).check(function (args) {
  args._[0] = args._[0] || process.cwd();
  return true;
}).argv;

_bluebird2['default'].each(argv._, function (dir) {
  return (0, _3['default'])(dir, _lodash2['default'].pick(argv, function (value, key) {
    return key.length > 1;
  }));
});
//# sourceMappingURL=declutter.js.map
