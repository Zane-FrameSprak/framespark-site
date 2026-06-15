import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';

const SCHEMA_VERSION = 1;

export function createBetaAccessStore(options) {
  const requestedPath = String(options?.dbPath || '').trim();
  if (!requestedPath) throw new Error('BETA_ACCESS_DB_PATH_REQUIRED');
  const dbPath = path.resolve(requestedPath);
  const now = options?.now || (() => new Date());

  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  assertRegularDatabasePath(dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('secure_delete = ON');
  initializeSchema(db);
  secureDatabaseFiles(dbPath);

  const statements = prepareStatements(db);
  const issueSessionsTransactionRunner = db.transaction(input => issueSessionsTransaction(statements, input, now));
  const acquirePermitTransactionRunner = db.transaction(input => acquirePermitTransaction(statements, input, now));

  return {
    dbPath,
    getSchemaVersion: () => db.pragma('user_version', { simple: true }),
    createCode(input) {
      const createdAt = toMillis(input.createdAt || now());
      const id = input.id || randomUUID();
      statements.insertCode.run({
        id,
        codeHash: input.codeHash,
        label: input.label || null,
        enabled: input.enabled === false ? 0 : 1,
        expiresAt: toMillis(input.expiresAt),
        maxUses: positiveInteger(input.maxUses, 'maxUses'),
        createdAt,
        updatedAt: createdAt
      });
      return sanitizeCode(statements.selectCodeById.get(id));
    },
    listCodes() {
      return statements.listCodes.all().map(sanitizeCode);
    },
    updateCode(id, updates = {}) {
      const current = statements.selectCodeById.get(id);
      if (!current) return null;
      const maxUses = updates.maxUses == null ? current.max_uses : positiveInteger(updates.maxUses, 'maxUses');
      if (maxUses < current.used_count) throw new Error('BETA_ACCESS_MAX_USES_BELOW_USED_COUNT');
      const expiresAt = updates.expiresAt == null ? current.expires_at : toMillis(updates.expiresAt);
      statements.updateCode.run({
        id,
        label: updates.label === undefined ? current.label : (updates.label || null),
        expiresAt,
        maxUses,
        updatedAt: toMillis(now())
      });
      return sanitizeCode(statements.selectCodeById.get(id));
    },
    setEnabled(id, enabled) {
      const current = statements.selectCodeById.get(id);
      if (!current || current.revoked_at != null) return null;
      if (Boolean(current.enabled) !== Boolean(enabled)) {
        statements.setEnabled.run({
          id,
          enabled: enabled ? 1 : 0,
          versionIncrement: enabled ? 0 : 1,
          updatedAt: toMillis(now())
        });
      }
      return sanitizeCode(statements.selectCodeById.get(id));
    },
    revokeCode(id) {
      const current = statements.selectCodeById.get(id);
      if (!current) return null;
      if (current.revoked_at == null) {
        const timestamp = toMillis(now());
        statements.revokeCode.run({ id, revokedAt: timestamp, updatedAt: timestamp });
      }
      return sanitizeCode(statements.selectCodeById.get(id));
    },
    issueSessions(input) {
      return runBusyRetry(() => issueSessionsTransactionRunner.immediate(input));
    },
    validateSession(input) {
      const timestamp = toMillis(input.now || now());
      const session = statements.selectValidSession.get({
        tokenHash: input.tokenHash,
        scope: input.scope,
        now: timestamp
      });
      if (!session) return null;
      return {
        identityId: session.code_id,
        sessionVersion: session.session_version,
        expiresAt: new Date(session.session_expires_at).toISOString()
      };
    },
    acquireVerificationPermit(input) {
      return runBusyRetry(() => acquirePermitTransactionRunner.immediate(input));
    },
    recordVerificationFailure(ipHash, cooldownMs) {
      const timestamp = toMillis(now());
      statements.upsertCooldown.run({ ipHash, untilAt: timestamp + cooldownMs, updatedAt: timestamp });
    },
    clearVerificationCooldown(ipHash) {
      statements.deleteCooldown.run(ipHash);
    },
    recordAudit(input) {
      statements.insertAudit.run({
        id: randomUUID(),
        identityId: input.identityId || null,
        subjectHash: input.subjectHash || null,
        event: String(input.event),
        status: String(input.status),
        createdAt: toMillis(input.createdAt || now())
      });
    },
    cleanup(options = {}) {
      const timestamp = toMillis(now());
      const auditDays = positiveInteger(options.auditRetentionDays || 30, 'auditRetentionDays');
      statements.deleteExpiredSessions.run(timestamp);
      statements.deleteExpiredCooldowns.run(timestamp);
      statements.deleteOldCounters.run(timestamp - (2 * 24 * 60 * 60 * 1000));
      statements.deleteOldAudit.run(timestamp - (auditDays * 24 * 60 * 60 * 1000));
    },
    async backup(destination) {
      const resolved = path.resolve(destination);
      if (fs.existsSync(resolved)) throw new Error('BETA_ACCESS_BACKUP_EXISTS');
      fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
      await db.backup(resolved);
      fs.chmodSync(resolved, 0o600);
      return resolved;
    },
    close() {
      db.close();
    }
  };
}

function initializeSchema(db) {
  const existingVersion = db.pragma('user_version', { simple: true });
  if (existingVersion > SCHEMA_VERSION) throw new Error('BETA_ACCESS_SCHEMA_TOO_NEW');
  db.exec(`
    CREATE TABLE IF NOT EXISTS beta_codes (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      label TEXT,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      expires_at INTEGER NOT NULL,
      max_uses INTEGER NOT NULL CHECK (max_uses > 0),
      used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
      session_version INTEGER NOT NULL DEFAULT 1 CHECK (session_version > 0),
      revoked_at INTEGER,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beta_sessions (
      token_hash TEXT PRIMARY KEY,
      code_id TEXT NOT NULL REFERENCES beta_codes(id) ON DELETE CASCADE,
      scope TEXT NOT NULL CHECK (scope IN ('page', 'api')),
      session_version INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      revoked_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS beta_sessions_code_id_idx ON beta_sessions(code_id);

    CREATE TABLE IF NOT EXISTS beta_verify_counters (
      scope TEXT NOT NULL,
      subject_hash TEXT NOT NULL,
      bucket TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, subject_hash, bucket)
    );

    CREATE TABLE IF NOT EXISTS beta_verify_cooldowns (
      ip_hash TEXT PRIMARY KEY,
      until_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beta_access_audit (
      id TEXT PRIMARY KEY,
      identity_id TEXT,
      subject_hash TEXT,
      event TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS beta_access_audit_created_idx ON beta_access_audit(created_at);

    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

function secureDatabaseFiles(dbPath) {
  for (const candidate of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    try {
      fs.chmodSync(candidate, 0o600);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function prepareStatements(db) {
  return {
    insertCode: db.prepare(`INSERT INTO beta_codes
      (id, code_hash, label, enabled, expires_at, max_uses, created_at, updated_at)
      VALUES (@id, @codeHash, @label, @enabled, @expiresAt, @maxUses, @createdAt, @updatedAt)`),
    selectCodeById: db.prepare('SELECT * FROM beta_codes WHERE id = ?'),
    selectCodeByHash: db.prepare('SELECT * FROM beta_codes WHERE code_hash = ?'),
    listCodes: db.prepare(`SELECT id, label, enabled, expires_at, max_uses, used_count,
      session_version, revoked_at, last_used_at, created_at, updated_at
      FROM beta_codes ORDER BY created_at ASC`),
    updateCode: db.prepare(`UPDATE beta_codes SET label=@label, expires_at=@expiresAt,
      max_uses=@maxUses, updated_at=@updatedAt WHERE id=@id`),
    setEnabled: db.prepare(`UPDATE beta_codes SET enabled=@enabled,
      session_version=session_version + @versionIncrement, updated_at=@updatedAt WHERE id=@id`),
    revokeCode: db.prepare(`UPDATE beta_codes SET enabled=0, revoked_at=@revokedAt,
      session_version=session_version + 1, updated_at=@updatedAt WHERE id=@id`),
    consumeUse: db.prepare(`UPDATE beta_codes SET used_count=used_count + 1,
      last_used_at=@now, updated_at=@now WHERE id=@id AND used_count < max_uses`),
    insertSession: db.prepare(`INSERT INTO beta_sessions
      (token_hash, code_id, scope, session_version, expires_at, created_at)
      VALUES (@tokenHash, @codeId, @scope, @sessionVersion, @expiresAt, @createdAt)`),
    selectValidSession: db.prepare(`SELECT s.code_id, s.session_version, s.expires_at AS session_expires_at
      FROM beta_sessions s JOIN beta_codes c ON c.id=s.code_id
      WHERE s.token_hash=@tokenHash AND s.scope=@scope AND s.revoked_at IS NULL
        AND s.expires_at>@now AND c.enabled=1 AND c.revoked_at IS NULL
        AND c.expires_at>@now AND c.session_version=s.session_version`),
    selectCounter: db.prepare(`SELECT count FROM beta_verify_counters
      WHERE scope=@scope AND subject_hash=@subjectHash AND bucket=@bucket`),
    upsertCounter: db.prepare(`INSERT INTO beta_verify_counters
      (scope, subject_hash, bucket, count, updated_at) VALUES (@scope, @subjectHash, @bucket, 1, @updatedAt)
      ON CONFLICT(scope, subject_hash, bucket) DO UPDATE SET count=count+1, updated_at=excluded.updated_at`),
    selectCooldown: db.prepare('SELECT until_at FROM beta_verify_cooldowns WHERE ip_hash = ?'),
    upsertCooldown: db.prepare(`INSERT INTO beta_verify_cooldowns (ip_hash, until_at, updated_at)
      VALUES (@ipHash, @untilAt, @updatedAt) ON CONFLICT(ip_hash) DO UPDATE SET
      until_at=excluded.until_at, updated_at=excluded.updated_at`),
    deleteCooldown: db.prepare('DELETE FROM beta_verify_cooldowns WHERE ip_hash = ?'),
    insertAudit: db.prepare(`INSERT INTO beta_access_audit
      (id, identity_id, subject_hash, event, status, created_at)
      VALUES (@id, @identityId, @subjectHash, @event, @status, @createdAt)`),
    deleteExpiredSessions: db.prepare('DELETE FROM beta_sessions WHERE expires_at <= ?'),
    deleteExpiredCooldowns: db.prepare('DELETE FROM beta_verify_cooldowns WHERE until_at <= ?'),
    deleteOldCounters: db.prepare('DELETE FROM beta_verify_counters WHERE updated_at <= ?'),
    deleteOldAudit: db.prepare('DELETE FROM beta_access_audit WHERE created_at <= ?')
  };
}

function issueSessionsTransaction(statements, input, nowFn) {
  const timestamp = toMillis(input.now || nowFn());
  const code = statements.selectCodeByHash.get(input.codeHash);
  if (!code) return { ok: false, reason: 'not_found' };
  if (!code.enabled || code.revoked_at != null) return { ok: false, reason: 'disabled' };
  if (code.expires_at <= timestamp) return { ok: false, reason: 'expired' };
  if (code.used_count >= code.max_uses) return { ok: false, reason: 'exhausted' };
  const consumed = statements.consumeUse.run({ id: code.id, now: timestamp });
  if (consumed.changes !== 1) return { ok: false, reason: 'exhausted' };

  for (const session of input.sessions) {
    statements.insertSession.run({
      tokenHash: session.tokenHash,
      codeId: code.id,
      scope: session.scope,
      sessionVersion: code.session_version,
      expiresAt: toMillis(session.expiresAt),
      createdAt: timestamp
    });
  }
  return {
    ok: true,
    identityId: code.id,
    sessionVersion: code.session_version,
    usedCount: code.used_count + 1,
    maxUses: code.max_uses
  };
}

function acquirePermitTransaction(statements, input, nowFn) {
  const timestamp = toMillis(input.now || nowFn());
  const cooldown = statements.selectCooldown.get(input.ipHash);
  if (cooldown?.until_at > timestamp) return { allowed: false, reason: 'cooldown' };

  const limits = input.limits;
  const day = new Date(timestamp).toISOString().slice(0, 10);
  const window = String(Math.floor(timestamp / limits.windowMs));
  const counters = [
    ['ip_window', input.ipHash, window, limits.ipWindowLimit],
    ['ip_day', input.ipHash, day, limits.ipDailyLimit],
    ['global_window', 'global', window, limits.globalWindowLimit],
    ['global_day', 'global', day, limits.globalDailyLimit]
  ].map(([scope, subjectHash, bucket, limit]) => ({ scope, subjectHash, bucket, limit }));

  for (const counter of counters) {
    const current = statements.selectCounter.get(counter)?.count || 0;
    if (current >= counter.limit) return { allowed: false, reason: counter.scope };
  }
  for (const counter of counters) {
    statements.upsertCounter.run({ ...counter, updatedAt: timestamp });
  }
  return { allowed: true };
}

function sanitizeCode(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    enabled: Boolean(row.enabled),
    expiresAt: new Date(row.expires_at).toISOString(),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    sessionVersion: row.session_version,
    revokedAt: row.revoked_at == null ? null : new Date(row.revoked_at).toISOString(),
    lastUsedAt: row.last_used_at == null ? null : new Date(row.last_used_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function assertRegularDatabasePath(dbPath) {
  try {
    const stat = fs.lstatSync(dbPath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('BETA_ACCESS_DB_MUST_BE_REGULAR_FILE');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`BETA_ACCESS_INVALID_${name.toUpperCase()}`);
  return number;
}

function toMillis(value) {
  const millis = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(millis)) throw new Error('BETA_ACCESS_INVALID_DATE');
  return millis;
}

function runBusyRetry(operation, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      if (!String(error?.code || '').startsWith('SQLITE_BUSY') || attempt === maxAttempts) throw error;
      const wait = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(wait, 0, 0, attempt * 10);
    }
  }
  throw new Error('BETA_ACCESS_SQLITE_BUSY');
}
