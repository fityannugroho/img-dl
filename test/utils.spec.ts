import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import ArgumentError from '~/errors/ArgumentError.js';
import {
  generateDownloadUrls,
  isFilePath,
  parseCsvLine,
  parseFileInput,
} from '~/utils.js';
import { TEST_TMP_DIR } from './helpers/paths.js';

const TEST_UTILS_DIR = path.resolve(TEST_TMP_DIR, 'utils');

beforeEach(async () => {
  await fs.promises.rm(TEST_UTILS_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(TEST_UTILS_DIR, { recursive: true });
});

describe('isFilePath', () => {
  it('should return true for existing file', async () => {
    const filePath = path.join(TEST_UTILS_DIR, 'test.txt');
    await fs.promises.writeFile(filePath, 'test content');

    expect(isFilePath(filePath)).toBe(true);
  });

  it('should return false for non-existing file', () => {
    const filePath = path.join(TEST_UTILS_DIR, 'non-existing.txt');
    expect(isFilePath(filePath)).toBe(false);
  });

  it('should return false for directory', async () => {
    const dirPath = path.join(TEST_UTILS_DIR, 'subdir');
    await fs.promises.mkdir(dirPath);
    expect(isFilePath(dirPath)).toBe(false);
  });
});

describe('parseCsvLine', () => {
  it('should parse simple CSV line', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should parse CSV line with quotes', () => {
    expect(parseCsvLine('"a","b","c"')).toEqual(['a', 'b', 'c']);
  });

  it('should parse CSV line with escaped quotes', () => {
    expect(parseCsvLine('"a""b","c"')).toEqual(['a"b', 'c']);
  });

  it('should handle CSV line with commas inside quotes', () => {
    expect(parseCsvLine('"a,b","c"')).toEqual(['a,b', 'c']);
  });

  it('should handle empty fields', () => {
    expect(parseCsvLine('a,,c')).toEqual(['a', '', 'c']);
  });

  it('should handle whitespace around fields', () => {
    expect(parseCsvLine(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });
});

describe('parseFileInput', () => {
  describe('JSON files', () => {
    it('should parse JSON array of URLs', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'urls.json');
      const data = ['http://example.com/1.jpg', 'http://example.com/2.jpg'];
      await fs.promises.writeFile(filePath, JSON.stringify(data));

      const result = parseFileInput(filePath);
      expect(result).toEqual(data);
    });

    it('should parse JSON array of objects', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'objects.json');
      const data = [
        { url: 'http://example.com/1.jpg', name: 'img1' },
        {
          url: 'http://example.com/2.jpg',
          directory: 'images',
          extension: 'png',
        },
      ];
      await fs.promises.writeFile(filePath, JSON.stringify(data));

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        { url: 'http://example.com/1.jpg', name: 'img1' },
        {
          url: 'http://example.com/2.jpg',
          directory: 'images',
          extension: 'png',
        },
      ]);
    });

    it('should throw error for non-array JSON', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'invalid.json');
      await fs.promises.writeFile(filePath, JSON.stringify({ url: 'test' }));

      expect(() => parseFileInput(filePath)).toThrow(ArgumentError);
    });

    it('should throw error for invalid JSON item format', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'invalid-item.json');
      const data = [{ notUrl: 'test' }];
      await fs.promises.writeFile(filePath, JSON.stringify(data));

      expect(() => parseFileInput(filePath)).toThrow(ArgumentError);
    });
  });

  describe('CSV files', () => {
    it('should parse CSV with header', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'with-header.csv');
      const csv = [
        'url,name,extension',
        'http://example.com/1.jpg,img1,png',
        'http://example.com/2.jpg,img2,',
      ].join('\n');
      await fs.promises.writeFile(filePath, csv);

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        { url: 'http://example.com/1.jpg', name: 'img1', extension: 'png' },
        { url: 'http://example.com/2.jpg', name: 'img2' },
      ]);
    });

    it('should parse CSV without header (URLs only)', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'no-header.csv');
      const csv = ['http://example.com/1.jpg', 'http://example.com/2.jpg'].join(
        '\n',
      );
      await fs.promises.writeFile(filePath, csv);

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        'http://example.com/1.jpg',
        'http://example.com/2.jpg',
      ]);
    });

    it('should handle empty CSV file', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'empty.csv');
      await fs.promises.writeFile(filePath, '');

      const result = parseFileInput(filePath);
      expect(result).toEqual([]);
    });

    it('should skip rows with empty URL', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'skip-empty.csv');
      const csv = [
        'url,name',
        'http://example.com/1.jpg,img1',
        ',img2',
        'http://example.com/3.jpg,img3',
      ].join('\n');
      await fs.promises.writeFile(filePath, csv);

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        { url: 'http://example.com/1.jpg', name: 'img1' },
        { url: 'http://example.com/3.jpg', name: 'img3' },
      ]);
    });

    it('should handle CSV with column index -1 (missing columns)', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'missing-cols.csv');
      const csv = [
        'url', // only url column, no directory/name/extension
        'http://example.com/1.jpg',
        'http://example.com/2.jpg',
      ].join('\n');
      await fs.promises.writeFile(filePath, csv);

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        { url: 'http://example.com/1.jpg' },
        { url: 'http://example.com/2.jpg' },
      ]);
    });
  });

  describe('TXT files', () => {
    it('should parse TXT file with URLs per line', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'urls.txt');
      const txt = [
        'http://example.com/1.jpg',
        'http://example.com/2.jpg',
        '', // empty line should be filtered
      ].join('\n');
      await fs.promises.writeFile(filePath, txt);

      const result = parseFileInput(filePath);
      expect(result).toEqual([
        'http://example.com/1.jpg',
        'http://example.com/2.jpg',
      ]);
    });

    it('should handle empty TXT file', async () => {
      const filePath = path.join(TEST_UTILS_DIR, 'empty.txt');
      await fs.promises.writeFile(filePath, '');

      const result = parseFileInput(filePath);
      expect(result).toEqual([]);
    });
  });

  it('should throw error for unsupported file type', async () => {
    const filePath = path.join(TEST_UTILS_DIR, 'test.xml');
    await fs.promises.writeFile(filePath, '<xml></xml>');

    expect(() => parseFileInput(filePath)).toThrow(ArgumentError);
  });
});

describe('generateDownloadUrls', () => {
  it('should return the same URLs if increment flag is not set', () => {
    const urls = ['http://example.com/1.jpg', 'http://example.com/2.jpg'];
    const flags = {};

    expect(generateDownloadUrls(urls, flags)).toEqual(urls);
  });

  it('should throw error if multiple URLs are provided in increment mode', () => {
    const urls = ['http://example.com/1.jpg', 'http://example.com/2.jpg'];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('should throw error if URL does not contain {i} placeholder', () => {
    const urls = ['http://example.com/image.jpg'];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('should throw error if start is less than 0', () => {
    const urls = ['http://example.com/image{i}.jpg'];
    const flags = { increment: true, start: -1 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('should throw error if start is greater than end', () => {
    const urls = ['http://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 5, end: 3 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('should generate URLs correctly with increment mode', () => {
    const urls = ['http://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 1, end: 3 };

    expect(generateDownloadUrls(urls, flags)).toEqual([
      'http://example.com/image1.jpg',
      'http://example.com/image2.jpg',
      'http://example.com/image3.jpg',
    ]);
  });

  it('should use default start (0) when not specified', () => {
    const urls = ['http://example.com/image{i}.jpg'];
    const flags = { increment: true, end: 2 };

    expect(generateDownloadUrls(urls, flags)).toEqual([
      'http://example.com/image0.jpg',
      'http://example.com/image1.jpg',
      'http://example.com/image2.jpg',
    ]);
  });
});
