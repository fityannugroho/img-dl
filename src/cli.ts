#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import meow from 'meow';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import imgdl, { type ImageOptions, type Options } from './index.js';
import { generateDownloadUrls, isFilePath, parseFileInput } from './utils.js';

const cli = meow(
  `
  USAGE
    $ imgdl <url/path> ... [OPTIONS]

  PARAMETERS
    url/path  The URL of the image to download or the path to a local file that
              contains a list of images to download.
              Provide multiple URLs to download multiple images.
              In increment mode, the URL must contain {i} placeholder for the index,
              only one URL is allowed, and the 'end' flag is required.
              If path is provided, it must be a valid txt, csv, or json file.

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
    $ imgdl /path/to/list.txt
    $ imgdl /path/to/list.csv
    $ imgdl /path/to/list.json
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

export async function runner(
  input: (string | ({ url: string } & ImageOptions))[],
  flags: typeof cli.flags,
) {
  let sources: (string | ({ url: string } & ImageOptions))[] = [];

  // Single file input support: .json, .csv, .txt
  if (
    input.length === 1 &&
    typeof input[0] === 'string' &&
    isFilePath(input[0])
  ) {
    sources = parseFileInput(input[0]);
  } else if (input.every((i) => typeof i === 'string')) {
    sources = generateDownloadUrls(input as string[], flags);
  } else {
    sources = input;
  }

  if (flags.version) {
    cli.showVersion();
  }

  if (!sources.length) {
    cli.showHelp(0);
  }

  if (!flags.silent) {
    console.log(
      `\n${dimLog('Downloading...')}\n${warningLog('Press Ctrl+C to abort')}`,
    );
  }

  const separator = dimLog('|');
  const bar = new cliProgress.SingleBar({
    format: `{percentage}% [{bar}] {value}/{total} ${separator} ${successLog('✅ {success}')} ${separator} ${errorLog('❌ {errorCount}')} ${separator} ETA: {eta_formatted} ${dimLog('/ {duration_formatted}')}`,
    hideCursor: null,
    barsize: 24,
  });
  let success = 0;
  let errorCount = 0;

  if (!flags.silent && sources.length > 1) {
    bar.start(sources.length, 0, { success, errorCount });
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

  const onSigint = () => {
    bar.stop();
    console.log(dimLog('\nAborting...'));
    abortController.abort();
  };
  process.on('SIGINT', onSigint);

  try {
    await new Promise<void>((resolve, rejects) => {
      imgdl(sources, {
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
    // Always cleanup the SIGINT listener to avoid leaks in repeated invocations (e.g., tests)
    process.off('SIGINT', onSigint);

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

async function bootstrap() {
  const { flags } = cli;
  await runner(cli.input, flags);
}

bootstrap().catch((error: Error) => {
  console.error(errorLog(`\n${error.name}: ${error.message}`));
});
