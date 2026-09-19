import fs from 'node:fs';
import path from 'node:path';

/**
 * Every e2e run gets its own database file (see playwright.config.ts: E2E_DB carries the path), so a
 * run never inherits state from the previous one. Playwright starts the web server before this
 * hook runs, which is why the current file cannot be deleted here — earlier runs' files can.
 */
export default function globalSetup() {
  const dir = path.resolve('./data');
  if (!fs.existsSync(dir)) return;
  const current = path.basename(process.env.E2E_DB || '');
  for (const f of fs.readdirSync(dir)) {
    if (!/^e2e(-[a-z0-9]+)?\.db(-wal|-shm)?$/.test(f)) continue;
    if (current && f.startsWith(current)) continue;
    try {
      fs.rmSync(path.join(dir, f), { force: true });
    } catch {
      // still locked by a previous server; it will be picked up next time
    }
  }
}
