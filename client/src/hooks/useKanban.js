/**
 * 칸반 데이터 훅. 폴링·fail-closed 동작.
 * API 계약은 server/src/routes/kanban.js와 1:1.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SYSTEM_NOTE_TYPE } from '../constants/kanban';

const API_BASE = '/api/kanban';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

/** DB 도달 가능 여부 1회 조회. 실패 시 fail-closed. */
export function useKanbanAvailable() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${API_BASE}/available`)
      .then((r) => setAvailable(Boolean(r.available)))
      .catch(() => setAvailable(false))
      .finally(() => setLoading(false));
  }, []);

  return { available, loading };
}

/** 프로젝트 목록 조회. */
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${API_BASE}/projects`)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}

/** 프로젝트의 플랜 목록 (폴링). */
export function usePlans(projectId, intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!projectId) return;
    fetchJson(`${API_BASE}/plans/${projectId}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, loading, refresh };
}

/** 보드 데이터 (폴링). */
export function useBoard(projectId, intervalMs = 15000) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!projectId) return;
    fetchJson(`${API_BASE}/board/${projectId}`)
      .then(setBoard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { board, loading, refresh };
}

/** 태스크 상세 (폴링). 노트를 system/그 외로 분리. */
export function useTaskDetail(taskId, intervalMs = 10000) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) { setTask(null); return; }
    setLoading(true);
    fetchJson(`${API_BASE}/tasks/${taskId}`)
      .then(setTask)
      .catch(console.error)
      .finally(() => setLoading(false));

    const timer = setInterval(() => {
      fetchJson(`${API_BASE}/tasks/${taskId}`)
        .then(setTask)
        .catch(console.error);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [taskId, intervalMs]);

  const activityNotes = useMemo(
    () => task?.notes.filter((n) => n.note_type !== SYSTEM_NOTE_TYPE) ?? [],
    [task],
  );
  const historyNotes = useMemo(
    () => task?.notes.filter((n) => n.note_type === SYSTEM_NOTE_TYPE) ?? [],
    [task],
  );

  return { task, activityNotes, historyNotes, loading };
}

/** 프로젝트 상태 (블로커, 최근 활동). */
export function useProjectStatus(projectId, intervalMs = 15000) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const load = () => {
      fetchJson(`${API_BASE}/project-status/${projectId}`)
        .then(setStatus)
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [projectId, intervalMs]);

  return { status, loading };
}
