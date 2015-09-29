'use strict';

import _ from 'lodash';
import pkg from '../package.json';
import threeD from '3d-extensions';
import archive from 'archive-extensions';
import compressed from 'compressed-extensions';
import audio from 'audio-extensions';
import image from 'image-extensions';
import video from 'video-extensions';
import text from 'text-extensions';
import subtitle from 'subtitle-extensions';
import path from 'path';
import isGlob from 'is-glob';
import Promise from 'bluebird';
import gracefulFs from 'graceful-fs';
import _debug from 'debug';
import _glob from 'glob';
import _mv from 'mv';
import _mkdirp from 'mkdirp';
import yaml from 'js-yaml';

const glob = Promise.promisify(_glob);
const fs = Promise.promisifyAll(gracefulFs);
const mv = Promise.promisify(_mv);
const mkdirp = Promise.promisify(_mkdirp);

const configFile = '.declutter.yml';

const exts = _({
  '3d': threeD,
  archive: _.unique(archive.concat(compressed)).concat(['pkg', 'bin']),
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
  .mapValues((value) => _.map(value, (extension) => extension.replace('.', '')))
  .sort()
  .value();

const allExts = _(exts)
  .map((extensions, dest) => _.map(extensions,
    (extension) => [extension, dest]))
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

export default function declutter(directory, opts) {
  function verbose() {
    if (opts.debug || opts.verbose) {
      console.log.apply(console, arguments);
    }
  }

  console.log(`Decluttering ${directory}...`);

  _.defaults(opts, {
    dryRun: false,
    verbose: false,
    debug: false
  });

  if (opts.debug) {
    _debug.enable(pkg.name);
  }

  const debug = _debug(pkg.name);
  const configpath = path.join(directory, '.declutter.yml');
  const createdDirs = new Set();
  let totalFiles = 0;

  return fs.readFileAsync(configpath, 'utf8')
    .then((cfg) => _.defaults(defaultDestinations, yaml.safeLoad(cfg)))
    .catch(() => {
      verbose(`Failed to read config file ${configpath}`);
      return defaultDestinations;
    })
    .then((destinations) => {
      debug('Pattern/destination mapping:', destinations);
      const globs = _(destinations)
        .pick((dest, pattern) => isGlob(pattern))
        .mapKeys((dest, pattern) => path.join(directory, pattern))
        .mapValues((dest) => path.join(directory, dest))
        .value();
      return Promise.map(_.keys(globs), (globspec) => {
        const globdest = globs[globspec];
        debug(`Finding ${globspec}`);
        return glob(globspec)
          .tap((globpaths) => {
            console.log(`Found ${globpaths.length} files matching ` +
              `"${globspec}"`);
          })
          .then((globpaths) => {
            if (!opts.dryRun &&
              globpaths.length && !createdDirs.has(globdest)) {
              debug(`Creating ${globdest}`);
              return mkdirp(globdest)
                .return(globpaths);
            }
            return globpaths;
          })
          .then((globpaths) => {
            if (globpaths.length) {
              createdDirs.add(globdest);
            }
            return globpaths;
          })
          .each((globpath) => {
            const destGlobpath = path.join(globdest, path.basename(globpath));
            debug(`${globpath} => ${destGlobpath}`);
            if (!opts.dryRun) {
              return mv(globpath, destGlobpath);
            }
          })
          .then((globpaths) => {
            totalFiles += globpaths.length;
          });
      })
        .then(() => fs.readdirAsync(directory))
        .tap((filenames) => {
          verbose(`Found ${filenames.length} files remaining in ${directory}`);
        })
        .map((filename) => path.join(directory, filename))
        .filter((filepath) => fs.lstatAsync(filepath)
          .then((stat) => !stat.isSymbolicLink() &&
          path.basename(filepath) !==
          configFile)
          .catch((err) => {
            verbose(err);
            return false;
          }))
        .tap((filepaths) => {
          verbose(`Found ${filepaths.length} files to examine in ${directory}`);
        })
        .filter((filepath) => Boolean(allExts[extname(filepath)]))
        .tap((filepaths) => {
          verbose(`Found ${filepaths.length} files matching known extensions` +
            ` in ${directory}`);
        })
        .each((filepath) => {
          const ext = extname(filepath);
          const dest = path.join(directory, destinations[allExts[ext]]);
          const destFilepath = path.join(dest, path.basename(filepath));
          debug(`${filepath} => ${destFilepath}`);
          if (!createdDirs.has(dest)) {
            if (!opts.dryRun) {
              debug(`Creating ${dest}`);
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
        .then((filepaths) => {
          totalFiles += filepaths.length;
          if (opts.dryRun) {
            console.log(`DRY RUN`);
          }

          console.log(`Total files moved: ${totalFiles}`);
          console.log(`Total directories created: ${createdDirs.size}`);
        });
    })
    .catch((err) => {
      console.log(err);
    });
}

