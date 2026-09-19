# Moving NestIn from SQLite to Postgres

SQLite (WAL, single file) is the right default for one app instance and tens of thousands of listings. Move to
Postgres when you run more than one API instance, need managed backups/replicas, or want concurrent writers.

## What is already abstract
- All domain access goes through `Collection<T>` in `server/db/database.ts` (`get / list / search / insert /
  replace / remove / count / transaction`) with a JSON document column plus extracted index columns.
- Users and sessions use a small hand-written repository (`server/db/repositories.ts`).
- Every SQL string lives in those two files plus `server/lib/queue.ts` and `server/lib/rateLimit.ts`.

## Migration steps
1. **Driver.** Add `pg` and a `DbDriver` interface with `prepare(sql).get/all/run`, `exec`, and `transaction`.
   Implement `SqliteDriver` (current `DatabaseSync`) and `PostgresDriver` (a `pg.Pool`; `transaction` uses
   `BEGIN … COMMIT` on a dedicated client). Select by `DATABASE_URL` (postgres://) vs `DATABASE_PATH`.
2. **Schema.** The DDL in `SCHEMA` translates almost 1:1: `TEXT` → `TEXT`, `REAL` → `NUMERIC`, `INTEGER` →
   `INTEGER`, JSON `data` → `JSONB`. Keep `id TEXT PRIMARY KEY`. Replace `INSERT … ON CONFLICT(key) DO UPDATE …
   RETURNING` (already Postgres-compatible) and `PRAGMA table_info` (use `information_schema.columns`).
3. **Placeholders.** Convert `?` to `$1, $2 …` inside the Postgres driver's `prepare` so call sites stay unchanged.
4. **Search.** `Collection.search` builds `WHERE … ORDER BY … LIMIT/OFFSET`; the `LIKE` filters become `ILIKE`
   and `search_text` should get a `GIN (to_tsvector('simple', search_text))` index.
5. **Backups.** Replace `VACUUM INTO` in `server/lib/backup.ts` with `pg_dump` (or rely on the managed provider).
6. **Data move.** `node scripts/export-sqlite.mjs > dump.json` then `node scripts/import-postgres.mjs dump.json`:
   iterate every table, insert rows as-is (the `data` JSON is identical).
7. **Tests.** `tests/api/helpers.ts` boots on `:memory:`; point CI at a Postgres service container with
   `DATABASE_URL` and run the same 76 tests — they contain no SQLite-specific assertions.

Estimated effort: 1–2 days including the CI matrix. Nothing in the routes or services changes.
