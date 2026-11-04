import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { apiPrefix, env } from '../config/env';
import type {
  CountResponse,
  Host,
  HostDetail,
  HostResponse,
  HostsResponse,
  HostSoftwareResponse,
  Label,
  LabelsResponse,
  ListHostsParams,
  LoginResponse,
} from './types';

/** Query the Hosts table sends for the default list. */
export const DEFAULT_HOST_LIST = {
  page: 0,
  per_page: 50,
  order_key: 'display_name',
  order_direction: 'asc',
} as const satisfies ListHostsParams;

/** Query the host Software tab sends for the default page. */
export const DEFAULT_SOFTWARE_LIST = {
  page: 0,
  per_page: 20,
  order_key: 'name',
  order_direction: 'asc',
} as const satisfies Pick<ListHostsParams, 'page' | 'per_page' | 'order_key' | 'order_direction'>;

export type QueryParams = Record<string, string | number | boolean>;
export interface RawRequestOptions {
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
}

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
    try {
      const res = await FleetApiClient.postLoginWithBackoff(anon, email, password);
      if (!res.ok()) {
        const body = await res.text();
        throw new Error(`Fleet API login failed: ${res.status()} ${body}`);
      }
      const json = (await res.json()) as LoginResponse;
      return FleetApiClient.withToken(json.token, json.user.id, baseURL);
    } finally {
      await anon.dispose();
    }
  }

  /** Client that sends an arbitrary bearer token (valid, expired, garbage) on every request. */
  static async withToken(token: string, userId = 0, baseURL = env.baseURL): Promise<FleetApiClient> {
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    return new FleetApiClient(ctx, token, userId);
  }

  /** Client with no Authorization header — for 401 checks and the login endpoint itself. */
  static async anonymous(baseURL = env.baseURL): Promise<FleetApiClient> {
    const ctx = await request.newContext({ baseURL });
    return new FleetApiClient(ctx, '', 0);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  // ---- Raw helpers: return the APIResponse untouched so API tests can assert status/body. ----
  // Paths are relative to /api/latest/fleet (e.g. '/hosts/1').

  get(path: string, opts: RawRequestOptions = {}): Promise<APIResponse> {
    return this.ctx.get(`${apiPrefix}${path}`, opts);
  }

  post(path: string, opts: RawRequestOptions = {}): Promise<APIResponse> {
    return this.ctx.post(`${apiPrefix}${path}`, opts);
  }

  patch(path: string, opts: RawRequestOptions = {}): Promise<APIResponse> {
    return this.ctx.patch(`${apiPrefix}${path}`, opts);
  }

  delete(path: string, opts: RawRequestOptions = {}): Promise<APIResponse> {
    return this.ctx.delete(`${apiPrefix}${path}`, opts);
  }

  /** Raw login (no throw) — for negative auth tests. Retries only on 429 rate limiting. */
  rawLogin(email: string, password: string): Promise<APIResponse> {
    return FleetApiClient.postLoginWithBackoff(this.ctx, email, password);
  }

  /**
   * Fleet rate-limits POST /login per IP and answers 429 "limit exceeded, retry after: Ns".
   * Parallel workers + negative auth tests hit it easily, so back off and retry on 429 only.
   */
  private static async postLoginWithBackoff(
    ctx: APIRequestContext,
    email: string,
    password: string,
    maxAttempts = 8,
  ): Promise<APIResponse> {
    let res!: APIResponse;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      res = await ctx.post(`${apiPrefix}/login`, { data: { email, password } });
      if (res.status() !== 429 || attempt === maxAttempts) return res;
      const m = /retry after: (\d+(?:\.\d+)?)s/.exec(await res.text());
      const waitMs = (m ? Number(m[1]) * 1000 : 1000) + 250 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    return res;
  }

  private async getJson<T>(url: string, params?: QueryParams): Promise<T> {
    const res = await this.get(url, { params });
    if (!res.ok()) throw new Error(`GET ${url} -> ${res.status()}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  private static clean(p: object): QueryParams {
    return Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined && v !== ''),
    ) as QueryParams;
  }

  /** Mirrors the request the Hosts page makes by default. One page. */
  async listHosts(params: ListHostsParams = {}): Promise<Host[]> {
    const q = FleetApiClient.clean({ ...DEFAULT_HOST_LIST, ...params });
    const { hosts } = await this.getJson<HostsResponse>('/hosts', q);
    return hosts;
  }

  /** Every page of GET /hosts. Stops on a short page or a repeated page. */
  async listAllHosts(params: ListHostsParams = {}): Promise<Host[]> {
    const perPage = Number(params.per_page ?? DEFAULT_HOST_LIST.per_page);
    const all: Host[] = [];
    const seen = new Set<number>();
    for (let page = 0; page < 40; page++) {
      const batch = await this.listHosts({ ...params, page, per_page: perPage });
      const fresh = batch.filter((h) => !seen.has(h.id));
      if (fresh.length === 0) break;
      for (const h of fresh) seen.add(h.id);
      all.push(...fresh);
      if (batch.length < perPage) break;
    }
    return all;
  }

  async countHosts(params: Pick<ListHostsParams, 'query' | 'status' | 'label_id'> = {}): Promise<number> {
    const { count } = await this.getJson<CountResponse>('/hosts/count', FleetApiClient.clean(params));
    return count;
  }

  async getHost(id: number): Promise<HostDetail> {
    const { host } = await this.getJson<HostResponse>(`/hosts/${id}`, { exclude_software: true });
    return host;
  }

  /** Returns HTTP status of GET /hosts/:id (404 once deleted). */
  async getHostStatusCode(id: number): Promise<number> {
    const res = await this.get(`/hosts/${id}`, { params: { exclude_software: true } });
    return res.status();
  }

  async getHostSoftware(
    id: number,
    query = '',
    extra: { order_key?: string; order_direction?: 'asc' | 'desc' } = {},
  ): Promise<HostSoftwareResponse> {
    return this.getJson<HostSoftwareResponse>(`/hosts/${id}/software`, FleetApiClient.clean({
      ...DEFAULT_SOFTWARE_LIST,
      query,
      ...extra,
    }));
  }

  /** Hosts shown when the Hosts page filters by a label. */
  async listLabelHosts(id: number, params: ListHostsParams = {}): Promise<Host[]> {
    const { hosts } = await this.getJson<HostsResponse>(
      `/labels/${id}/hosts`,
      FleetApiClient.clean({ ...DEFAULT_HOST_LIST, ...params }),
    );
    return hosts;
  }

  async requireLabel(name: string): Promise<Label> {
    const { labels } = await this.getJson<LabelsResponse>('/labels');
    const label = labels.find((l) => l.name === name);
    if (!label) throw new Error(`builtin label "${name}" missing`);
    return label;
  }

  async deleteHost(id: number): Promise<void> {
    const res = await this.delete(`/hosts/${id}`);
    if (!res.ok()) throw new Error(`DELETE /hosts/${id} -> ${res.status()}: ${await res.text()}`);
  }

  async refetchHost(id: number): Promise<void> {
    const res = await this.post(`/hosts/${id}/refetch`);
    if (!res.ok()) throw new Error(`POST /hosts/${id}/refetch -> ${res.status()}`);
  }

  /** Reset per-user hidden columns so column tests start from defaults. */
  async setHiddenHostColumns(columns: string[] | null): Promise<void> {
    const res = await this.patch(`/users/${this.userId}`, {
      data: { settings: { hidden_host_columns: columns } },
    });
    if (!res.ok()) throw new Error(`PATCH /users/${this.userId} -> ${res.status()}: ${await res.text()}`);
  }

  /**
   * Read hidden_host_columns for this user.
   * Fleet persists settings, but GET /me and GET /users/:id omit them; GET /users includes them.
   */
  async getHiddenHostColumns(): Promise<string[]> {
    const { users } = await this.getJson<{ users: Array<{ id: number; settings?: { hidden_host_columns?: string[] } }> }>('/users');
    const me = users.find((u) => u.id === this.userId);
    if (!me) throw new Error(`user ${this.userId} missing from GET /users`);
    return me.settings?.hidden_host_columns ?? [];
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
