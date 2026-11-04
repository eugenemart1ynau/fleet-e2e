/** Subset of Fleet API shapes used as test oracles (fleet v4.94). */
export type HostStatus = 'online' | 'offline' | 'new' | 'missing' | 'mia';

export interface HostIssues {
  total_issues_count: number;
  failing_policies_count: number;
  critical_vulnerabilities_count?: number;
}

export interface Host {
  id: number;
  display_name: string;
  hostname: string;
  computer_name: string;
  status: HostStatus;
  platform: string;
  os_version: string;
  seen_time: string;
  detail_updated_at: string;
  last_restarted_at: string;
  last_enrolled_at: string;
  uuid: string;
  hardware_serial: string;
  hardware_model: string;
  primary_ip: string;
  public_ip: string;
  primary_mac: string;
  cpu_type: string;
  memory: number;
  gigs_disk_space_available: number;
  percent_disk_space_available: number;
  osquery_version: string;
  orbit_version: string | null;
  issues?: HostIssues;
  team_id?: number | null;
  fleet_id?: number | null;
}

export interface HostDetail extends Host {
  labels: Array<{ id: number; name: string; label_type: string }>;
  policies: unknown[];
  /** Reports tab. Null when the host has no scheduled reports yet. */
  pack_stats?: unknown[] | null;
  users: unknown[];
  refetch_requested: boolean;
  config_tls_refresh?: number;
  logger_tls_period?: number;
  distributed_interval?: number;
}

export interface ListHostsParams {
  page?: number;
  per_page?: number;
  order_key?: string;
  order_direction?: 'asc' | 'desc';
  query?: string;
  status?: string;
  /** Honored by GET /hosts/count and GET /labels/:id/hosts. Ignored by GET /hosts. */
  label_id?: number;
}

export interface HostSoftware {
  id: number;
  name: string;
  source: string;
  installed_versions?: Array<{ version: string }> | null;
}

export interface PageMeta {
  has_next_results: boolean;
  has_previous_results: boolean;
}

export interface HostSoftwareResponse {
  software: HostSoftware[];
  count: number;
  meta: PageMeta;
}

export interface HostsResponse {
  hosts: Host[];
}

export interface CountResponse {
  count: number;
}

export interface HostResponse {
  host: HostDetail & { software?: unknown[] };
}

/** Past activities are null until the host has any. Upcoming activities are an array. */
export interface ActivitiesResponse {
  activities: unknown[] | null;
  meta: PageMeta;
  count?: number;
}

export interface LabelsResponse {
  labels: Label[];
}

export interface LoginResponse {
  token: string;
  user: { id: number; email: string; name: string; settings?: { hidden_host_columns?: string[] } };
}

export interface FleetErrorBody {
  message: string;
  errors: Array<{ name: string; reason: string }>;
  uuid?: string;
}

export interface Label {
  id: number;
  name: string;
  description?: string;
  label_type: string;
  label_membership_type?: string;
  host_count?: number;
  count?: number;
}

export interface EnrollSecretSpec {
  spec: { secrets: Array<{ secret: string; created_at?: string }> };
}
