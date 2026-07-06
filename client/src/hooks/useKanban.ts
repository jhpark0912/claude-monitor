import { useState, useEffect, useCallback } from 'react';
import type { Team, BoardData, TaskDetail, TeamStatus } from '../types/kanban';

const API_BASE = '/api/kanban';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

/**
 * SPEC §2.2 게이트: /api/kanban/available 1회 조회. 조회 실패(네트워크·서버 미기동)는
 * fail-closed로 available:false 처리 → 칸반 UI 미노출. loading 중엔 확정 전이라 탭/라우트 미렌더.
 */
export function useKanbanAvailable() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ available: boolean }>(`${API_BASE}/available`)
      .then((r) => setAvailable(Boolean(r.available)))
      .catch(() => setAvailable(false))
      .finally(() => setLoading(false));
  }, []);

  return { available, loading };
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<Team[]>(`${API_BASE}/teams`)
      .then(setTeams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { teams, loading };
}

export function useBoard(teamId: string | null, intervalMs = 15000) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!teamId) return;
    fetchJson<BoardData>(`${API_BASE}/board/${teamId}`)
      .then(setBoard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { board, loading, refresh };
}

export function useTaskDetail(taskId: string | null, intervalMs = 10000) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    setLoading(true);
    fetchJson<TaskDetail>(`${API_BASE}/tasks/${taskId}`)
      .then(setTask)
      .catch(console.error)
      .finally(() => setLoading(false));

    const timer = setInterval(() => {
      fetchJson<TaskDetail>(`${API_BASE}/tasks/${taskId}`)
        .then(setTask)
        .catch(console.error);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [taskId, intervalMs]);

  return { task, loading };
}

export function useTeamStatus(teamId: string | null, intervalMs = 15000) {
  const [status, setStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);

    const load = () => {
      fetchJson<TeamStatus>(`${API_BASE}/team-status/${teamId}`)
        .then(setStatus)
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [teamId, intervalMs]);

  return { status, loading };
}
