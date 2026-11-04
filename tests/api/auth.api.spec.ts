import { test, expect } from '../../src/fixtures/api';
import { FleetApiClient } from '../../src/api/FleetApiClient';
import { expectFleetError, expectJson, expectStatus } from '../../src/api/assertions';
import type { LoginResponse } from '../../src/api/types';
import { env } from '../../src/config/env';
import { absentId } from '../../src/utils/apiData';

/**
 * Call: POST /login, then GET /me with the returned token.
 * Checks: the preview admin can sign in and that token is accepted.
 * Why: every Hosts and host-details request depends on this login.
 */
test.describe('API: authentication @api', () => {
  /**
   * Call: POST /login with the preview admin from .env, then GET /me with that token.
   * Checks: token is a string longer than 10 characters, user.email matches, and GET /me returns the same email.
   * Why: the Hosts page cannot load without a session that /me accepts.
   */
  test('POST /login with valid credentials returns a usable token', { tag: '@smoke' }, async ({ anonApi }) => {
    const body = await expectJson<LoginResponse>(await anonApi.rawLogin(env.email, env.password));
    expect(body.token, 'token').toEqual(expect.any(String));
    expect(body.token.length).toBeGreaterThan(10);
    expect(body.user.email).toBe(env.email);

    const client = await FleetApiClient.withToken(body.token);
    try {
      const me = await expectJson<{ user: { email: string } }>(await client.get('/me'));
      expect(me.user.email).toBe(env.email);
    } finally {
      await client.dispose();
    }
  });

  /**
   * Call: POST /login for three failures — wrong password, unknown user, and empty credentials.
   * Checks: each is 401 with message "Authentication failed". The text is the same for every case.
   * Why: a distinct message per failure would let a caller enumerate accounts.
   */
  for (const [name, email, password] of [
    ['wrong password', env.email, 'definitely-wrong-password'],
    ['unknown user', 'nobody-here@example.com', 'whatever123#'],
    ['empty credentials', '', ''],
  ] as const) {
    test(`POST /login with ${name} returns 401 Authentication failed`, { tag: '@regression' }, async ({ anonApi }) => {
      await expectFleetError(await anonApi.rawLogin(email, password), 401, {
        message: 'Authentication failed',
      });
    });
  }
});

const AUTH_REQUIRED = /Authorization header required/i;

/**
 * Call: Hosts, host details, labels, enroll-secret, and user routes with no session.
 * Checks: a missing or bad credential is 401 and does not change host data.
 * Why: these are the calls behind /hosts/manage and host details.
 */
test.describe('API: protected routes reject unauthenticated calls @api', () => {
  const unknownId = absentId([]);
  const routes = [
    '/hosts',
    '/hosts/count',
    `/hosts/${unknownId}`,
    `/hosts/${unknownId}/software`,
    '/me',
    '/labels',
    `/labels/${unknownId}/hosts`,
    '/spec/enroll_secret',
    '/users',
  ];

  /**
   * Call: GET with no Authorization header on /hosts, /hosts/count, /hosts/{absent id}, /hosts/{absent id}/software, /me, /labels, /labels/{absent id}/hosts, /spec/enroll_secret, and /users.
   * Checks: each is 401 with a reason matching "Authorization header required". The id is not a seeded host or user.
   * Why: an anonymous caller must not read the fleet.
   */
  for (const route of routes) {
    test(`GET ${route} without Authorization header returns 401`, { tag: '@regression' }, async ({ anonApi }) => {
      await expectFleetError(await anonApi.get(route), 401, { reason: AUTH_REQUIRED });
    });
  }

  /**
   * Call: GET /hosts/report?format=csv with no Authorization header.
   * Checks: 401 with a reason matching "Authorization header required". format=csv is sent because Fleet checks format before auth, so a bare path is 400.
   * Why: this is the Hosts page CSV download.
   */
  test(
    'GET /hosts/report?format=csv without Authorization header returns 401',
    { tag: '@regression' },
    async ({ anonApi }) => {
      await expectFleetError(await anonApi.get('/hosts/report', { params: { format: 'csv' } }), 401, {
        reason: AUTH_REQUIRED,
      });
    },
  );

  /**
   * Call: GET /hosts with bearer token "not-a-real-token".
   * Checks: 401.
   * Why: a forged token must not list hosts.
   */
  test('GET /hosts with a garbage bearer token returns 401', { tag: '@regression' }, async () => {
    const bad = await FleetApiClient.withToken('not-a-real-token');
    try {
      await expectStatus(await bad.get('/hosts'), 401);
    } finally {
      await bad.dispose();
    }
  });

  /**
   * Call: PATCH /users/{absent id} with hidden_host_columns and no Authorization header.
   * Checks: 401 with a reason matching "Authorization header required".
   * Why: Edit columns writes this setting.
   */
  test('PATCH /users/:id without Authorization header returns 401', { tag: '@regression' }, async ({ anonApi }) => {
    await expectFleetError(
      await anonApi.patch(`/users/${absentId([])}`, { data: { settings: { hidden_host_columns: [] } } }),
      401,
      { reason: AUTH_REQUIRED },
    );
  });

  /**
   * Call: DELETE /hosts/:id for a real host, with no token.
   * Checks: 401, then a follow-up GET of that host is still 200.
   * Why: a missing token must not delete a host.
   */
  test(
    'DELETE /hosts/:id without token returns 401 and deletes nothing',
    { tag: '@regression' },
    async ({ anonApi, api, knownHost }) => {
      await expectFleetError(await anonApi.delete(`/hosts/${knownHost.id}`), 401, { reason: AUTH_REQUIRED });
      expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
    },
  );

  /**
   * Call: POST /hosts/delete with one real host id and no token.
   * Checks: 401, then a follow-up GET of that host is still 200.
   * Why: the bulk-delete body must not run anonymously.
   */
  test(
    'POST /hosts/delete without token returns 401 and deletes nothing',
    { tag: '@regression' },
    async ({ anonApi, api, knownHost }) => {
      await expectFleetError(await anonApi.post('/hosts/delete', { data: { ids: [knownHost.id] } }), 401, {
        reason: AUTH_REQUIRED,
      });
      expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
    },
  );

  /**
   * Call: GET /hosts/count, POST /logout, then GET /hosts/count again, on one logged-in client.
   * Checks: the first count is 200, logout is 200, and the second count is 401.
   * Why: a logged-out session must not keep reading the fleet.
   */
  test('token is rejected after POST /logout', { tag: '@regression' }, async () => {
    const session = await FleetApiClient.login();
    try {
      await expectStatus(await session.get('/hosts/count'), 200);
      await expectStatus(await session.post('/logout'), 200);
      await expectStatus(await session.get('/hosts/count'), 401);
    } finally {
      await session.dispose();
    }
  });
});
