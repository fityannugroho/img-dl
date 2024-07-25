import ArgumentError from './errors/ArgumentError.js';

type IncrementFlags = {
  increment?: boolean;
  start?: number;
  end?: number;
  name?: string;
};

/**
 * Generate a list of URLs to be downloaded based on the flags.
 * @throws {ArgumentError} If the urls or flags are invalid.
 */
export function generateDownloadUrls(
  urls: string[],
  flags: IncrementFlags,
): string[] {
  if (!flags.increment) {
    return urls;
  }

  if (urls.length !== 1) {
    throw new ArgumentError('Only one URL is allowed in increment mode');
  }

  if (!urls[0].includes('{i}')) {
    throw new ArgumentError(
      'The URL must contain {i} placeholder for the index',
    );
  }

  const { start = 0, end = 0 } = flags;

  if (start < 0) {
    throw new ArgumentError('Start value must be greater than or equal to 0');
  }

  if (start > end) {
    throw new ArgumentError(
      'Start value must be less than or equal to end value',
    );
  }

  const downloadUrls: string[] = [];

  for (let i = start; i <= end; i += 1) {
    downloadUrls.push(urls[0].replace('{i}', i.toString()));
  }

  return downloadUrls;
}
