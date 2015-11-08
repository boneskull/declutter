# declutter [![Build Status](https://travis-ci.org/boneskull/declutter.svg?branch=master)](https://travis-ci.org/boneskull/declutter)

> Automatically sort files into directories 

**Probably not usable until v0.1.0.**

## Synopsis

Categorizes files by type (archive, image, audio, document, etc.) and moves them into destination directories.

Configurable via a `.declutter.yml` placed in the directory to declutter.  Globs supported.  Theoretically, you can configure it to move files *outside* of the directory, and not just into subdirs.

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

```yaml
glob: destination
```

Example:

```yaml
'*.torrent': torrent
```

Any globs here will override the default settings, which are pulled from a swath of `foo-extension` modules on npm.

## Development

1.  `git clone` this repo.
2.  Navigate to working copy and execute `npm install`.
3.  Execute `npm run build`, which runs the source through [babel](https://babeljs.io).
4.  (Optional) execute `npm link`.

## License

© 2015 [Christopher Hiller](https://boneskull.com).  Licensed MIT.
