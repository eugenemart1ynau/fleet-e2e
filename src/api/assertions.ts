import { expect, test, type APIResponse } from '@playwright/test';
import type { FleetErrorBody } from './types';

const describe = async (res: APIResponse): Promise<string> => {
  let body = '';
  try {
    body = (await res.text()).slice(0, 500);
  } catch {
    /* body already consumed / empty */
  }
  return `${res.url()} -> ${res.status()}\n${body}`;
};

/** Assert an exact HTTP status; failure message includes method, URL and response body. */
export async function expectStatus(res: APIResponse, status: number): Promise<void> {
  const actual = res.status();
  if (actual !== status) {
    expect(actual, `Expected ${status}. ${await describe(res)}`).toBe(status);
    return;
  }
  expect(actual).toBe(status);
}

/**
 * Membership check that does not print `allowed` in the assertion diff.
 * Use this for enroll secrets and other values that land in the HTML report.
 */
export function expectIncluded(actual: string | undefined, allowed: readonly string[], label: string): void {
  expect(Boolean(actual) && allowed.includes(actual as string), label).toBe(true);
}

/** Assert status and return the parsed JSON body typed as T. */
export async function expectJson<T>(res: APIResponse, status = 200): Promise<T> {
  await expectStatus(res, status);
  expect(res.headers()['content-type'] ?? '', 'JSON content-type').toContain('application/json');
  return (await res.json()) as T;
}

/**
 * Assert a Fleet error envelope: `{ message, errors: [{ name, reason }], uuid }`.
 * `reason` may be a string (substring match) or RegExp.
 */
export async function expectFleetError(
  res: APIResponse,
  status: number,
  expected: { message?: string | RegExp; reason?: string | RegExp } = {},
): Promise<FleetErrorBody> {
  // Fleet serves some error envelopes (e.g. 401 "Authorization header required", 400 "Invalid status")
  // as `text/plain` even though the body is JSON. Parse the body regardless and record the mismatch
  // as a test annotation (reported in the HTML report) instead of failing the functional check.
  await expectStatus(res, status);
  const ct = res.headers()['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    test.info().annotations.push({
      type: 'contract-note',
      description: `${res.url()} ${status} error body is JSON but Content-Type is "${ct}"`,
    });
  }
  const text = await res.text();
  let body: FleetErrorBody;
  try {
    body = JSON.parse(text) as FleetErrorBody;
  } catch {
    throw new Error(`Expected Fleet JSON error envelope, got: ${text.slice(0, 300)}`);
  }
  expect(typeof body.message, 'error.message is a string').toBe('string');
  expect(Array.isArray(body.errors) && body.errors.length > 0, 'errors[] non-empty').toBeTruthy();
  if (expected.message !== undefined) expect(body.message).toMatch(expected.message);
  if (expected.reason !== undefined) {
    const reasons = body.errors.map((e) => e.reason).join(' | ');
    expect(reasons).toMatch(expected.reason);
  }
  return body;
}

/** Fleet sends null, not [], when a host has no rows yet (activities, pack_stats). */
export function expectNullOrArray(value: unknown, label: string): void {
  expect(value === null || Array.isArray(value), label).toBe(true);
}

/** Every element satisfies `pred`; failure lists offending items. */
export function expectEvery<T>(
  items: T[],
  pred: (t: T) => boolean,
  label: string,
  show: (t: T) => unknown = (t) => t,
): void {
  const bad = items.filter((i) => !pred(i));
  expect(bad.map(show), `${label}: offending items`).toEqual([]);
}
