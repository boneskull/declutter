# declutter [![Build Status](https://travis-ci.org/boneskull/declutter.svg?branch=master)](https://travis-ci.org/boneskull/declutter)

> Automatically sort files into directories 

**Probably not usable until v0.1.0.**

## Synopsis

Categorizes files by type (archive, image, audio, document, etc.) and moves them into destination directories.

Globs supported.  Theoretically, you can configure it to move files *outside* of the directory, and not just into subdirs.

I wrote this because I have way too much crap in my `Downloads` folder.  

## Install

```shell
$ npm install -g declutter
```

## Usage

```
declutter [options] <directory> [...directory]

Options:
  --dry-run   Don't actually do anything              [boolean] [default: false]
  --verbose   More output                             [boolean] [default: false]
  --debug     Even more output                        [boolean] [default: false]
  --version   Show version number                                      [boolean]
  --help, -h  Show help                                                [boolean]
```

## API

`declutter` exports a single function which accepts two parameters; the first is the directory to operate on, and the second is an options object corresponding to the CLI's flags.

## Config File Syntax

To configure declutter, you want to create a `.declutter` file in the directory you want decluttered.  This is a [YAML](https://en.wikipedia.org/wiki/Yaml) file, FWIW.

The pattern is this; one on each line:

```yaml
glob: destination
```

Example:

```yaml
'*.torrent': torrent
'*.coffee': ~/.Trash
```

This will move all BitTorrent (`*.torrent`) into the `torrent/` subdir, and all CoffeeScript (`*.coffee`) files into the Trash (OS X).  :wink:

Any globs here *will override the default settings*, which are pulled from a swath of `foo-extension` modules on npm.

### Defaults

Extensions are sorted into categories; each category corresponds to a subdirectory.

- 3D graphics: `3d/`
- Documents: `document/`
- Archives, installers, disk images: `archive/`
- Images: `image/`
- Audio: `audio/`
- Text: `text/`
- Apps: `application/`
- Fonts: `font/`
- Video: `video/`
- Subtitles: `subs/`

> TODO: Compile a list of source code file extensions; publish this as a module & use it to create a "code" category.

## Development

1.  `git clone` this repo.
2.  Navigate to working copy and execute `npm install`.
3.  Execute `npm run build`, which runs the source through [babel](https://babeljs.io).
4.  (Optional) execute `npm link`.

## License

© 2015 [Christopher Hiller](https://boneskull.com).  Licensed MIT.
