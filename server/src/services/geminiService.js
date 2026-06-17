import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const REQUEST_OPTS = { timeout: 120_000 };

const SUMMARY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    overview: { type: SchemaType.STRING, description: '하루 전체 작업 흐름 1~2문장 요약' },
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING, description: '해당 프로젝트 작업 요약 1~2문장' },
          nextStep: { type: SchemaType.STRING, description: '이어할 작업 (없으면 빈 문자열)' },
        },
        required: ['name', 'summary', 'nextStep'],
      },
    },
  },
  required: ['overview', 'projects'],
};

export async function generateAiSummary(reportData, projectNames) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const filtered = projectNames?.length
    ? { ...reportData, projects: reportData.projects.filter(p => projectNames.includes(p.name)) }
    : reportData;

  const prompt = buildPrompt(filtered);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SUMMARY_SCHEMA,
      },
    }, REQUEST_OPTS);
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error('Gemini summary failed:', err.message);
    return null;
  }
}

const WEEKLY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          items: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: '프로젝트별 진행사항 목록 (간결한 한 줄씩)',
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  required: ['projects'],
};

export async function generateWeeklyReport(rangeData, selectedProjects) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const lines = [`기간: ${rangeData.from} ~ ${rangeData.to}`, ''];
  for (const day of (rangeData.days || [])) {
    for (const proj of (day.projects || [])) {
      if (selectedProjects?.length && !selectedProjects.includes(proj.projectId)) continue;
      const commits = Object.values(proj.commits || {}).flat();
      if (commits.length === 0) continue;
      lines.push(`[${day.date}] ${proj.label}`);
      for (const c of commits) lines.push(`  - [${c.type}] ${c.message}`);
      lines.push('');
    }
  }

  const prompt = `너는 주간회의록 작성 보조다.
아래 커밋 기록을 바탕으로, 프로젝트별 진행사항을 정리하라.

${lines.join('\n')}

규칙:
- 프로젝트별로 주요 진행 사항을 정리. 동일 맥락 커밋은 하나로 묶기
- 각 항목은 "~완료", "~수정", "~추가" 형태의 간결한 한 줄
- 구체적 행위와 대상 명시. "관련 작업" 같은 모호한 표현 금지
- 평어체 사용`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: WEEKLY_SCHEMA,
      },
    }, REQUEST_OPTS);
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error('Weekly report generation failed:', err.message);
    return null;
  }
}

const OBJECTIVES_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    objectives: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          objectiveId: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          projects: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
              required: ['name', 'items'],
            },
          },
        },
        required: ['objectiveId', 'title', 'score', 'projects'],
      },
    },
    etcItems: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          projectName: { type: SchemaType.STRING },
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['projectName', 'items'],
      },
    },
  },
  required: ['objectives', 'etcItems'],
};

export async function generateObjectivesReport(objectives, projectData, period) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const objLines = objectives.map((o) =>
    `- [${o.id}] ${o.title} (${o.score}점) | 설명: ${o.description || ''} | 연관 프로젝트: ${(o.linkedProjects || []).join(', ')} | 키워드: ${(o.keywords || []).join(', ')}`
  ).join('\n');

  const commitLines = projectData.map((p) => {
    const msgs = p.commits.map((c) => `  - [${c.type}] ${c.message}`).join('\n');
    return `[${p.label}] (id: ${p.projectId})\n${msgs}`;
  }).join('\n\n');

  const prompt = `너는 성과 보고서 작성 보조다.
아래 "중점추진과제" 목록과 해당 월(${period})의 프로젝트별 커밋 기록을 바탕으로,
각 과제에 해당하는 성과를 프로젝트별로 분류하여 서술하라.

## 중점추진과제
${objLines}

## ${period} 커밋 기록
${commitLines}

## 규칙
- 각 과제의 연관 프로젝트와 키워드를 참고하여 커밋을 매칭
- 매칭된 커밋은 "~완료", "~개선", "~구현" 형태의 성과 어필 톤으로 서술
- 동일 맥락 커밋은 하나로 묶기
- 어떤 과제에도 매칭되지 않는 항목은 etcItems로 분류
- 평어체 사용. 구체적 행위와 대상 명시
- objectiveId는 입력된 과제 id를 그대로 사용`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: OBJECTIVES_SCHEMA,
      },
    }, REQUEST_OPTS);
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error('Objectives report generation failed:', err.message);
    return null;
  }
}

function buildPrompt(report) {
  const lines = [`날짜: ${report.date} (${report.dayOfWeek})`, ''];

  for (const p of report.projects) {
    lines.push(`## ${p.name}`);
    if (p.commits.length > 0) {
      lines.push('커밋:');
      for (const c of p.commits) {
        lines.push(`- [${c.prefix}] ${c.message} (+${c.additions}/-${c.deletions})`);
      }
    }
    if (p.sessions.length > 0) {
      lines.push('세션:');
      for (const s of p.sessions) {
        lines.push(`- "${s.firstPrompt}" (${s.durationMinutes}분)`);
      }
    }
    lines.push(`상태: ${p.status === 'done' ? '완료' : '진행중'}`);
    lines.push('');
  }

  return `너는 개발자의 하루 작업 기록을 정리하는 기술 비서다.
git 커밋과 Claude 세션 기록을 바탕으로, 개발자가 다음 날 아침에 3분 안에 어제 맥락을 복구할 수 있는 요약을 작성하라.

${lines.join('\n')}

규칙:
- overview: 하루 전체 흐름을 1~2문장으로. 프로젝트 간 맥락을 연결하여 서술
- 각 project.summary: 같은 맥락의 커밋은 묶어서 서술. prefix(feat/fix/chore)로 성격 판단, 세션 프롬프트에서 구체적 행위를 추출하여 서술
- 각 project.nextStep: "진행중"이면 무엇을 하다 멈췄는지 + 이어할 작업. "완료"면 빈 문자열
- 입력된 모든 프로젝트를 projects 배열에 포함할 것. 활동이 적어도 생략 금지
- 평어체("~했다", "~검토했다") 사용. 경어("~습니다") 금지
- "일부 수행", "관련 작업" 같은 모호한 표현 금지. 구체적 행위와 대상을 명시
- 날짜 지칭("오늘", "어제") 금지, 도구 이름(Claude, AI, Gemini) 금지
- 간결한 한국어, 개발자 본인 회고/복구 톤`;
}
