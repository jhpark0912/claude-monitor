import { useState, useEffect } from 'react';
import { fetchObjectives, saveObjective, deleteObjective, fetchProjects } from '../../api/client';

export default function ObjectiveSettings({ open, onClose, onSaved }) {
  const [objectives, setObjectives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchObjectives(), fetchProjects()])
      .then(([objs, projs]) => { setObjectives(objs); setProjects(projs); })
      .finally(() => setLoading(false));
  }, [open]);

  const totalScore = objectives.reduce((sum, o) => sum + (o.score || 0), 0);

  const handleSave = async (obj) => {
    const saved = await saveObjective(obj);
    setObjectives((prev) => {
      const idx = prev.findIndex((o) => o.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
    setEditing(null);
    onSaved?.();
  };

  const handleDelete = async (id) => {
    await deleteObjective(id);
    setObjectives((prev) => prev.filter((o) => o.id !== id));
    onSaved?.();
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--s1)', borderRadius: 12, width: '90%', maxWidth: 700,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: 'var(--tx)' }}>중점추진과제 설정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--mt)' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? <div style={{ color: 'var(--mt)', padding: 20, textAlign: 'center' }}>불러오는 중...</div> : (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: totalScore > 100 ? '#e53e3e' : 'var(--mt)' }}>
              배점 합계: {totalScore}/100 {totalScore > 100 && '(초과!)'}
            </div>

            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)', color: 'var(--mt)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '28%' }}>제목</th>
                  <th style={{ padding: '6px 8px', width: 50 }}>배점</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '25%' }}>연관 프로젝트</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '22%' }}>키워드</th>
                  <th style={{ padding: '6px 8px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((obj) => (
                  <ObjectiveRow
                    key={obj.id} obj={obj} projects={projects}
                    isEditing={editing === obj.id}
                    onEdit={() => setEditing(obj.id)}
                    onSave={handleSave} onDelete={handleDelete}
                    onCancel={() => setEditing(null)}
                  />
                ))}
              </tbody>
            </table>
            </div>

            <button onClick={() => setEditing('new')} style={{
              marginTop: 12, padding: '6px 14px', borderRadius: 'var(--rs)',
              border: '1px dashed var(--bd)', background: 'transparent', color: 'var(--ac)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}>
              + 과제 추가
            </button>
            {editing === 'new' && (
              <ObjectiveForm projects={projects} onSave={handleSave} onCancel={() => setEditing(null)} />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function resolveProjectLabels(ids, projects) {
  if (!ids?.length) return { display: '-', tooltip: '' };
  const map = new Map(projects.map((p) => [p.id, p.label]));
  const labels = ids.map((id) => map.get(id) || id);
  return { display: labels.join(', '), tooltip: labels.join('\n') };
}

function ObjectiveRow({ obj, projects, isEditing, onEdit, onSave, onDelete, onCancel }) {
  if (isEditing) return (
    <tr><td colSpan={5} style={{ padding: 8, overflow: 'visible' }}>
      <ObjectiveForm obj={obj} projects={projects} onSave={onSave} onCancel={onCancel} />
    </td></tr>
  );

  const { display: projDisplay, tooltip: projTooltip } = resolveProjectLabels(obj.linkedProjects, projects);
  const kwTooltip = (obj.keywords || []).join(', ');

  return (
    <tr style={{ borderBottom: '1px solid var(--bd)' }}>
      <td style={{ padding: '8px', overflow: 'hidden' }}>
        <div title={obj.title} style={{ fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.title}</div>
        {obj.description && <div title={obj.description} style={{ color: 'var(--mt)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj.description}</div>}
      </td>
      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{obj.score}</td>
      <td title={projTooltip} style={{ padding: '8px', color: 'var(--mt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>{projDisplay}</td>
      <td title={kwTooltip} style={{ padding: '8px', color: 'var(--mt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>{(obj.keywords || []).join(', ') || '-'}</td>
      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
        <button onClick={onEdit} style={btnStyle}>수정</button>
        <button onClick={() => onDelete(obj.id)} style={{ ...btnStyle, color: '#e53e3e' }}>삭제</button>
      </td>
    </tr>
  );
}

function ObjectiveForm({ obj, projects, onSave, onCancel }) {
  const [title, setTitle] = useState(obj?.title || '');
  const [description, setDescription] = useState(obj?.description || '');
  const [score, setScore] = useState(obj?.score || 0);
  const [linkedProjects, setLinkedProjects] = useState(obj?.linkedProjects || []);
  const [keywords, setKeywords] = useState((obj?.keywords || []).join(', '));

  const toggleProject = (pid) => {
    setLinkedProjects((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...(obj?.id ? { id: obj.id } : {}),
      title: title.trim(),
      description: description.trim(),
      score: Number(score),
      linkedProjects,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="과제 제목"
          style={{ ...inputStyle, flex: 1 }} />
        <input value={score} onChange={(e) => setScore(e.target.value)} type="number" min={0} max={100}
          placeholder="배점" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)"
        style={inputStyle} />
      <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="키워드 (쉼표 구분)"
        style={inputStyle} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(projects || []).map((p) => (
          <label key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, cursor: 'pointer',
            padding: '2px 6px', borderRadius: 4,
            background: linkedProjects.includes(p.id) ? 'var(--ac-bg)' : 'var(--s2)',
            border: `1px solid ${linkedProjects.includes(p.id) ? 'var(--ac-bd)' : 'var(--bd)'}`,
          }}>
            <input type="checkbox" checked={linkedProjects.includes(p.id)} onChange={() => toggleProject(p.id)}
              style={{ width: 10, height: 10 }} />
            {p.label}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ ...btnStyle, background: 'var(--ac)', color: '#fff', border: 'none', padding: '5px 12px' }}>
          {obj?.id ? '수정' : '추가'}
        </button>
        <button type="button" onClick={onCancel} style={btnStyle}>취소</button>
      </div>
    </form>
  );
}

const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ac)', fontFamily: 'inherit' };
const inputStyle = {
  padding: '5px 8px', fontSize: 12, border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
  background: 'var(--bg)', color: 'var(--tx)', fontFamily: 'inherit',
};
