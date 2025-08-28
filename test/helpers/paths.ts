import path from 'node:path';

// Single shared temporary directory for all tests
export const TEST_TMP_DIR = path.resolve('test/.tmp');
