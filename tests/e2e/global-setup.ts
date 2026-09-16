import fs from 'node:fs';

/** Start every e2e run from a fresh, freshly seeded database. */
export default function globalSetup() {
  for (const f of ['./data/e2e.db', './data/e2e.db-wal', './data/e2e.db-shm']) {
    try {
      fs.rmSync(f, { force: true });
    } catch {
      // ignore
    }
  }
}
