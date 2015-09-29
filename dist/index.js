'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = declutter;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _packageJson = require('../package.json');

var _packageJson2 = _interopRequireDefault(_packageJson);

var _dExtensions = require('3d-extensions');

var _dExtensions2 = _interopRequireDefault(_dExtensions);

var _archiveExtensions = require('archive-extensions');

var _archiveExtensions2 = _interopRequireDefault(_archiveExtensions);

var _compressedExtensions = require('compressed-extensions');

var _compressedExtensions2 = _interopRequireDefault(_compressedExtensions);

var _audioExtensions = require('audio-extensions');

var _audioExtensions2 = _interopRequireDefault(_audioExtensions);

var _imageExtensions = require('image-extensions');

var _imageExtensions2 = _interopRequireDefault(_imageExtensions);

var _videoExtensions = require('video-extensions');

var _videoExtensions2 = _interopRequireDefault(_videoExtensions);

var _textExtensions = require('text-extensions');

var _textExtensions2 = _interopRequireDefault(_textExtensions);

var _subtitleExtensions = require('subtitle-extensions');

var _subtitleExtensions2 = _interopRequireDefault(_subtitleExtensions);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _isGlob = require('is-glob');

var _isGlob2 = _interopRequireDefault(_isGlob);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _gracefulFs = require('graceful-fs');

var _gracefulFs2 = _interopRequireDefault(_gracefulFs);

var _debug2 = require('debug');

var _debug3 = _interopRequireDefault(_debug2);

var _glob2 = require('glob');

var _glob3 = _interopRequireDefault(_glob2);

var _mv2 = require('mv');

var _mv3 = _interopRequireDefault(_mv2);

var _mkdirp2 = require('mkdirp');

var _mkdirp3 = _interopRequireDefault(_mkdirp2);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var glob = _bluebird2['default'].promisify(_glob3['default']);
var fs = _bluebird2['default'].promisifyAll(_gracefulFs2['default']);
var mv = _bluebird2['default'].promisify(_mv3['default']);
var mkdirp = _bluebird2['default'].promisify(_mkdirp3['default']);

var configFile = '.declutter.yml';

var exts = (0, _lodash2['default'])({
  '3d': _dExtensions2['default'],
  archive: _lodash2['default'].unique(_archiveExtensions2['default'].concat(_compressedExtensions2['default'])).concat(['pkg', 'bin']),
  audio: _audioExtensions2['default'],
  image: _imageExtensions2['default'],
  video: _videoExtensions2['default'],
  text: _textExtensions2['default'],
  subtitle: _subtitleExtensions2['default'],
  document: ['pdf', 'doc', 'rtf', 'xls', 'xlsx', 'docx', 'ppt', 'pptx'],
  application: ['exe', 'app'],
  font: ['ttf', 'woff']
}).mapValues(function (value) {
  return _lodash2['default'].map(value, function (extension) {
    return extension.replace('.', '');
  });
}).sort().value();

var allExts = (0, _lodash2['default'])(exts).map(function (extensions, dest) {
  return _lodash2['default'].map(extensions, function (extension) {
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
  return _path2['default'].extname(filename).substring(1).toLowerCase();
}

function declutter(directory, opts) {
  function verbose() {
    if (opts.debug || opts.verbose) {
      console.log.apply(console, arguments);
    }
  }

  console.log('Decluttering ' + directory + '...');

  _lodash2['default'].defaults(opts, {
    dryRun: false,
    verbose: false,
    debug: false
  });

  if (opts.debug) {
    _debug3['default'].enable(_packageJson2['default'].name);
  }
  var debug = (0, _debug3['default'])(_packageJson2['default'].name);

  //const globs = _.pick(destinations, (value, key) => isGlob(key));

  //
  //return Promise.map(globs, (globname) => {
  //        return glob(globname);
  //      })
  //        .filter((result) => !_.contains(destinations, result))
  //        .map((result) => path.relative(directory, result))
  //        .then((results) => {
  //          if (_.contains(_.flatten(results), filename)) {
  //
  //          }
  //        })

  var configpath = _path2['default'].join(directory, '.declutter.yml');

  var totalFiles = 0;
  var createdDirs = new Set();

  return fs.readFileAsync(configpath, 'utf8').then(function (cfg) {
    return _lodash2['default'].defaults(defaultDestinations, _jsYaml2['default'].safeLoad(cfg));
  })['catch'](function () {
    verbose('Failed to read config file ' + configpath);
    return defaultDestinations;
  }).then(function (destinations) {
    debug('Pattern/destination mapping:', destinations);
    var globs = (0, _lodash2['default'])(destinations).pick(function (dest, pattern) {
      return (0, _isGlob2['default'])(pattern);
    }).mapKeys(function (dest, pattern) {
      return _path2['default'].join(directory, pattern);
    }).mapValues(function (dest) {
      return _path2['default'].join(directory, dest);
    }).value();
    return _bluebird2['default'].map(_lodash2['default'].keys(globs), function (globspec) {
      var globdest = globs[globspec];
      debug('Finding ' + globspec);
      return glob(globspec).tap(function (globpaths) {
        console.log('Found ' + globpaths.length + ' files matching "' + globspec + '"');
      }).then(function (globpaths) {
        if (!opts.dryRun && globpaths.length && !createdDirs.has(globdest)) {
          debug('Creating ' + globdest);
          return mkdirp(globdest)['return'](globpaths);
        }
        return globpaths;
      }).then(function (globpaths) {
        if (globpaths.length) {
          createdDirs.add(globdest);
        }
        return globpaths;
      }).each(function (globpath) {
        var destGlobpath = _path2['default'].join(globdest, _path2['default'].basename(globpath));
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
      verbose('Found ' + filenames.length + ' files remaining in ' + directory);
    }).map(function (filename) {
      return _path2['default'].join(directory, filename);
    }).filter(function (filepath) {
      return fs.lstatAsync(filepath).then(function (stat) {
        return !stat.isSymbolicLink() && _path2['default'].basename(filepath) !== configFile;
      })['catch'](function (err) {
        verbose(err);
        return false;
      });
    }).tap(function (filepaths) {
      verbose('Found ' + filepaths.length + ' files to examine in ' + directory);
    }).filter(function (filepath) {
      return Boolean(allExts[extname(filepath)]);
    }).tap(function (filepaths) {
      verbose('Found ' + filepaths.length + ' files matching known extensions' + (' in ' + directory));
    }).each(function (filepath) {
      var ext = extname(filepath);
      var dest = _path2['default'].join(directory, destinations[allExts[ext]]);
      var destFilepath = _path2['default'].join(dest, _path2['default'].basename(filepath));
      debug(filepath + ' => ' + destFilepath);
      if (!createdDirs.has(dest)) {
        if (!opts.dryRun) {
          debug('Creating ' + dest);
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
      if (opts.dryRun) {
        console.log('DRY RUN');
      }

      console.log('Total files moved: ' + totalFiles);
      console.log('Total directories created: ' + createdDirs.size);
    });
  })['catch'](function (err) {
    console.log(err);
  });
}

module.exports = exports['default'];
//# sourceMappingURL=index.js.map
