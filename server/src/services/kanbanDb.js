/**
 * 칸반 DB 리더 서비스 — SQLite(로컬) / PostgreSQL(Supabase) 듀얼 모드 (읽기 전용).
 *
 * agent-kanban-server의 db.py 듀얼모드 로직을 Node로 미러링한다.
 *   - KANBAN_DB_HOST 미설정 → 로컬 SQLite (기본값)
 *   - KANBAN_DB_HOST 설정   → PostgreSQL / Supabase (클라우드 공유)
 *
 * 목적은 단일 사용자의 다기기 동기화이므로 인증/RLS는 없다. 쓰기도 없다(readonly).
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 설정 (db.py와 동일 기준) ────────────────────────────────────────────────

/** KANBAN_DB_HOST 설정 여부로 PG/SQLite 분기 (db.py `_use_pg()`와 동일). */
export function isPg() {
  return Boolean(process.env.KANBAN_DB_HOST);
}

function pgConfig() {
  return {
    host: process.env.KANBAN_DB_HOST || '',
    port: parseInt(process.env.KANBAN_DB_PORT || '5432', 10),
    user: process.env.KANBAN_DB_USER || 'ai_board_user',
    password: process.env.KANBAN_DB_PASSWORD || '',
    database: process.env.KANBAN_DB_NAME || 'ai_board',
    // 세션 레벨 읽기 전용 강제
    options: '-c default_transaction_read_only=on',
    // Supabase는 TLS 필요. 자체서명 체인 허용(단일사용자 동기화 용도).
    ssl: { rejectUnauthorized: false },
  };
}

/**
 * SQLite DB 경로 탐지 (db.py SQLITE_PATH와 동일 기준).
 * KANBAN_DB_PATH 우선, 없으면 00.claude-team-mcp/agent-kanban-server/kanban.db.
 */
function sqlitePath() {
  if (process.env.KANBAN_DB_PATH) return process.env.KANBAN_DB_PATH;
  // server/src/services → 05.session_board → 0.STUDY → 00.claude-team-mcp/...
  return resolve(
    __dirname,
    '../../../../00.claude-team-mcp/agent-kanban-server/kanban.db',
  );
}

// ── 커넥션 (싱글턴, lazy) ────────────────────────────────────────────────────

let _pgPool = null;
let _sqliteDb = null;

async function getPgPool() {
  if (_pgPool === null) {
    const pg = await import('pg');
    _pgPool = new pg.default.Pool({ max: 5, ...pgConfig() });
  }
  return _pgPool;
}

async function getSqliteDb() {
  if (_sqliteDb === null) {
    const { default: Database } = await import('better-sqlite3');
    _sqliteDb = new Database(sqlitePath(), { readonly: true, fileMustExist: true });
  }
  return _sqliteDb;
}

// ── 쿼리 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * canonical '?' 플레이스홀더 SQL을 PG '$n' 형태로 변환.
 * (db.py `_exec`가 '%s'를 드라이버별로 처리하는 것과 동일 역할)
 */
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * 읽기 전용 쿼리 실행. 드라이버 차이를 흡수해 plain 객체 배열을 반환한다.
 * @param {string} sql   '?' 플레이스홀더 사용
 * @param {Array}  params
 * @returns {Promise<Array<object>>}
 */
export async function query(sql, params = []) {
  if (isPg()) {
    const pool = await getPgPool();
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows;
  }
  const db = await getSqliteDb();
  return db.prepare(sql).all(...params);
}

// ── 도달 감지 ────────────────────────────────────────────────────────────────

/**
 * 칸반 DB 도달 가능 여부.
 *   - PG 모드: env(host)가 있고 `SELECT 1`이 성공하면 true
 *   - SQLite 모드: 대상 .db 파일이 실제로 존재하면 true
 * 실패/예외는 전부 false(fail-closed) — 조건부 탭 노출의 기준.
 * @returns {Promise<boolean>}
 */
export async function available() {
  try {
    if (isPg()) {
      if (!process.env.KANBAN_DB_HOST) return false;
      const pool = await getPgPool();
      await pool.query('SELECT 1');
      return true;
    }
    return existsSync(sqlitePath());
  } catch {
    return false;
  }
}

/** 커넥션 정리 (프로세스 종료 시). */
export async function closeAll() {
  if (_pgPool) {
    await _pgPool.end();
    _pgPool = null;
  }
  if (_sqliteDb) {
    _sqliteDb.close();
    _sqliteDb = null;
  }
}
