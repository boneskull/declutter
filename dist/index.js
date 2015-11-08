'use strict';

var _ = require('lodash');
var pkg = require('../package.json');
var threeD = require('3d-extensions');
var archive = require('archive-extensions');
var compressed = require('compressed-extensions');
var audio = require('audio-extensions');
var image = require('image-extensions');
var video = require('video-extensions');
var text = require('text-extensions');
var subtitle = require('subtitle-extensions');
var path = require('path');
var isGlob = require('is-glob');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('graceful-fs'));
var _debug = require('debug');
var glob = Promise.promisify(require('glob'));
var mv = Promise.promisify(require('mv'));
var mkdirp = Promise.promisify(require('mkdirp'));
var yaml = require('js-yaml');
var stringify = _.partialRight(require('stringify-object'), {
  indent: '  ',
  singleQuotes: false
});

var configFile = '.declutter.yml';

var exts = _({
  '3d': threeD,
  archive: _(archive).concat(compressed).unique().concat(['pkg', 'bin']).value(),
  audio: audio,
  image: image,
  video: video,
  text: text,
  subtitle: subtitle,
  document: ['pdf', 'doc', 'rtf', 'xls', 'xlsx', 'docx', 'ppt', 'pptx'],
  application: ['exe', 'app'],
  font: ['ttf', 'woff']
}).mapValues(function (value) {
  return _.map(value, function (extension) {
    return extension.replace('.', '');
  });
}).sort().value();

var allExts = _(exts).map(function (extensions, dest) {
  return _.map(extensions, function (extension) {
    return [extension, dest];
  });
}).flatten().object().sort().value();

var defaultDestinations = {
  '3d': '3d',
  document: 'document',
  archive: 'archive',
  image: 'image',
  video: 'video',
  subs: 'subtitle',
  text: 'text',
  audio: 'audio',
  application: 'application',
  font: 'font'
};

function extname(filename) {
  return path.extname(filename).substring(1).toLowerCase();
}

function declutter(directory, opts) {
  _.defaults(opts, {
    dryRun: false,
    debug: false
  });

  if (opts.debug) {
    _debug.enable(pkg.name);
  }

  var debug = _debug(pkg.name);
  var configpath = path.join(directory, '.declutter.yml');
  var createdDirs = new Set();
  var totalFiles = 0;

  debug(directory + ': Decluttering ' + (opts.dryRun && '(DRY RUN)') + '...');

  return fs.readFileAsync(configpath, 'utf8').then(function (cfg) {
    return _.defaults(defaultDestinations, yaml.safeLoad(cfg));
  }).catch(function () {
    debug(directory + ': No config in ' + configpath + '; using defaults');
    return defaultDestinations;
  }).then(function (destinations) {
    debug(directory + ': Pattern/subdir mapping:\n' + ('' + stringify(destinations)));
    var globs = _(destinations).pick(function (dest, pattern) {
      return isGlob(pattern);
    }).mapKeys(function (dest, pattern) {
      return path.join(directory, pattern);
    }).mapValues(function (dest) {
      return path.join(directory, dest);
    }).value();
    return Promise.map(_.keys(globs), function (globspec) {
      var globdest = globs[globspec];
      debug(directory + ': Searching for ' + globspec);
      return glob(globspec).tap(function (globpaths) {
        debug(directory + ': ' + globpaths.length + ' files matching ' + ('"' + globspec + '"'));
      }).then(function (globpaths) {
        if (!opts.dryRun && globpaths.length && !createdDirs.has(globdest)) {
          debug(directory + ': +' + globdest + '/');
          return mkdirp(globdest).return(globpaths);
        }
        return globpaths;
      }).tap(function (globpaths) {
        if (globpaths.length) {
          createdDirs.add(globdest);
        }
      }).each(function (globpath) {
        var destGlobpath = path.join(globdest, path.basename(globpath));
        debug(globpath + ' => ' + destGlobpath);
        if (!opts.dryRun) {
          return mv(globpath, destGlobpath);
        }
      }).then(function (globpaths) {
        totalFiles += globpaths.length;
      });
    }).then(function () {
      return fs.readdirAsync(directory);
    }).tap(function (filenames) {
      debug(directory + ': ' + filenames.length + ' files pre-filtering');
    }).map(function (filename) {
      return path.join(directory, filename);
    }).filter(function (filepath) {
      return fs.statAsync(filepath).then(function (stat) {
        return !stat.isDirectory();
      }).catch(function (err) {
        debug(directory + ': Warning: ' + err);
        return false;
      });
    }).tap(function (filepaths) {
      debug(directory + ': ' + filepaths.length + ' non-directories found');
    }).filter(function (filepath) {
      return fs.lstatAsync(filepath).then(function (stat) {
        return !stat.isSymbolicLink() && path.basename(filepath) !== configFile;
      }).catch(function (err) {
        debug(directory + ': Warning: ' + err);
        return false;
      });
    }).tap(function (filepaths) {
      debug(directory + ': ' + filepaths.length + ' non-symbolic links and ' + 'config files found');
    }).filter(function (filepath) {
      return Boolean(allExts[extname(filepath)]);
    }).tap(function (filepaths) {
      debug(directory + ': ' + filepaths.length + ' files matching known ' + 'extensions to be moved');
    }).each(function (filepath) {
      var ext = extname(filepath);
      var dirname = destinations[allExts[ext]];
      var dest = path.join(directory, dirname);
      var filename = path.basename(filepath);
      var destFilepath = path.join(dest, filename);
      var relativeSrc = path.relative(directory, filepath);
      var relativeDest = path.relative(directory, destFilepath);
      debug(directory + ': ' + relativeSrc + ' => ' + relativeDest);
      if (!createdDirs.has(dest)) {
        debug(directory + ': +' + dirname + '/');
        if (!opts.dryRun) {
          return mkdirp(dest).then(function () {
            createdDirs.add(dest);
            return mv(filepath, destFilepath);
          });
        }
        createdDirs.add(dest);
      }
      if (!opts.dryRun) {
        return mv(filepath, destFilepath);
      }
    }).then(function (filepaths) {
      totalFiles += filepaths.length;
      debug(directory + ': Files moved: ' + totalFiles);
      debug(directory + ': Subdirs created: ' + createdDirs.size);
    });
  }).catch(function (err) {
    debug('Error: ' + err);
  });
}

declutter.version = pkg.version;

module.exports = declutter;
//# sourceMappingURL=index.js.map
