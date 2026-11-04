import * as fs from 'fs';
import * as path from 'path';

const lockPath = path.join(process.cwd(), '.auth/host-columns.lock');

/**
 * Edit columns writes one user setting. Smoke and regression both touch it, and
 * two workers would otherwise race. Hold this lock around the read-modify-restore.
 */
export async function withHostColumnLock<T>(fn: () => Promise<T>): Promise<T> {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + 120_000;
  let fd: number | undefined;
  while (Date.now() < deadline) {
    try {
      const stale = fs.statSync(lockPath, { throwIfNoEntry: false });
      if (stale && Date.now() - stale.mtimeMs > 180_000) fs.unlinkSync(lockPath);
    } catch {
      /* another worker removed it */
    }
    try {
      fd = fs.openSync(lockPath, 'wx');
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw err;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (fd === undefined) throw new Error('Timed out waiting for the host-columns lock');
  try {
    return await fn();
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* already gone */
    }
  }
}
