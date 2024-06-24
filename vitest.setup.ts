import { readdirSync, rmSync } from 'node:fs';
import { afterEach } from 'vitest';
import { imageExtensions } from '~/constanta.js';

afterEach(() => {
  // Clean up all images files in the current directory
  readdirSync(process.cwd()).forEach((file) => {
    const ext = file.split('.').pop();
    if (ext && imageExtensions.has(ext.toLowerCase())) {
      rmSync(file);
    }
  });
});
