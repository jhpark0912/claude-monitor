import { useState } from 'react';

const TYPES_ORDER = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];
const TYPE_LABELS = {
  feat: 'Features', fix: 'Fixes', style: 'Style', refactor: 'Refactor',
  docs: 'Docs', chore: 'Chore', other: 'Other',
};

function generateDailyMd(data) {
  if (!data) return '';
  const lines = [`## ${data.date}\n`];

  for (const proj of data.projects) {
    lines.push(`### ${proj.label}\n`);
    for (const type of TYPES_ORDER) {
      const commits = proj.commits[type];
      if (!commits?.length) continue;
      lines.push(`#### ${TYPE_LABELS[type]}`);
      for (const c of commits) {
        lines.push(`- \`${c.hash}\` ${c.message} (+${c.additions}, -${c.deletions})`);
      }
      lines.push('');
    }
  }

  if (data.memo?.content) {
    lines.push('---', `**Memo:** ${data.memo.content}`);
  }
  return lines.join('\n');
}

function generateWeeklyMd(data) {
  if (!data?.days) return '';
  const lines = [`## ${data.from} ~ ${data.to}\n`];

  for (const day of data.days) {
    if (day.sessionCount === 0 && (!day.projects || day.projects.length === 0)) continue;
    lines.push(`### ${day.date}`);
    if (day.projects) {
      for (const proj of day.projects) {
        for (const type of TYPES_ORDER) {
          const commits = proj.commits[type];
          if (!commits?.length) continue;
          for (const c of commits) {
            lines.push(`- \`${c.hash}\` [${type}] ${c.message} (+${c.additions}, -${c.deletions})`);
          }
        }
      }
    }
    if (day.memo) lines.push(`> ${day.memo}`);
    lines.push('');
  }
  return lines.join('\n');
}

export default function CopyMarkdownButton({ data, view }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const md = view === 'daily' ? generateDailyMd(data) : generateWeeklyMd(data);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 'var(--rx)', fontSize: 10, fontWeight: 500,
        color: copied ? 'var(--gn)' : 'var(--tx2)',
        background: 'var(--s2)', border: '1px solid var(--bd)',
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
      }}
    >
      {copied ? '✓ 복사됨' : '📋 MD'}
    </button>
  );
}
