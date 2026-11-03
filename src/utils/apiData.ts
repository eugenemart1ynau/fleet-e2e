import type { Host } from '../api/types';

/** An id guaranteed not to be in the current host list (avoids hard-coding 999999). */
export const missingHostId = (hosts: Host[]): number =>
  Math.max(0, ...hosts.map((h) => h.id)) + 100_000;

export const ids = (hosts: Host[]): number[] => hosts.map((h) => h.id).sort((a, b) => a - b);
