import got from 'got';
import { describe, expect, it, vi } from 'vitest';
import { download, parseImageParams } from '~/downloader.js';

// Mock got
vi.mock('got', async () => {
  const actual = await vi.importActual('got');
  const streamFn = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  });

  return {
    default: {
      ...actual.default,
      stream: streamFn,
    },
  };
});

describe('download with insecure option', () => {
  it('should pass rejectUnauthorized: false to got when configured', async () => {
    const url = 'https://example.com/image.jpg';
    const image = parseImageParams(url);

    // We expect the download to "fail" or hang because our mock stream doesn't emit 'response'
    // But we only care about the call arguments.
    // So we can trigger a promise race or just check the call synchronously if we don't await the promise
    // strictly speaking. However, `download` returns a promise.

    // Let's just catch the potential error or timeout, or assume the mock setup needs to be robust enough
    // to not crash the download function immediately.

    // Actually, `download` awaits the stream 'response' event.
    // So if we don't emit it, it will hang.

    // We can just call it and not await it, then check the spy?
    // But `download` does some checks before calling got.stream.

    const downloadPromise = download(image, { rejectUnauthorized: false });

    // Allow microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(got.stream).toHaveBeenCalledWith(
      expect.objectContaining({ href: url }),
      expect.objectContaining({
        https: {
          rejectUnauthorized: false,
        },
      }),
    );

    // Clean up to prevent hanging
    // We can't easily cancel the promise inside `download` without an AbortSignal,
    // but the test process will exit anyway.
  });

  it('should pass rejectUnauthorized: undefined (default) when not configured', async () => {
    const url = 'https://example.com/image.jpg';
    const image = parseImageParams(url);

    const downloadPromise = download(image);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(got.stream).toHaveBeenCalledWith(
      expect.objectContaining({ href: url }),
      expect.objectContaining({
        https: {
          rejectUnauthorized: undefined,
        },
      }),
    );
  });
});
