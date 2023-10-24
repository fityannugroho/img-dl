#!/usr/bin/env node

import meow from 'meow';
import imgdl from './index.js';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';

const cli = meow(`
  USAGE
    $ imgdl <url> <url2> ... [OPTIONS]

  OPTIONS
    -d, --dir=<path>          The output directory. Default: current working directory
    -e, --ext=<ext>           The file extension. Default: original extension or jpg
    -h, --help                Show this help message
    -n, --name=<filename>     The filename. Default: original filename or timestamp
        --silent              Disable logging
    -v, --version             Show the version number

  EXAMPLES
    $ imgdl https://example.com/image.jpg
    $ imgdl https://example.com/image.jpg --dir=images --name=example
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png --silent
    $ imgdl https://example.com/image.jpg https://example.com/image2.webp --dir=images
`, {
  importMeta: import.meta,
  description: 'Download an image from a URL',
  booleanDefault: undefined,
  flags: {
    dir: {
      shortFlag: 'd',
      type: 'string',
    },
    ext: {
      shortFlag: 'e',
      type: 'string',
    },
    name: {
      shortFlag: 'n',
      type: 'string',
    },
    silent: {
      type: 'boolean',
    },
  },
});

async function main() {
  const urls = cli.input;
  const { flags } = cli;

  if (!urls.length) {
    cli.showHelp();
  }

  await imgdl(urls.length === 1 ? urls[0] : urls, {
    directory: flags.dir,
    name: flags.name,
    extension: flags.ext,
    onError: (error) => {
      if (error instanceof ArgumentError || error instanceof DirectoryError) {
        throw error;
      }
    },
  });

  if (!flags.silent) {
    console.log('\nDone!');
  }
}

main().catch((error: Error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
