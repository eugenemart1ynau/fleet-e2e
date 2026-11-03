import { test, expect } from '../../src/fixtures/api';
import { FleetApiClient } from '../../src/api/FleetApiClient';
import { expectFleetError, expectJson, expectStatus } from '../../src/api/assertions';
import type { LoginResponse } from '../../src/api/types';
import { env } from '../../src/config/env';

test.describe('API: authentication @api @smoke', () => {
  test('POST /login with valid credentials returns a usable token', async ({ anonApi }) => {
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

  // Same 401 + message for every failure mode = no user enumeration.
  for (const [name, email, password] of [
    ['wrong password', env.email, 'definitely-wrong-password'],
    ['unknown user', 'nobody-here@example.com', 'whatever123#'],
    ['empty credentials', '', ''],
  ] as const) {
    test(`POST /login with ${name} returns 401 Authentication failed`, async ({ anonApi }) => {
      await expectFleetError(await anonApi.rawLogin(email, password), 401, {
        message: 'Authentication failed',
      });
    });
  }
});

test.describe('API: protected routes reject unauthenticated calls @api', () => {
  const routes = ['/hosts', '/hosts/count', '/hosts/1', '/hosts/1/software', '/me'];

  for (const route of routes) {
    test(`GET ${route} without Authorization header returns 401`, async ({ anonApi }) => {
      await expectFleetError(await anonApi.get(route), 401, { reason: /Authorization header required/i });
    });
  }

  test('GET /hosts with a garbage bearer token returns 401', async () => {
    const bad = await FleetApiClient.withToken('not-a-real-token');
    try {
      await expectStatus(await bad.get('/hosts'), 401);
    } finally {
      await bad.dispose();
    }
  });

  test('DELETE /hosts/:id without token returns 401 and deletes nothing', async ({ anonApi, api, knownHost }) => {
    await expectStatus(await anonApi.delete(`/hosts/${knownHost.id}`), 401);
    expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
  });

  test('token is rejected after POST /logout', async () => {
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
