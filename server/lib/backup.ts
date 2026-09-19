import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { backupDatabaseTo, databaseSizeBytes, getMeta, setMeta } from '../db/database.js';
import { storage, storageDriverName } from './storage.js';
import { events } from './events.js';
import { log } from './logger.js';

/**
 * Database backups. `VACUUM INTO` produces a consistent single-file copy while the app keeps
 * serving. Copies are rotated locally and, when S3 storage is configured, mirrored to the bucket
 * so a lost server does not mean lost data.
 */

export interface BackupInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  location: 'local' | 's3';
}

export function backupDir(): string {
  return config.backups.dir || path.join(path.dirname(config.databasePath), 'backups');
}

export function listBackups(): BackupInfo[] {
  const dir = backupDir();
  if (config.databasePath === ':memory:' || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((fileName) => {
      const stat = fs.statSync(path.join(dir, fileName));
      return { fileName, sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), location: 'local' as const };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function rotate(): void {
  const extra = listBackups().slice(config.backups.keep);
  for (const b of extra) {
    try {
      fs.unlinkSync(path.join(backupDir(), b.fileName));
    } catch (err) {
      log.warn('backup rotation failed', { file: b.fileName, error: String(err) });
    }
  }
}

export async function runBackup(reason: 'scheduled' | 'manual' = 'scheduled'): Promise<BackupInfo> {
  if (config.databasePath === ':memory:') throw new Error('Cannot back up an in-memory database');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `nestin-${stamp}.db`;
  const target = path.join(backupDir(), fileName);
  backupDatabaseTo(target);
  const sizeBytes = fs.statSync(target).size;
  let location: BackupInfo['location'] = 'local';
  if (storageDriverName === 's3') {
    try {
      // Streamed from disk: a multi-GB database must never be buffered into memory for upload.
      await storage.putFile(`${config.backups.s3Prefix}${fileName}`, target, 'application/x-sqlite3');
      location = 's3';
    } catch (err) {
      log.error('backup upload to S3 failed', { file: fileName, error: String(err) });
    }
  }
  rotate();
  setMeta('backup:last', new Date().toISOString());
  events.publish('DatabaseBackupCreated', 'Database', fileName, { sizeBytes, reason, location });
  log.info('database backup created', { file: fileName, sizeBytes, location, reason });
  return { fileName, sizeBytes, createdAt: new Date().toISOString(), location };
}

export function backupStatus() {
  return {
    enabled: config.backups.enabled,
    directory: backupDir(),
    keep: config.backups.keep,
    mirroredToS3: storageDriverName === 's3',
    lastBackupAt: getMeta('backup:last'),
    databaseSizeBytes: databaseSizeBytes(),
    backups: listBackups(),
  };
}

/** Runs the nightly backup once per calendar day (idempotent across restarts / multiple ticks). */
export async function runScheduledBackup(now = new Date()): Promise<boolean> {
  if (!config.backups.enabled || config.databasePath === ':memory:') return false;
  const day = now.toISOString().slice(0, 10);
  if (getMeta('backup:day') === day) return false;
  await runBackup('scheduled');
  setMeta('backup:day', day);
  return true;
}
