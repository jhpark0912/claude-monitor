/**
 * 칸반 읽기 쿼리 — agent-kanban-server db.py의 get_board/get_task_detail/get_team_status를
 * Node로 미러링한다. 저수준 드라이버 분기는 kanbanDb.query()가 담당하고,
 * 여기서는 SQL·응답 스키마(types/kanban.ts와 1:1)를 재현한다. 읽기 전용.
 */

import { query, isPg } from './kanbanDb.js';

/** models.py ALL_STATUSES와 동일 순서 (board/counts/summary 키 순서 보존). */
export const ALL_STATUSES = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done', 'Rejected'];

/** 팀 단건 조회. 없으면 null (라우트에서 404 처리). */
export async function getTeam(teamId) {
  const rows = await query('SELECT * FROM teams WHERE id=?', [teamId]);
  return rows[0] ?? null;
}

/** 모든 팀 목록 (web.py /api/teams와 동일: created_at ASC). */
export async function getTeams() {
  return query('SELECT id, name, created_at FROM teams ORDER BY created_at ASC');
}

/** 칸반보드 상태별 작업 목록 (db.py get_board 재현). */
export async function getBoard(teamId) {
  const team = await getTeam(teamId);
  if (!team) return null;

  const board = {};
  const counts = {};
  for (const s of ALL_STATUSES) {
    board[s] = [];
    counts[s] = 0;
  }

  const sql = `
    SELECT t.id, t.title, t.status, t.priority, t.is_blocked, t.version,
           a.name AS agent_name, a.role AS agent_role,
           (SELECT n.content FROM notes n
            WHERE n.task_id = t.id AND n.note_type != 'system'
            ORDER BY n.created_at DESC LIMIT 1) AS latest_note
    FROM tasks t
    LEFT JOIN agents a ON t.assignee_id = a.id
    WHERE t.team_id = ?
    ORDER BY t.priority DESC, t.created_at ASC
  `;
  const rows = await query(sql, [teamId]);

  for (const r of rows) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    const assigned_to = r.agent_name ? `${r.agent_name} (${r.agent_role})` : null;
    const entry = {
      id: r.id, title: r.title, priority: r.priority,
      assigned_to, is_blocked: Boolean(r.is_blocked), version: r.version,
    };
    if (r.latest_note) entry.latest_note = r.latest_note;
    (board[r.status] ??= []).push(entry);
  }

  const config = team.config ? JSON.parse(team.config) : {};
  const wipLimits = config.wip_limits ?? {};
  const wip_status = {};
  for (const [s, limit] of Object.entries(wipLimits)) {
    wip_status[s] = `${counts[s] ?? 0}/${limit}`;
  }

  return { team: team.name, counts, board, wip_status, updated_at: nowZ() };
}

/** 작업 상세 (노트 포함) — db.py get_task_detail 재현. 없으면 null. */
export async function getTaskDetail(taskId) {
  const detailSql = `
    SELECT t.*, tm.id AS team_pk, tm.name AS team_name,
           a.id AS agent_pk, a.name AS agent_name, a.role AS agent_role
    FROM tasks t
    JOIN teams tm ON t.team_id = tm.id
    LEFT JOIN agents a ON t.assignee_id = a.id
    WHERE t.id = ?
  `;
  const task = (await query(detailSql, [taskId]))[0];
  if (!task) return null;

  const assigned_to = task.agent_pk
    ? { id: task.agent_pk, name: task.agent_name, role: task.agent_role }
    : null;

  const notesSql = `
    SELECT n.id, n.content, n.note_type, n.created_at, n.agent_id,
           ag.name AS agent_name, ag.role AS agent_role
    FROM notes n
    LEFT JOIN agents ag ON n.agent_id = ag.id
    WHERE n.task_id = ?
    ORDER BY n.created_at ASC
  `;
  const notes = (await query(notesSql, [taskId])).map((n) => {
    let agent;
    if (n.agent_name) agent = `${n.agent_name} (${n.agent_role})`;
    else if (n.agent_id === 'system') agent = 'system';
    else agent = n.agent_id;
    return {
      id: n.id, agent, content: n.content,
      note_type: n.note_type, created_at: n.created_at,
    };
  });

  return {
    id: task.id, title: task.title, description: task.description,
    status: task.status, priority: task.priority,
    is_blocked: Boolean(task.is_blocked), blocker_reason: task.blocker_reason,
    version: task.version, assigned_to,
    team: { id: task.team_pk, name: task.team_name }, notes,
    created_at: task.created_at, updated_at: task.updated_at,
  };
}

/** 팀 통계·워크로드·블로커·최근활동 — db.py get_team_status 재현. 없으면 null. */
export async function getTeamStatus(teamId, activityHours = 24) {
  const team = await getTeam(teamId);
  if (!team) return null;

  // 1) 상태별 카운트
  const summary = {};
  for (const s of ALL_STATUSES) summary[s] = 0;
  for (const r of await query('SELECT status, COUNT(*) as cnt FROM tasks WHERE team_id=? GROUP BY status', [teamId])) {
    summary[r.status] = Number(r.cnt);
  }

  // 2) 에이전트별 워크로드
  const agentsSql = `
    SELECT a.name, a.role,
           COALESCE(SUM(CASE WHEN t.status = 'InProgress' THEN 1 ELSE 0 END), 0) AS in_progress,
           COUNT(t.id) AS total
    FROM agents a
    LEFT JOIN tasks t ON t.assignee_id = a.id
    WHERE a.team_id = ?
    GROUP BY a.id, a.name, a.role
  `;
  const agents = (await query(agentsSql, [teamId])).map((a) => ({
    name: a.name, role: a.role,
    in_progress: Number(a.in_progress), total: Number(a.total),
  }));

  // 3) 블로커 (SQLite는 1, PG는 true 바인딩)
  const blockerSql = `
    SELECT t.id, t.title, t.blocker_reason,
           a.name AS agent_name, a.role AS agent_role
    FROM tasks t
    LEFT JOIN agents a ON t.assignee_id = a.id
    WHERE t.team_id = ? AND t.is_blocked = ?
  `;
  const blockedVal = isPg() ? true : 1;
  const blockers = (await query(blockerSql, [teamId, blockedVal])).map((b) => ({
    task_id: b.id, title: b.title, reason: b.blocker_reason,
    assigned_to: b.agent_name ? `${b.agent_name} (${b.agent_role})` : null,
  }));

  // 4) 최근 활동 (activityHours는 내부 정수 — 안전하게 정수화 후 인라인)
  const hrs = Number.isFinite(+activityHours) ? Math.trunc(+activityHours) : 24;
  const timeSql = isPg()
    ? `SELECT n.content, n.agent_id, n.created_at, t.title AS task_title, a.name AS agent_name
       FROM notes n JOIN tasks t ON n.task_id = t.id LEFT JOIN agents a ON n.agent_id = a.id
       WHERE t.team_id=? AND n.note_type='system'
       AND n.created_at >= NOW() - INTERVAL '${hrs} hours'
       ORDER BY n.created_at DESC LIMIT 20`
    : `SELECT n.content, n.agent_id, n.created_at, t.title AS task_title, a.name AS agent_name
       FROM notes n JOIN tasks t ON n.task_id = t.id LEFT JOIN agents a ON n.agent_id = a.id
       WHERE t.team_id=? AND n.note_type='system'
       AND n.created_at >= datetime('now', '-${hrs} hours')
       ORDER BY n.created_at DESC LIMIT 20`;
  const recent_activity = (await query(timeSql, [teamId])).map((rn) => ({
    agent: rn.agent_name ? rn.agent_name : (rn.agent_id === 'system' ? 'system' : rn.agent_id),
    action: String(rn.content).includes('Status changed') ? 'status_change' : 'update',
    task: rn.task_title, detail: rn.content, at: rn.created_at,
  }));

  return { team: team.name, summary, agents, blockers, recent_activity };
}

/** db.py _now()와 동일: 현재 UTC를 'YYYY-MM-DDTHH:MM:SSZ'로. */
function nowZ() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
