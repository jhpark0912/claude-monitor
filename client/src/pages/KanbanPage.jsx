import { useState, useMemo } from 'react';
import { useProjects, usePlans, useBoard, useProjectStatus } from '../hooks/useKanban';
import {
  PLAN_STATE_CONFIG, PLAN_STATE_ORDER, STATUS_DONE, STATUS_REJECTED,
  RETRO_PREFIX, LESSONS_PREFIX, UNCLASSIFIED_PLAN_ID, derivePlanState,
} from '../constants/kanban';
import ProjectSelect from '../components/kanban/ProjectSelect';
import PlanSection from '../components/kanban/PlanSection';
import ActivityFeed from '../components/kanban/ActivityFeed';
import TaskDetailModal from '../components/kanban/TaskDetailModal';

const STAT_PILL_KEYS = ['active', 'completed', 'planned'];

const statPillStyle = {
  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)',
  display: 'flex', alignItems: 'center', gap: 5,
};

export default function KanbanPage() {
  const { projects, loading: projLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null);
  const { data: plansData } = usePlans(activeProjectId);
  const { board } = useBoard(activeProjectId);
  const { status: projectStatus } = useProjectStatus(activeProjectId);

  const blockerCount = projectStatus?.blockers?.length ?? 0;

  const { sortedPlans, retroTasks, lessonsTasks, unclassifiedPlan, stateCounts } = useMemo(() => {
    const plans = plansData?.plans ?? [];
    const sc = {};
    for (const p of plans) sc[p.derived_state] = (sc[p.derived_state] ?? 0) + 1;

    const sorted = [...plans].sort((a, b) =>
      (PLAN_STATE_ORDER[a.derived_state] ?? 9) - (PLAN_STATE_ORDER[b.derived_state] ?? 9),
    );

    const retro = [];
    const lessons = [];
    const planIds = new Set(plans.map((p) => p.id));
    const uncCounts = {};
    let uncBlocked = 0;

    if (board) {
      for (const [status, tasks] of Object.entries(board.board)) {
        for (const t of tasks) {
          if (t.title.startsWith(RETRO_PREFIX)) retro.push(t);
          else if (t.title.startsWith(LESSONS_PREFIX)) lessons.push(t);
          else if (!t.plan_id || !planIds.has(t.plan_id)) {
            uncCounts[status] = (uncCounts[status] ?? 0) + 1;
            if (t.is_blocked) uncBlocked++;
          }
        }
      }
    }

    const uncTotal = Object.values(uncCounts).reduce((a, b) => a + b, 0);
    const uncDone = (uncCounts[STATUS_DONE] ?? 0) + (uncCounts[STATUS_REJECTED] ?? 0);
    const unc = uncTotal > 0 ? {
      id: UNCLASSIFIED_PLAN_ID, title: '미분류 태스크',
      goal: '', scope_in: '', scope_out: '',
      derived_state: derivePlanState(uncCounts, uncBlocked),
      counts: uncCounts, task_total: uncTotal, task_done: uncDone,
      started_at: null, completed_at: null,
      archived_at: null, cancelled_at: null, on_hold_at: null,
    } : null;

    return { sortedPlans: sorted, retroTasks: retro, lessonsTasks: lessons, unclassifiedPlan: unc, stateCounts: sc };
  }, [plansData, board]);

  // plan_id별 태스크 사전 그룹핑
  const tasksByPlan = useMemo(() => {
    if (!board) return {};
    const map = {};
    for (const [status, tasks] of Object.entries(board.board)) {
      for (const t of tasks) {
        if (t.title.startsWith(RETRO_PREFIX) || t.title.startsWith(LESSONS_PREFIX)) continue;
        const key = t.plan_id || UNCLASSIFIED_PLAN_ID;
        (map[key] ??= []).push({ ...t, status });
      }
    }
    return map;
  }, [board]);

  if (projLoading) return <CenterMsg text="로딩 중..." />;
  if (projects.length === 0) return <CenterMsg text="프로젝트가 없습니다." />;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 750, letterSpacing: '-.4px' }}>칸반</h1>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {STAT_PILL_KEYS.map((st) => {
                const cfg = PLAN_STATE_CONFIG[st];
                return (
                  <div key={st} style={statPillStyle}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                    {cfg.label} <span style={{ fontWeight: 750, color: 'var(--tx)' }}>{stateCounts[st] ?? 0}</span>
                  </div>
                );
              })}
              {blockerCount > 0 && (
                <div style={statPillStyle}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rd)' }} />
                  블로커 <span style={{ fontWeight: 750, color: 'var(--rd)' }}>{blockerCount}</span>
                </div>
              )}
            </div>
          </div>
          <ProjectSelect projects={projects} value={activeProjectId} onChange={setSelectedProjectId} />
        </div>

        {sortedPlans.map((plan) => (
          <PlanSection
            key={plan.id}
            plan={plan}
            tasks={tasksByPlan[plan.id] ?? []}
            defaultExpanded={plan.derived_state === 'active' || plan.derived_state === 'blocked'}
            onTaskClick={setSelectedTaskId}
          />
        ))}

        {unclassifiedPlan && (
          <PlanSection
            plan={unclassifiedPlan}
            tasks={tasksByPlan[UNCLASSIFIED_PLAN_ID] ?? []}
            defaultExpanded={sortedPlans.length === 0}
            onTaskClick={setSelectedTaskId}
          />
        )}

        {sortedPlans.length === 0 && !unclassifiedPlan && !board && (
          <CenterMsg text="데이터 로딩 중..." />
        )}

        <ActivityFeed activities={projectStatus?.recent_activity ?? []} />

        {(retroTasks.length > 0 || lessonsTasks.length > 0) && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px',
              fontSize: 11, fontWeight: 700, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: '.5px',
            }}>
              회고 & 교훈
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            </div>

            {retroTasks.map((t) => (
              <div key={t.id} onClick={() => setSelectedTaskId(t.id)} style={{
                padding: '12px 16px', background: 'var(--s1)', border: '1px solid var(--bd)',
                borderRadius: 10, marginBottom: 8, cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title.replace(RETRO_PREFIX + ' ', '')}</span>
              </div>
            ))}

            {lessonsTasks.map((t) => (
              <div key={t.id} onClick={() => setSelectedTaskId(t.id)} style={{
                padding: '14px 16px', background: 'var(--s1)', border: '1px solid var(--bd)',
                borderRadius: 10, cursor: 'pointer',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title.replace(LESSONS_PREFIX + ' ', '')}</div>
                {t.latest_note && (
                  <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 6, lineHeight: 1.5 }}>{t.latest_note}</div>
                )}
              </div>
            ))}
          </>
        )}

        {selectedTaskId && (
          <TaskDetailModal key={selectedTaskId} taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
        )}
      </div>
    </div>
  );
}

function CenterMsg({ text }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mt)', fontSize: 14 }}>
      {text}
    </div>
  );
}
