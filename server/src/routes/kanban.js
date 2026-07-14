/**
 * 칸반 읽기 라우트 (/api/kanban/*) — 읽기 전용.
 *   GET /available, /projects, /plans/:projectId, /plan/:planId,
 *       /board/:projectId, /tasks/:taskId, /project-status/:projectId
 */

import { Router } from 'express';
import { available } from '../services/kanbanDb.js';
import {
  getProjects, listPlans, getPlan,
  getBoard, getTaskDetail, getProjectStatus,
} from '../services/kanbanQueries.js';

const router = Router();

const p2 = (n) => String(n).padStart(2, '0');

function formatZ(d) {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T` +
    `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}Z`;
}

function sendUtc(res, data) {
  const body = JSON.stringify(data, function (key, value) {
    return this[key] instanceof Date ? formatZ(this[key]) : value;
  });
  res.type('application/json').send(body);
}

router.get('/available', async (req, res, next) => {
  try {
    res.json({ available: await available() });
  } catch (err) { next(err); }
});

router.get('/projects', async (req, res, next) => {
  try {
    sendUtc(res, await getProjects());
  } catch (err) { next(err); }
});

router.get('/plans/:projectId', async (req, res, next) => {
  try {
    const data = await listPlans(req.params.projectId);
    if (!data) return res.status(404).json({ error: 'not found' });
    sendUtc(res, data);
  } catch (err) { next(err); }
});

router.get('/plan/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId);
    if (!plan) return res.status(404).json({ error: 'not found' });
    sendUtc(res, plan);
  } catch (err) { next(err); }
});

router.get('/board/:projectId', async (req, res, next) => {
  try {
    const board = await getBoard(req.params.projectId);
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

router.get('/project-status/:projectId', async (req, res, next) => {
  try {
    const status = await getProjectStatus(req.params.projectId, req.query.activity_hours ?? 24);
    if (!status) return res.status(404).json({ error: 'not found' });
    sendUtc(res, status);
  } catch (err) { next(err); }
});

export default router;
