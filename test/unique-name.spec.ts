import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstFreeIndex, numberedName } from '~/unique-name.js';
import { TEST_TMP_DIR } from './helpers/paths.js';

describe('firstFreeIndex', () => {
  it('returns 0 when the plain name is free', () => {
    expect(firstFreeIndex(TEST_TMP_DIR, 'x', 'jpg')).toBe(0);
  });

  it('skips existing files and returns the first free index', () => {
    fs.writeFileSync(path.join(TEST_TMP_DIR, 'x.jpg'), '');
    fs.writeFileSync(path.join(TEST_TMP_DIR, 'x (1).jpg'), '');

    expect(firstFreeIndex(TEST_TMP_DIR, 'x', 'jpg')).toBe(2);
  });
});

describe('numberedName', () => {
  it('keeps the plain name for index 0', () => {
    expect(numberedName('x', 0)).toBe('x');
  });

  it('appends a numeric suffix for index greater than 0', () => {
    expect(numberedName('x', 3)).toBe('x (3)');
  });
});