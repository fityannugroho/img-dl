import fs from 'node:fs';
import path from 'node:path';
import type { ImageOptions } from 'dist/index.js';
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

export function isFilePath(p: string) {
  try {
    const stat = fs.statSync(path.resolve(p));
    return stat.isFile();
  } catch {
    return false;
  }
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((v) => v.replace(/^"|"$/g, ''));
}

export function parseFileInput(
  filePath: string,
): (string | ({ url: string } & ImageOptions))[] {
  const fullPath = path.resolve(filePath);
  const ext = path.extname(fullPath).toLowerCase();
  const content = fs.readFileSync(fullPath, 'utf8');

  if (ext === '.json') {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new ArgumentError('JSON file must contain an array');
    }

    return data.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof item.url === 'string') {
        const { url, directory, name, extension } = item as {
          url: string;
          directory?: string;
          name?: string;
          extension?: string;
        };
        const obj: { url: string } & ImageOptions = { url };
        if (directory) obj.directory = directory;
        if (name) obj.name = name;
        if (extension) obj.extension = extension;
        return obj;
      }
      throw new ArgumentError('Invalid JSON item format');
    });
  }

  if (ext === '.csv') {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const first = parseCsvLine(lines[0]);
    const lower = first.map((h) => h.toLowerCase());
    const hasHeader = lower.includes('url');

    if (hasHeader) {
      const colIndex = {
        url: lower.indexOf('url'),
        directory: lower.indexOf('directory'),
        name: lower.indexOf('name'),
        extension: lower.indexOf('extension'),
      };
      const rows = lines.slice(1);
      const items: ({ url: string } & ImageOptions)[] = [];
      for (const row of rows) {
        const cols = parseCsvLine(row);
        const url = cols[colIndex.url]?.trim();
        if (!url) continue;
        const entry: { url: string } & ImageOptions = { url };
        const directory =
          colIndex.directory >= 0
            ? cols[colIndex.directory]?.trim()
            : undefined;
        const name =
          colIndex.name >= 0 ? cols[colIndex.name]?.trim() : undefined;
        const extension =
          colIndex.extension >= 0
            ? cols[colIndex.extension]?.trim()
            : undefined;
        if (directory) entry.directory = directory;
        if (name) entry.name = name;
        if (extension) entry.extension = extension;
        items.push(entry);
      }
      return items;
    }

    // No header: treat as first column URLs
    return lines
      .map(parseCsvLine)
      .map((cols) => cols[0]?.trim())
      .filter((u): u is string => Boolean(u));
  }

  if (ext === '.txt') {
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  throw new ArgumentError('Unsupported file type');
}
