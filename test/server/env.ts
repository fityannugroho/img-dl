import 'dotenv/config';

export const env = {
  HOST: process.env.HOST || 'localhost',
  PORT: parseInt(process.env.PORT || '3000', 10),
} as const;

export const BASE_URL = `http://${env.HOST}:${env.PORT}`;
