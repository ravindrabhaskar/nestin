// Points git at the versioned hooks directory so every clone runs the pre-commit checks.
// Runs on `npm install` (prepare); skipped in CI and Docker builds where .git may not exist.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (process.env.CI || !existsSync('.git')) process.exit(0);
try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch {
  // git not available; nothing to do
}
