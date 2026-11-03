import { request } from '@playwright/test';
import { FleetApiClient } from './api/FleetApiClient';
import { env } from './config/env';

/**
 * Readiness gate: a fresh `fleetctl preview` takes a while to (1) serve HTTP,
 * (2) accept logins, (3) enroll the simulated hosts. Fail fast with a clear
 * message instead of letting every test time out.
 */
export default async function globalSetup(): Promise<void> {
  const deadline = Date.now() + env.readinessTimeoutMs;
  const ctx = await request.newContext({ baseURL: env.baseURL });
  let healthy = false;
  while (Date.now() < deadline) {
    try {
      const res = await ctx.get('/healthz', { timeout: 5_000 });
      if (res.ok()) { healthy = true; break; }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  await ctx.dispose();
  if (!healthy) throw new Error(`Fleet not healthy at ${env.baseURL}/healthz after ${env.readinessTimeoutMs}ms. Is \`fleetctl preview\` running?`);

  const api = await FleetApiClient.login();
  try {
    const hosts = await api.waitForHosts(
      (h) => h.length >= env.minHosts && h.some((x) => x.platform !== 'darwin' && x.status === 'online'),
      { timeoutMs: Math.max(deadline - Date.now(), 10_000) },
    );
    console.log(`[global-setup] Fleet ready at ${env.baseURL}: ${hosts.length} hosts (${hosts.filter((h) => h.status === 'online').length} online)`);
  } finally {
    await api.dispose();
  }
}
