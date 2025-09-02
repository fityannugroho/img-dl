import path from 'node:path';

// Single shared temporary directory for all tests
export const TEST_TMP_DIR = path.resolve('test', '.tmp');

// A directory path that is expected to be non-writable for normal users
// on each supported OS. Used to assert DirectoryError behavior reliably.
export const UNWRITABLE_DIR =
  process.platform === 'win32'
    ? path.join('C:', 'Windows', 'System32')
    : path.join('/', 'root');

// A directory path that is guaranteed to fail creation on each OS
export const UNCREATABLE_DIR =
  process.platform === 'win32'
    ? path.join('C:', 'invalid*dir')
    : path.join('/', 'root', '__imgdl_uncreatable__');

// A path that should fail even with elevated permissions
export const TRULY_UNWRITABLE_DIR =
  process.platform === 'win32'
    ? path.join(
        'C:',
        'Windows',
        'System32',
        'drivers',
        'etc',
        'non-existent-subdir',
        'image.jpg',
      )
    : path.join('/', 'dev', 'null', 'subdir');
