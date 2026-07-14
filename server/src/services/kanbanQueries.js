/**
 * 칸반 읽기 쿼리 — agent-kanban-server db.py의 쿼리를 Node로 미러링.
 * 드라이버 분기는 kanbanDb.query()가 담당. 읽기 전용.
 *
 * Phase 1 스키마: projects / plans / tasks / notes (agents 테이블 제거됨).
 */

import { query, isPg } from './kanbanDb.js';

export const ALL_STATUSES = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done', 'Rejected'];

// ── Project ──────────────────────────────────────────────────────────────

async function getProject(projectId) {
  const rows = await query('SELECT * FROM projects WHERE id=?', [projectId]);
  return rows[0] ?? null;
}

export async function getProjects() {
  const projects = await query('SELECT id, name, created_at FROM projects ORDER BY created_at ASC');
  if (!projects.length) return projects;

  const planStates = await getProjectPlanStates();
  const inProgRows = await query(
    "SELECT project_id, COUNT(*) AS cnt FROM tasks WHERE status='InProgress' GROUP BY project_id",
  );
  const inProgMap = {};
  for (const r of inProgRows) inProgMap[r.project_id] = Number(r.cnt);

  return projects.map((p) => ({
    ...p,
    status: deriveProjectStatus(planStates[p.id]),
    in_progress_count: inProgMap[p.id] ?? 0,
  }));
}

// 프로젝트별 소속 플랜들의 derived_state 목록을 반환 (project_id -> string[])
async function getProjectPlanStates() {
  const plans = await query('SELECT id, project_id FROM plans');
  if (!plans.length) return {};

  const blockedVal = isPg() ? true : 1;
  const statRows = await query(
    `SELECT plan_id, status, COUNT(*) AS cnt,
            SUM(CASE WHEN is_blocked=? THEN 1 ELSE 0 END) AS blk
     FROM tasks
     GROUP BY plan_id, status`,
    [blockedVal],
  );
  const stats = {};
  for (const r of statRows) {
    const s = stats[r.plan_id] ??= { counts: {}, blocked: 0 };
    s.counts[r.status] = Number(r.cnt);
    s.blocked += Number(r.blk) || 0;
  }

  const byProject = {};
  for (const p of plans) {
    const st = stats[p.id] ?? { counts: {}, blocked: 0 };
    const state = derivePlanState(st.counts, st.blocked);
    (byProject[p.project_id] ??= []).push(state);
  }
  return byProject;
}

// 플랜 상태 목록을 프로젝트 단위 status(active/blocked/planned/completed/empty)로 집계
function deriveProjectStatus(states) {
  if (!states || states.length === 0) return 'empty';
  if (states.includes('blocked')) return 'blocked';
  if (states.includes('active')) return 'active';
  if (states.every((s) => s === 'completed')) return 'completed';
  return 'planned';
}

// ── Plans ─────────────────────────────────────────────────────────────────

function derivePlanState(counts, blocked) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 'planned';
  if (blocked > 0) return 'blocked';
  const done = (counts.Done ?? 0) + (counts.Rejected ?? 0);
  if (done === total) return 'completed';
  if ((counts.InProgress ?? 0) > 0 || (counts.Review ?? 0) > 0) return 'active';
  return 'planned';
}

export async function listPlans(projectId) {
  const project = await getProject(projectId);
  if (!project) return null;


  const planRows = await query(
    'SELECT * FROM plans WHERE project_id=? ORDER BY created_at ASC', [projectId],
  );

  const blockedVal = isPg() ? true : 1;
  const statRows = await query(
    `SELECT plan_id, status, COUNT(*) AS cnt,
            SUM(CASE WHEN is_blocked=? THEN 1 ELSE 0 END) AS blk
     FROM tasks
     WHERE plan_id IN (SELECT id FROM plans WHERE project_id=?)
     GROUP BY plan_id, status`,
    [blockedVal, projectId],
  );

  const stats = {};
  for (const r of statRows) {
    const s = stats[r.plan_id] ??= { counts: {}, blocked: 0 };
    s.counts[r.status] = Number(r.cnt);
    s.blocked += Number(r.blk) || 0;
  }

  const plans = planRows.map((p) => {
    const st = stats[p.id] ?? { counts: {}, blocked: 0 };
    const total = Object.values(st.counts).reduce((a, b) => a + b, 0);
    const done = (st.counts.Done ?? 0) + (st.counts.Rejected ?? 0);
    return {
      id: p.id, title: p.title, goal: p.goal,
      scope_in: p.scope_in, scope_out: p.scope_out,
      derived_state: derivePlanState(st.counts, st.blocked),
      counts: st.counts, task_total: total, task_done: done,
      started_at: p.started_at, completed_at: p.completed_at,
      archived_at: p.archived_at, cancelled_at: p.cancelled_at,
      on_hold_at: p.on_hold_at, created_at: p.created_at,
    };
  });

  return { project_id: projectId, project_name: project.name, plans };
}

export async function getPlan(planId) {
  const rows = await query('SELECT * FROM plans WHERE id=?', [planId]);
  const plan = rows[0];
  if (!plan) return null;

  const blockedVal = isPg() ? true : 1;
  const statRows = await query(
    `SELECT status, COUNT(*) AS cnt,
            SUM(CASE WHEN is_blocked=? THEN 1 ELSE 0 END) AS blk
     FROM tasks WHERE plan_id=? GROUP BY status`,
    [blockedVal, planId],
  );
  const counts = {};
  let blocked = 0;
  for (const r of statRows) {
    counts[r.status] = Number(r.cnt);
    blocked += Number(r.blk) || 0;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const done = (counts.Done ?? 0) + (counts.Rejected ?? 0);

  const taskRows = await query(
    `SELECT id, title, status, priority, position, is_blocked
     FROM tasks WHERE plan_id=? ORDER BY position ASC, created_at ASC`,
    [planId],
  );
  const tasks = taskRows.map((t) => ({
    id: t.id, title: t.title, status: t.status,
    priority: t.priority, position: t.position,
    is_blocked: Boolean(t.is_blocked),
  }));

  return {
    id: plan.id, project_id: plan.project_id, title: plan.title,
    goal: plan.goal, scope_in: plan.scope_in, scope_out: plan.scope_out,
    derived_state: derivePlanState(counts, blocked),
    counts, task_total: total, task_done: done,
    started_at: plan.started_at, completed_at: plan.completed_at,
    archived_at: plan.archived_at, cancelled_at: plan.cancelled_at,
    on_hold_at: plan.on_hold_at, created_at: plan.created_at,
    tasks,
  };
}

// ── Board ─────────────────────────────────────────────────────────────────

export async function getBoard(projectId) {
  const project = await getProject(projectId);
  if (!project) return null;

  const board = {};
  const counts = {};
  for (const s of ALL_STATUSES) { board[s] = []; counts[s] = 0; }

  const sql = `
    SELECT t.id, t.title, t.status, t.priority, t.is_blocked, t.version, t.plan_id,
           (SELECT n.content FROM notes n
            WHERE n.task_id = t.id AND n.note_type != 'system'
            ORDER BY n.created_at DESC LIMIT 1) AS latest_note
    FROM tasks t
    WHERE t.project_id = ?
    ORDER BY t.priority DESC, t.created_at ASC
  `;
  for (const r of await query(sql, [projectId])) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    const entry = {
      id: r.id, title: r.title, priority: r.priority,
      is_blocked: Boolean(r.is_blocked), version: r.version,
      plan_id: r.plan_id ?? null,
    };
    if (r.latest_note) entry.latest_note = r.latest_note;
    (board[r.status] ??= []).push(entry);
  }

  const config = project.config ? JSON.parse(project.config) : {};
  const wipLimits = config.wip_limits ?? {};
  const wip_status = {};
  for (const [s, limit] of Object.entries(wipLimits)) {
    wip_status[s] = `${counts[s] ?? 0}/${limit}`;
  }

  return { project: project.name, counts, board, wip_status, updated_at: nowZ() };
}

// ── Task Detail ──────────────────────────────────────────────────────────

export async function getTaskDetail(taskId) {
  const detailSql = `
    SELECT t.*, p.id AS project_pk, p.name AS project_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `;
  const task = (await query(detailSql, [taskId]))[0];
  if (!task) return null;

  const notesSql = `
    SELECT n.id, n.content, n.note_type, n.created_at
    FROM notes n
    WHERE n.task_id = ?
    ORDER BY n.created_at ASC
  `;
  const notes = (await query(notesSql, [taskId])).map((n) => ({
    id: n.id, content: n.content,
    note_type: n.note_type, created_at: n.created_at,
  }));

  return {
    id: task.id, title: task.title, description: task.description,
    status: task.status, priority: task.priority,
    is_blocked: Boolean(task.is_blocked), blocker_reason: task.blocker_reason,
    version: task.version,
    project: { id: task.project_pk, name: task.project_name },
    notes, created_at: task.created_at, updated_at: task.updated_at,
  };
}

// ── Project Status ───────────────────────────────────────────────────────

export async function getProjectStatus(projectId, activityHours = 24) {
  const project = await getProject(projectId);
  if (!project) return null;

  // 1) 상태별 카운트
  const summary = {};
  for (const s of ALL_STATUSES) summary[s] = 0;
  for (const r of await query('SELECT status, COUNT(*) as cnt FROM tasks WHERE project_id=? GROUP BY status', [projectId])) {
    summary[r.status] = Number(r.cnt);
  }

  // 2) 블로커
  const blockedVal = isPg() ? true : 1;
  const blockers = (await query(
    `SELECT t.id, t.title, t.blocker_reason
     FROM tasks t WHERE t.project_id=? AND t.is_blocked=?`,
    [projectId, blockedVal],
  )).map((b) => ({
    task_id: b.id, title: b.title, reason: b.blocker_reason,
  }));

  // 3) 최근 활동
  const hrs = Number.isFinite(+activityHours) ? Math.trunc(+activityHours) : 24;
  const timeSql = isPg()
    ? `SELECT n.content, n.created_at, t.title AS task_title
       FROM notes n JOIN tasks t ON n.task_id = t.id
       WHERE t.project_id=? AND n.note_type='system'
       AND n.created_at >= NOW() - INTERVAL '${hrs} hours'
       ORDER BY n.created_at DESC LIMIT 20`
    : `SELECT n.content, n.created_at, t.title AS task_title
       FROM notes n JOIN tasks t ON n.task_id = t.id
       WHERE t.project_id=? AND n.note_type='system'
       AND n.created_at >= datetime('now', '-${hrs} hours')
       ORDER BY n.created_at DESC LIMIT 20`;
  const recent_activity = (await query(timeSql, [projectId])).map((rn) => ({
    action: String(rn.content).includes('Status changed') ? 'status_change' : 'update',
    task: rn.task_title, detail: rn.content, at: rn.created_at,
  }));

  return { project: project.name, summary, blockers, recent_activity };
}

function nowZ() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
