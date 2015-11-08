'use strict';

const _ = require('lodash');
const pkg = require('../package.json');
const threeD = require('3d-extensions');
const archive = require('archive-extensions');
const compressed = require('compressed-extensions');
const audio = require('audio-extensions');
const image = require('image-extensions');
const video = require('video-extensions');
const text = require('text-extensions');
const subtitle = require('subtitle-extensions');
const path = require('path');
const isGlob = require('is-glob');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('graceful-fs'));
const _debug = require('debug');
const glob = Promise.promisify(require('glob'));
const mv = Promise.promisify(require('mv'));
const mkdirp = Promise.promisify(require('mkdirp'));
const yaml = require('js-yaml');
const stringify = _.partialRight(require('stringify-object'), {
  indent: '  ',
  singleQuotes: false
});

const configFile = '.declutter.yml';

const exts = _({
  '3d': threeD,
  archive: _(archive)
    .concat(compressed)
    .unique()
    .concat(['pkg', 'bin'])
    .value(),
  audio: audio,
  image: image,
  video: video,
  text: text,
  subtitle: subtitle,
  document: [
    'pdf',
    'doc',
    'rtf',
    'xls',
    'xlsx',
    'docx',
    'ppt',
    'pptx'
  ],
  application: [
    'exe',
    'app'
  ],
  font: [
    'ttf',
    'woff'
  ]
})
  .mapValues(value => _.map(value, extension => extension.replace('.', '')))
  .sort()
  .value();

const allExts = _(exts)
  .map((extensions, dest) => _.map(extensions, extension => [extension, dest]))
  .flatten()
  .object()
  .sort()
  .value();

const defaultDestinations = {
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
  opts = _.defaults(opts || {}, {
    dryRun: false,
    debug: false
  });

  if (opts.debug) {
    _debug.enable(pkg.name);
  }

  const debug = _debug(pkg.name);
  const configpath = path.join(directory, '.declutter.yml');
  const createdDirs = new Set();
  let totalFiles = 0;

  debug(`${directory}: Decluttering ${opts.dryRun && '(DRY RUN)'}...`);

  return fs.readFileAsync(configpath, 'utf8')
    .then(cfg => _.defaults(defaultDestinations, yaml.safeLoad(cfg)))
    .catch(() => {
      debug(`${directory}: No config in ${configpath}; using defaults`);
      return defaultDestinations;
    })
    .then(destinations => {
      debug(`${directory}: Pattern/subdir mapping:\n` +
        `${stringify(destinations)}`);
      const globs = _(destinations)
        .pick((dest, pattern) => isGlob(pattern))
        .mapKeys((dest, pattern) => path.join(directory, pattern))
        .mapValues(dest => path.join(directory, dest))
        .value();
      return Promise.map(_.keys(globs), globspec => {
          const globdest = globs[globspec];
          debug(`${directory}: Searching for ${globspec}`);
          return glob(globspec)
            .tap(globpaths => {
              debug(`${directory}: ${globpaths.length} files matching ` +
                `"${globspec}"`);
            })
            .then(globpaths => {
              if (!opts.dryRun &&
                globpaths.length && !createdDirs.has(globdest)) {
                debug(`${directory}: +${globdest}/`);
                return mkdirp(globdest)
                  .return(globpaths);
              }
              return globpaths;
            })
            .tap(globpaths => {
              if (globpaths.length) {
                createdDirs.add(globdest);
              }
            })
            .each(globpath => {
              const destGlobpath = path.join(globdest, path.basename(globpath));
              debug(`${globpath} => ${destGlobpath}`);
              if (!opts.dryRun) {
                return mv(globpath, destGlobpath);
              }
            })
            .then(globpaths => {
              totalFiles += globpaths.length;
            });
        })
        .then(() => fs.readdirAsync(directory))
        .tap(filenames => {
          debug(`${directory}: ${filenames.length} files pre-filtering`);
        })
        .map(filename => path.join(directory, filename))
        .filter(filepath => fs.statAsync(filepath)
          .then(stat => !stat.isDirectory())
          .catch(err => {
            debug(`${directory}: Warning: ${err}`);
            return false;
          }))
        .tap(filepaths => {
          debug(`${directory}: ${filepaths.length} non-directories found`);
        })
        .filter(filepath => fs.lstatAsync(filepath)
          .then(stat => !stat.isSymbolicLink() &&
          path.basename(filepath) !== configFile)
          .catch(err => {
            debug(`${directory}: Warning: ${err}`);
            return false;
          }))
        .tap(filepaths => {
          debug(`${directory}: ${filepaths.length} non-symbolic links and ` +
            `config files found`);
        })
        .filter(filepath => Boolean(allExts[extname(filepath)]))
        .tap(filepaths => {
          debug(`${directory}: ${filepaths.length} files matching known ` +
            `extensions to be moved`);
        })
        .each(filepath => {
          const ext = extname(filepath);
          const dirname = destinations[allExts[ext]];
          const dest = path.join(directory, dirname);
          const filename = path.basename(filepath);
          const destFilepath = path.join(dest, filename);
          const relativeSrc = path.relative(directory, filepath);
          const relativeDest = path.relative(directory, destFilepath);
          debug(`${directory}: ${relativeSrc} => ${relativeDest}`);
          if (!createdDirs.has(dest)) {
            debug(`${directory}: +${dirname}/`);
            if (!opts.dryRun) {
              return mkdirp(dest)
                .then(() => {
                  createdDirs.add(dest);
                  return mv(filepath, destFilepath);
                });
            }
            createdDirs.add(dest);
          }
          if (!opts.dryRun) {
            return mv(filepath, destFilepath);
          }
        })
        .then(filepaths => {
          totalFiles += filepaths.length;
          debug(`${directory}: Files moved: ${totalFiles}`);
          debug(`${directory}: Subdirs created: ${createdDirs.size}`);
        });
    })
    .catch(err => {
      debug(`Error: ${err}`);
    });
}

declutter.version = pkg.version;

module.exports = declutter;
