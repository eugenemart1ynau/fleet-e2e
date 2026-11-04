import type { Host } from '../api/types';

const LINUX = new Set(['ubuntu', 'debian', 'rhel', 'centos', 'fedora', 'linux', 'amzn', 'arch', 'opensuse']);

export const isLinux = (h: Host): boolean => LINUX.has(h.platform);

/**
 * Prefer simulated Linux preview hosts (disposable, identical across machines)
 * over the developer's own enrolled Mac. Online first, stable order by id.
 */
export function pickLinuxHost(hosts: Host[], { exclude = [] as number[], requireOnline = true } = {}): Host {
  const candidates = hosts
    .filter(isLinux)
    .filter((h) => !exclude.includes(h.id))
    .filter((h) => !requireOnline || h.status === 'online')
    .sort((a, b) => a.id - b.id);
  if (!candidates.length) {
    throw new Error(
      `No ${requireOnline ? 'online ' : ''}Linux host available. Saw: ${hosts.map((h) => `${h.display_name}(${h.platform}/${h.status})`).join(', ')}`,
    );
  }
  return candidates[0];
}
