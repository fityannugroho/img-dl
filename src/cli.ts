#!/usr/bin/env node

import cliProgress from 'cli-progress';
import meow from 'meow';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import imgdl, { Options } from './index.js';

const cli = meow(
  `
  USAGE
    $ imgdl <url> ... [OPTIONS]

  PARAMETERS
    url   The URL of the image to download. Provide multiple URLs to download multiple images.
          In increment mode, the URL must contain {i} placeholder for the index,
          only one URL is allowed, and the 'end' flag is required.

  OPTIONS
    -d, --dir=<path>          The output directory. Default: current working directory
        --end=<number>        The end index. Required in increment mode
    -e, --ext=<ext>           The file extension. Default: original extension or jpg
    -h, --help                Show this help message
    -H, --header=<header>     The header to send with the request. Can be used multiple times
    -i, --increment           Enable increment mode. Default: false
        --interval=<number>   The interval between each batch of requests in milliseconds
    -n, --name=<filename>     The filename. Default: original filename or timestamp
        --max-retry=<number>  Set the maximum number of times to retry the request if it fails
        --silent              Disable logging
        --start=<number>      The start index for increment mode. Default: 0
        --step=<number>       The number of requests to make at the same time. Default: 5
    -t, --timeout=<number>    Set timeout for each request in milliseconds
    -v, --version             Show the version number

  EXAMPLES
    $ imgdl https://example.com/image.jpg
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
    $ imgdl https://example.com/image.jpg --silent
    $ imgdl https://example.com/image.jpg https://example.com/image2.webp
    $ imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10
    $ imgdl https://example.com/image.jpg --header="User-Agent: Mozilla/5.0" --header="Cookie: foo=bar"
`,
  {
    importMeta: import.meta,
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
      header: {
        shortFlag: 'H',
        type: 'string',
        isMultiple: true,
      },
      increment: {
        shortFlag: 'i',
        type: 'boolean',
      },
      interval: {
        type: 'number',
      },
      start: {
        type: 'number',
      },
      end: {
        type: 'number',
      },
      name: {
        shortFlag: 'n',
        type: 'string',
      },
      maxRetry: {
        type: 'number',
      },
      silent: {
        type: 'boolean',
      },
      step: {
        type: 'number',
      },
      timeout: {
        shortFlag: 't',
        type: 'number',
      },
      version: {
        shortFlag: 'v',
        type: 'boolean',
      },
    },
  },
);

const successLog = chalk.bold.green;
const errorLog = chalk.bold.red;
const warningLog = chalk.yellow;
const dimLog = chalk.dim;

async function bootstrap() {
  let urls = cli.input;
  const { flags } = cli;

  if (flags.version) {
    cli.showVersion();
  }

  if (!urls.length) {
    cli.showHelp(0);
  }

  if (flags.increment) {
    if (urls.length > 1) {
      throw new ArgumentError('Only one URL is allowed in increment mode');
    }

    const templateUrl = urls[0];

    if (!templateUrl.includes('{i}')) {
      throw new ArgumentError(
        'The URL must contain {i} placeholder for the index',
      );
    }

    if (!flags.end) {
      throw new ArgumentError('The end index is required in increment mode');
    }

    if (flags.start && flags.start > flags.end) {
      throw new ArgumentError(
        'The start index cannot be greater than the end index',
      );
    }

    const { start = 0, end } = flags;
    urls = [];

    for (let i = start; i <= end; i += 1) {
      urls.push(templateUrl.replace('{i}', i.toString()));
    }
  }

  if (!flags.silent) {
    console.log(
      `\n${dimLog('Downloading...')}\n${warningLog('Press Ctrl+C to abort')}`,
    );
  }

  const separator = dimLog('|');
  const bar = new cliProgress.SingleBar({
    // eslint-disable-next-line max-len
    format: `{percentage}% [{bar}] {value}/{total} ${separator} ${successLog('✅ {success}')} ${separator} ${errorLog('❌ {errorCount}')} ${separator} ETA: {eta_formatted} ${dimLog('/ {duration_formatted}')}`,
    hideCursor: null,
    barsize: 24,
  });
  let success = 0;
  let errorCount = 0;

  if (!flags.silent && urls.length > 1) {
    bar.start(urls.length, 0, { success, errorCount });
  }

  // Validate and convert headers
  const headers: Options['headers'] = {};
  if (flags.header) {
    flags.header.forEach((header) => {
      const [name, value] = header.split(':');

      if (!name || !value) {
        throw new ArgumentError('Invalid header format');
      }

      headers[name.trim()] = value.trim();
    });
  }

  const abortController = new AbortController();

  process.on('SIGINT', () => {
    bar.stop();
    console.log(dimLog('\nAborting...'));
    abortController.abort();
  });

  await imgdl(urls.length === 1 ? urls[0] : urls, {
    directory: flags.dir,
    name: flags.name,
    extension: flags.ext,
    headers,
    interval: flags.interval,
    onSuccess: () => {
      if (!flags.silent) {
        success += 1;
        bar.increment({ success });
      }
    },
    onError: (error, url) => {
      errorCount += 1;
      if (!flags.silent) {
        bar.increment({ errorCount });
      }
      if (error instanceof ArgumentError || error instanceof DirectoryError) {
        throw error;
      }
      fs.appendFileSync(
        path.resolve(flags.dir || process.cwd(), 'error.log'),
        `${new Date().toISOString()} failed download from ${url}, ${error.name}: ${error.message}\n`,
      );
    },
    maxRetry: flags.maxRetry,
    step: flags.step,
    timeout: flags.timeout,
    signal: abortController.signal,
  });

  if (!flags.silent) {
    bar.stop();
    console.log(dimLog('Done!'));

    if (errorCount) {
      console.log(
        errorLog(
          `${errorCount} image${errorCount > 1 ? 's' : ''} failed to download. See ./error.log for details.`,
        ),
      );
    }
  }
}

bootstrap().catch((error: Error) => {
  console.error(errorLog(`\n${error.name}: ${error.message}`));
  process.exit(1);
});
