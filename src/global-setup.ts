import { request } from '@playwright/test';
import { FleetApiClient } from './api/FleetApiClient';
import { env } from './config/env';
import { isLinux, pickLinuxHost } from './utils/hostPicker';

/**
 * Readiness gate: a fresh `fleetctl preview` takes a while to (1) serve HTTP,
 * (2) accept logins, (3) enroll the simulated hosts, (4) report software for the
 * Linux host the UI suite reads. Fail fast with a clear message instead of
 * letting every test time out, or skipping the software checks.
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
      (h) => h.length >= env.minHosts && h.some((x) => isLinux(x) && x.status === 'online'),
      { timeoutMs: Math.max(deadline - Date.now(), 10_000) },
    );
    const linux = pickLinuxHost(hosts);
    const softwareDeadline = Math.max(deadline, Date.now() + 15_000);
    let softwareCount = 0;
    while (Date.now() < softwareDeadline) {
      try {
        softwareCount = (await api.getHostSoftware(linux.id)).count;
        if (softwareCount > 0) break;
      } catch { /* agent is still reporting */ }
      await new Promise((r) => setTimeout(r, 3_000));
    }
    if (softwareCount === 0) {
      throw new Error(
        `Linux host ${linux.display_name} (${linux.id}) reported no software. Software checks need an inventory; they no longer skip.`,
      );
    }
    console.log(`[global-setup] Fleet ready at ${env.baseURL}: ${hosts.length} hosts (${hosts.filter((h) => h.status === 'online').length} online), ${softwareCount} software titles on ${linux.display_name}`);
  } finally {
    await api.dispose();
  }
}
