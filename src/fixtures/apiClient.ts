import { FleetApiClient } from '../api/FleetApiClient';

/** One admin login per worker. Shared by the API and UI fixtures. */
export async function useApiClient(use: (api: FleetApiClient) => Promise<void>): Promise<void> {
  const api = await FleetApiClient.login();
  try {
    await use(api);
  } finally {
    await api.dispose();
  }
}
