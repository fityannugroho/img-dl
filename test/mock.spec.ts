import { afterAll, beforeAll, expect, test } from 'vitest';
import { buildFastify } from './fixture/mocks/server.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let baseUrl: string;

beforeAll(async () => {
  app = buildFastify();
  await app.listen();

  const address = app.server.address();
  if (!address) {
    throw new Error('Server not running');
  }

  baseUrl =
    typeof address === 'string' ? address : `http://localhost:${address.port}`;
});

afterAll(async () => {
  await app.close();
});

test('server is running', async () => {
  expect(app).toBeDefined();
  expect(baseUrl).toBeDefined();
  expect(() => app.ready()).not.toThrow();
});

test('GET /', async () => {
  const res = await fetch(baseUrl);

  expect(res.status).toBe(200);
  expect(await res.text()).toBe('OK');
});

test('GET /images/200x300.jpg', async () => {
  const res = await fetch(`${baseUrl}/images/200x300.jpg`);
  const body = await res.blob();

  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/*');
  expect(body.size).toBeGreaterThan(0);
});

test('GET /images/200x300', async () => {
  const res = await fetch(`${baseUrl}/images/200x300`);
  const body = await res.blob();

  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/*');
  expect(body.size).toBeGreaterThan(0);
});
