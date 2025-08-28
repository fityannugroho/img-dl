#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import meow from 'meow';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import imgdl, { type Options } from './index.js';
import { generateDownloadUrls } from './utils.js';

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
        --end=<number>        The end index for increment mode. Default: 0
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
  const { flags } = cli;
  const urls = generateDownloadUrls(cli.input, flags);

  if (flags.version) {
    cli.showVersion();
  }

  if (!urls.length) {
    cli.showHelp(0);
  }

  if (!flags.silent) {
    console.log(
      `\n${dimLog('Downloading...')}\n${warningLog('Press Ctrl+C to abort')}`,
    );
  }

  // If user specified a directory that exists but is not a directory (a file),
  // fail fast with DirectoryError so CLI prints a friendly error instead of
  // crashing with an unhandled ENOTDIR during download.
  if (flags.dir) {
    try {
      const stat = fs.statSync(flags.dir);
      if (!stat.isDirectory()) {
        throw new DirectoryError('The provided path is not a directory');
      }
    } catch (err) {
      // If error is that the path does not exist, ignore and let downloader create it.
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // noop
      } else if (err instanceof DirectoryError) {
        throw err;
      } else {
        // Other errors (permission) should be reported as DirectoryError
        throw new DirectoryError((err as Error).message);
      }
    }
  }

  const separator = dimLog('|');
  const bar = new cliProgress.SingleBar({
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
    for (const header of flags.header) {
      const [name, value] = header.split(':').map((part) => part.trim());

      if (!name || !value) {
        throw new ArgumentError('Invalid header format');
      }

      headers[name] = value;
    }
  }

  const abortController = new AbortController();

  process.on('SIGINT', () => {
    bar.stop();
    console.log(dimLog('\nAborting...'));
    abortController.abort();
  });

  try {
    await new Promise<void>((resolve, rejects) => {
      imgdl(urls, {
        directory: flags.dir,
        name: flags.name,
        extension: flags.ext,
        headers,
        interval: flags.interval,
        onSuccess: () => {
          success += 1;
          if (!flags.silent) {
            bar.increment({ success });
          }
        },
        onError: (error, url) => {
          if (
            error instanceof ArgumentError ||
            error instanceof DirectoryError
          ) {
            return rejects(error);
          }

          errorCount += 1;
          if (!flags.silent) {
            bar.increment({ errorCount });
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
      }).then(resolve, rejects);
    });
  } finally {
    if (!flags.silent) {
      bar.stop();
      console.log(dimLog('Done!'));

      if (errorCount) {
        console.log(
          errorLog(
            `${errorCount} image${errorCount > 1 ? 's' : ''} failed to download. See error.log for details.`,
          ),
        );
      }
    }
  }
}

bootstrap().catch((error: Error) => {
  console.error(errorLog(`\n${error.name}: ${error.message}`));
});
