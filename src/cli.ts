#!/usr/bin/env node

import meow from 'meow';
import imgdl from './index.js';

const cli = meow(`
  USAGE
    $ imgdl <url> [OPTIONS]

  OPTIONS
    -d, --dir=<path>          The output directory. Default: current working directory
    -e, --ext=<ext>           The file extension. Default: original extension or .jpg
    -h, --help                Show this help message
    -n, --name=<filename>     The filename. Default: original filename or timestamp
        --silent              Disable logging
    -v, --version             Show the version number

  EXAMPLES
    $ imgdl https://example.com/image.jpg
    $ imgdl https://example.com/image.jpg --dir=images --name=example
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=.png
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=.png --silent
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
  const [url] = cli.input;
  const { flags } = cli;

  if (!url) {
    cli.showHelp();
  }

  await imgdl(url, {
    destination: flags.dir,
    filename: flags.name,
    extension: flags.ext,
  });

  if (!flags.silent) {
    console.log('\nImage downloaded successfully');
  }
}

main().catch((error: Error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
