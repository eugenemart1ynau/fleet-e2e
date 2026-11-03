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
}

export interface HostSoftware {
  id: number;
  name: string;
  source: string;
  installed_versions?: Array<{ version: string }> | null;
}

export interface HostSoftwareResponse {
  software: HostSoftware[];
  count: number;
  meta: { has_next_results: boolean; has_previous_results: boolean };
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
