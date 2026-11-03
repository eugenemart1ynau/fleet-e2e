import { APIRequestContext, request } from '@playwright/test';
import { apiPrefix, env } from '../config/env';
import type {
  Host,
  HostDetail,
  HostSoftwareResponse,
  ListHostsParams,
  LoginResponse,
} from './types';

/**
 * Thin typed client for the Fleet REST API. Used as the *oracle* in UI tests:
 * the UI must agree with what the API reports, and setup/teardown goes through here.
 */
export class FleetApiClient {
  private constructor(
    private readonly ctx: APIRequestContext,
    public readonly token: string,
    public readonly userId: number,
  ) {}

  static async login(email = env.email, password = env.password, baseURL = env.baseURL): Promise<FleetApiClient> {
    const anon = await request.newContext({ baseURL });
    const res = await anon.post(`${apiPrefix}/login`, { data: { email, password } });
    if (!res.ok()) {
      const body = await res.text();
      await anon.dispose();
      throw new Error(`Fleet API login failed: ${res.status()} ${body}`);
    }
    const json = (await res.json()) as LoginResponse;
    await anon.dispose();
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${json.token}` },
    });
    return new FleetApiClient(ctx, json.token, json.user.id);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  private async getJson<T>(url: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const res = await this.ctx.get(`${apiPrefix}${url}`, { params });
    if (!res.ok()) throw new Error(`GET ${url} -> ${res.status()}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  private static clean(p: object): Record<string, string | number> {
    return Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined && v !== ''),
    ) as Record<string, string | number>;
  }

  /** Mirrors the request the Hosts page makes by default. */
  async listHosts(params: ListHostsParams = {}): Promise<Host[]> {
    const q = FleetApiClient.clean({
      page: 0,
      per_page: 50,
      order_key: 'display_name',
      order_direction: 'asc',
      ...params,
    });
    const { hosts } = await this.getJson<{ hosts: Host[] }>('/hosts', q);
    return hosts;
  }

  async countHosts(params: Pick<ListHostsParams, 'query' | 'status'> = {}): Promise<number> {
    const { count } = await this.getJson<{ count: number }>('/hosts/count', FleetApiClient.clean(params));
    return count;
  }

  async getHost(id: number): Promise<HostDetail> {
    const { host } = await this.getJson<{ host: HostDetail }>(`/hosts/${id}`, { exclude_software: true });
    return host;
  }

  /** Returns HTTP status of GET /hosts/:id (404 once deleted). */
  async getHostStatusCode(id: number): Promise<number> {
    const res = await this.ctx.get(`${apiPrefix}/hosts/${id}`, { params: { exclude_software: true } });
    return res.status();
  }

  async getHostSoftware(id: number, query = ''): Promise<HostSoftwareResponse> {
    return this.getJson<HostSoftwareResponse>(`/hosts/${id}/software`, FleetApiClient.clean({
      page: 0, per_page: 20, order_key: 'name', order_direction: 'asc', query,
    }));
  }

  async deleteHost(id: number): Promise<void> {
    const res = await this.ctx.delete(`${apiPrefix}/hosts/${id}`);
    if (!res.ok()) throw new Error(`DELETE /hosts/${id} -> ${res.status()}: ${await res.text()}`);
  }

  async refetchHost(id: number): Promise<void> {
    const res = await this.ctx.post(`${apiPrefix}/hosts/${id}/refetch`);
    if (!res.ok()) throw new Error(`POST /hosts/${id}/refetch -> ${res.status()}`);
  }

  /** Reset per-user hidden columns so column tests start from defaults. */
  async setHiddenHostColumns(columns: string[] | null): Promise<void> {
    const res = await this.ctx.patch(`${apiPrefix}/users/${this.userId}`, {
      data: { settings: { hidden_host_columns: columns } },
    });
    if (!res.ok()) throw new Error(`PATCH /users/${this.userId} -> ${res.status()}: ${await res.text()}`);
  }

  /**
   * Poll until `predicate(hosts)` is true (e.g. N hosts enrolled / online).
   * Throws with the last observed state on timeout.
   */
  async waitForHosts(
    predicate: (hosts: Host[]) => boolean = (h) => h.length >= env.minHosts,
    { timeoutMs = 120_000, intervalMs = 3_000, params = {} as ListHostsParams } = {},
  ): Promise<Host[]> {
    const deadline = Date.now() + timeoutMs;
    let last: Host[] = [];
    while (Date.now() < deadline) {
      try {
        last = await this.listHosts(params);
        if (predicate(last)) return last;
      } catch {
        /* server may be warming up */
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`waitForHosts timed out after ${timeoutMs}ms; last saw ${last.length} hosts`);
  }
}
