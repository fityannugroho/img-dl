import { readdirSync, unlinkSync } from 'node:fs';
import { server } from './test/fixture/mocks/node.js';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { imageExtensions } from '~/constanta.js';

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  // This will remove any runtime request handlers
  // after each test, ensuring isolated network behavior.
  server.resetHandlers();

  // Clean up all images files in the current directory
  readdirSync(process.cwd()).forEach((file) => {
    const ext = file.split('.').pop();
    if (ext && imageExtensions.has(ext.toLowerCase())) {
      unlinkSync(file);
    }
  });
});

afterAll(() => {
  server.close();
});
