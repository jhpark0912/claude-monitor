import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { fetchObjectives, fetchObjectiveReport, saveObjectiveReport, generateObjectivesAi } from '../../api/client';
import ObjectiveSettings from './ObjectiveSettings';

export default function ObjectivesReport() {
  const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));
  const [objectives, setObjectives] = useState([]);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    const [objs, rep] = await Promise.all([
      fetchObjectives(),
      fetchObjectiveReport(period).catch(() => null),
    ]);
    setObjectives(objs);
    if (rep) { setReport(rep); setSaved(true); }
    else { setReport(null); setSaved(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateObjectivesAi(period);
      setReport(result);
      setSaved(false);
    } catch (err) {
      alert('AI 생성 실패: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await saveObjectiveReport(period, report);
      setSaved(true);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const updateItem = (objIdx, projIdx, itemIdx, value) => {
    const next = { ...report };
    next.objectives = [...next.objectives];
    next.objectives[objIdx] = { ...next.objectives[objIdx] };
    next.objectives[objIdx].projects = [...next.objectives[objIdx].projects];
    next.objectives[objIdx].projects[projIdx] = { ...next.objectives[objIdx].projects[projIdx] };
    next.objectives[objIdx].projects[projIdx].items = [...next.objectives[objIdx].projects[projIdx].items];
    next.objectives[objIdx].projects[projIdx].items[itemIdx] = value;
    setReport(next);
    setSaved(false);
  };

  const copyMarkdown = () => {
    if (!report) return;
    const lines = [`# 중점추진과제 성과 보고 (${period})`, ''];
    for (const obj of report.objectives) {
      lines.push(`## ${obj.title} (${obj.score}점)`);
      for (const p of obj.projects) {
        lines.push(`### ${p.name}`);
        for (const item of p.items) lines.push(`- ${item}`);
      }
      lines.push('');
    }
    if (report.etcItems?.length) {
      lines.push('## 기타 성과');
      for (const p of report.etcItems) {
        lines.push(`### ${p.projectName}`);
        for (const item of p.items) lines.push(`- ${item}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPeriod(dayjs(period).subtract(1, 'month').format('YYYY-MM'))}
            style={navBtn}>&lsaquo;</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', minWidth: 80, textAlign: 'center' }}>
            {period}
          </span>
          <button onClick={() => setPeriod(dayjs(period).add(1, 'month').format('YYYY-MM'))}
            style={navBtn}>&rsaquo;</button>
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => setSettingsOpen(true)} style={actionBtn}>
          과제 설정
        </button>
        <button onClick={handleGenerate} disabled={generating || objectives.length === 0} style={{
          ...actionBtn, opacity: generating || objectives.length === 0 ? 0.5 : 1,
          cursor: generating ? 'wait' : 'pointer',
        }}>
          {generating ? 'AI 생성 중...' : 'AI 생성'}
        </button>
        <button onClick={handleSave} disabled={saving || !report} style={{
          ...actionBtn, background: 'var(--ac)', color: '#fff', border: 'none',
          opacity: saving || !report ? 0.5 : 1,
        }}>
          {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
        </button>
        {report && <button onClick={copyMarkdown} style={actionBtn}>복사</button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {!report && objectives.length === 0 && (
          <EmptyState onOpen={() => setSettingsOpen(true)} />
        )}
        {!report && objectives.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mt)' }}>
            <p>설정된 과제 {objectives.length}개가 있습니다.</p>
            <p style={{ fontSize: 12 }}>AI 생성 버튼을 눌러 {period}월 성과를 생성하세요.</p>
          </div>
        )}
        {report && (
          <>
            {report.objectives?.map((obj, objIdx) => (
              <ObjectiveSection key={obj.objectiveId} obj={obj} objIdx={objIdx}
                expanded={expanded[obj.objectiveId]} onToggle={() => toggleExpand(obj.objectiveId)}
                onUpdateItem={updateItem} />
            ))}
            {report.etcItems?.length > 0 && (
              <div style={{ marginTop: 16, background: 'var(--yw-bg)', border: '1px solid var(--yw-bd)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--tx)' }}>
                  기타 성과
                  <span style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 400, marginLeft: 8 }}>
                    과제에 재분배할 항목이 있다면 수동으로 이동하세요
                  </span>
                </div>
                {report.etcItems.map((p, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mt)', marginBottom: 4 }}>{p.projectName}</div>
                    {p.items.map((item, j) => (
                      <div key={j} style={{ fontSize: 12, color: 'var(--tx)', paddingLeft: 12, marginBottom: 2 }}>- {item}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ObjectiveSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={loadData} />
    </>
  );
}

function ObjectiveSection({ obj, objIdx, expanded, onToggle, onUpdateItem }) {
  const itemCount = obj.projects?.reduce((s, p) => s + p.items.length, 0) || 0;
  return (
    <div style={{ marginBottom: 8, border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'pointer',
        background: 'var(--s2)', gap: 10,
      }}>
        <span style={{ fontSize: 11, transform: expanded ? 'rotate(90deg)' : '', transition: 'transform .15s' }}>&#9654;</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)', flex: 1 }}>{obj.title}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: 'var(--ac-bg)', color: 'var(--ac)', border: '1px solid var(--ac-bd)',
        }}>
          {obj.score}점
        </span>
        <span style={{ fontSize: 11, color: 'var(--mt)' }}>{itemCount}건</span>
      </div>
      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          {obj.projects?.map((proj, projIdx) => (
            <div key={projIdx} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ac)', marginBottom: 4 }}>{proj.name}</div>
              {proj.items.map((item, itemIdx) => (
                <EditableItem key={itemIdx} value={item}
                  onChange={(v) => onUpdateItem(objIdx, projIdx, itemIdx, v)} />
              ))}
            </div>
          ))}
          {(!obj.projects || obj.projects.length === 0) && (
            <div style={{ fontSize: 12, color: 'var(--mt)' }}>매칭된 성과 없음</div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableItem({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <input value={text} onChange={(e) => setText(e.target.value)} autoFocus
        onBlur={() => { onChange(text); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onChange(text); setEditing(false); } }}
        style={{
          width: '100%', padding: '3px 8px', fontSize: 12, marginBottom: 2,
          border: '1px solid var(--ac-bd)', borderRadius: 4, background: 'var(--bg)',
          color: 'var(--tx)', fontFamily: 'inherit',
        }}
      />
    );
  }
  return (
    <div onClick={() => setEditing(true)} style={{
      fontSize: 12, color: 'var(--tx)', paddingLeft: 12, marginBottom: 2,
      cursor: 'text', borderRadius: 3, padding: '2px 8px',
    }}
      title="클릭하여 편집">
      - {value}
    </div>
  );
}

function EmptyState({ onOpen }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>
      <p style={{ fontSize: 14 }}>설정된 중점추진과제가 없습니다.</p>
      <button onClick={onOpen} style={{
        marginTop: 12, padding: '8px 20px', borderRadius: 'var(--rs)',
        border: '1px solid var(--ac-bd)', background: 'var(--ac-bg)', color: 'var(--ac)',
        cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
      }}>
        과제 설정하기
      </button>
    </div>
  );
}

const navBtn = {
  background: 'none', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
  padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--tx)', fontFamily: 'inherit',
};
const actionBtn = {
  padding: '6px 14px', borderRadius: 'var(--rs)', fontSize: 11, fontWeight: 600,
  border: '1px solid var(--ac-bd)', background: 'var(--ac-bg)', color: 'var(--ac)',
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
};
