import type { Host } from '../api/types';

/** Search string that must not match a real host or software name. */
export const NO_MATCH_HOST_QUERY = 'zz-no-such-host-qa-7f3c';
export const NO_MATCH_SOFTWARE_QUERY = 'zz-no-such-software-qa-7f3c';

/** An id guaranteed not to be in `ids` (avoids hard-coding 999999). */
export const absentId = (ids: number[]): number => Math.max(0, ...ids) + 100_000;

/** An id guaranteed not to be in the current host list. */
export const missingHostId = (hosts: Host[]): number => absentId(hosts.map((h) => h.id));

/** Fleet 404 reason for a numeric host id. Non-numeric paths are plain text, not this envelope. */
export const hostNotFound = (id: number): RegExp => new RegExp(`Host ${id} was not found`);

/** Value of a named CSV column. Throws if the header is missing instead of reading row[-1]. */
export function csvValue(headers: string[], row: string[], column: string): string {
  const i = headers.indexOf(column);
  if (i < 0) throw new Error(`CSV has no column "${column}" (headers: ${headers.join(', ')})`);
  return row[i];
}

export const ids = (hosts: Host[]): number[] => hosts.map((h) => h.id).sort((a, b) => a - b);

/** Minimal CSV parse (quoted fields + "" escapes). Fleet /hosts/report returns text/csv. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  if (lines.length === 1 && lines[0] === '') return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          inQuotes = false;
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };

  return {
    headers: parseLine(lines[0]),
    rows: lines
      .slice(1)
      .filter((l) => l.length > 0)
      .map(parseLine),
  };
}
