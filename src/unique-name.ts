import fs from 'node:fs';
import path from 'node:path';

/**
 * First free numeric index for `{base}.{ext}` in `directory`, considering
 * files already on disk. 0 means the plain name is free.
 */
export function firstFreeIndex(
  directory: string,
  base: string,
  ext: string,
): number {
  let n = 0;
  while (
    fs.existsSync(
      path.join(directory, n === 0 ? `${base}.${ext}` : `${base} (${n}).${ext}`),
    )
  ) {
    n += 1;
  }
  return n;
}

/** Apply a numeric slot to a base name: index 0 keeps the plain name. */
export function numberedName(base: string, index: number): string {
  return index === 0 ? base : `${base} (${index})`;
}