/**
 * 칸반 읽기 라우트 5종 (/api/kanban/*) — 폐기 예정 FastAPI(web.py)의 REST를 Express로 포팅.
 *   GET /teams, /board/:teamId, /tasks/:taskId, /team-status/:teamId, /available
 * 응답 스키마는 client types/kanban.ts와 1:1, datetime은 UTC Z suffix 유지. 읽기 전용.
 */

import { Router } from 'express';
import { available } from '../services/kanbanDb.js';
import { getTeams, getBoard, getTaskDetail, getTeamStatus } from '../services/kanbanQueries.js';

const router = Router();

const p2 = (n) => String(n).padStart(2, '0');

/** db.py UTCJSONResponse와 동일: datetime → 'YYYY-MM-DDTHH:MM:SSZ' (밀리초 없음). */
function formatZ(d) {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T` +
    `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}Z`;
}

/** Date 값(PG 드라이버 반환)을 Z suffix 문자열로 직렬화해 응답. SQLite는 이미 문자열이라 무영향. */
function sendUtc(res, data) {
  const body = JSON.stringify(data, function (key, value) {
    return this[key] instanceof Date ? formatZ(this[key]) : value;
  });
  res.type('application/json').send(body);
}

// 라우트 핸들러의 예외는 index.js의 전역 에러 핸들러(500)로 위임.

router.get('/available', async (req, res, next) => {
  try {
    res.json({ available: await available() });
  } catch (err) { next(err); }
});

router.get('/teams', async (req, res, next) => {
  try {
    sendUtc(res, await getTeams());
  } catch (err) { next(err); }
});

router.get('/board/:teamId', async (req, res, next) => {
  try {
    const board = await getBoard(req.params.teamId);
    if (!board) return res.status(404).json({ error: 'not found' });
    sendUtc(res, board);
  } catch (err) { next(err); }
});

router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const detail = await getTaskDetail(req.params.taskId);
    if (!detail) return res.status(404).json({ error: 'not found' });
    sendUtc(res, detail);
  } catch (err) { next(err); }
});

router.get('/team-status/:teamId', async (req, res, next) => {
  try {
    const status = await getTeamStatus(req.params.teamId, req.query.activity_hours ?? 24);
    if (!status) return res.status(404).json({ error: 'not found' });
    sendUtc(res, status);
  } catch (err) { next(err); }
});

export default router;
