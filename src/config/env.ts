import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : d;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Set it in .env`);
  return value;
}

/** Single source of runtime configuration. Login comes from `.env`, not from this file. */
export const env = {
  baseURL: (process.env.BASE_URL ?? 'http://localhost:1337').replace(/\/$/, ''),
  email: requiredEnv('FLEET_EMAIL'),
  password: requiredEnv('FLEET_PASSWORD'),
  minHosts: num(process.env.MIN_HOSTS, 2),
  readinessTimeoutMs: num(process.env.READINESS_TIMEOUT_MS, 180_000),
  workers: num(process.env.WORKERS, 2),
  isCI: !!process.env.CI,
} as const;

export const apiPrefix = '/api/latest/fleet';
export const STORAGE_STATE = path.resolve(__dirname, '../../.auth/admin.json');
