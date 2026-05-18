import { Router } from 'express';
import dayjs from 'dayjs';
import { getAvailableDates, getSessionsByDate, refreshIndex } from '../services/projectScanner.js';
import { parseSessionSummary } from '../services/jsonlParser.js';
import { buildAnalyticsData } from '../services/analyticsService.js';

const router = Router();

router.get('/calendar', async (req, res, next) => {
  try {
    const { month, project } = req.query;
    const target = month || dayjs().format('YYYY-MM');
    const data = await buildAnalyticsData(project || 'all');

    const calendarDays = {};
    for (const session of data.sessions) {
      const date = dayjs(session.startedAt).format('YYYY-MM-DD');
      if (!date.startsWith(target)) continue;
      if (!calendarDays[date]) {
        calendarDays[date] = { date, sessionCount: 0, totalTokens: 0 };
      }
      calendarDays[date].sessionCount += 1;
      calendarDays[date].totalTokens += session.tokens.totalInput + session.tokens.totalOutput;
    }

    res.json({
      month: target,
      days: Object.values(calendarDays).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', async (req, res, next) => {
  try {
    const { weeks, project } = req.query;
    const weeksNum = parseInt(weeks) || 4;
    const since = dayjs().subtract(weeksNum, 'week').startOf('day');
    const data = await buildAnalyticsData(project || 'all');

    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const session of data.sessions) {
      const start = dayjs(session.startedAt);
      if (start.isBefore(since)) continue;
      const dow = start.day();
      const hour = start.hour();
      matrix[dow][hour] += 1;
    }

    const reordered = [...matrix.slice(1), matrix[0]];

    res.json({
      period: `${weeksNum}주`,
      matrix: reordered,
      days: ['월', '화', '수', '목', '금', '토', '일'],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/cost', async (req, res, next) => {
  try {
    const { period, project } = req.query;
    const periodWeeks = period === '1w' ? 1 : period === '3m' ? 12 : 4;
    const since = dayjs().subtract(periodWeeks, 'week').startOf('day');
    const data = await buildAnalyticsData(project || 'all');

    const models = { opus: { input: 0, output: 0 }, sonnet: { input: 0, output: 0 }, haiku: { input: 0, output: 0 } };
    let cacheCreation = 0;
    let cacheRead = 0;
    const dailyCosts = {};

    for (const session of data.sessions) {
      const start = dayjs(session.startedAt);
      if (start.isBefore(since)) continue;

      const date = start.format('YYYY-MM-DD');
      const modelKey = classifyModel(session.model);
      models[modelKey].input += session.tokens.totalInput;
      models[modelKey].output += session.tokens.totalOutput;
      cacheCreation += session.tokens.cacheCreation || 0;
      cacheRead += session.tokens.cacheRead || 0;

      if (!dailyCosts[date]) dailyCosts[date] = { date, opus: 0, sonnet: 0, haiku: 0 };
      const cost = estimateCost(session.tokens, modelKey);
      dailyCosts[date][modelKey] += cost;
    }

    const totalCost = calcModelCost(models);
    const opusInputShare = models.opus.input / ((models.opus.input + models.sonnet.input + models.haiku.input) || 1);
    const weightedInputRate = opusInputShare * 15 + (1 - opusInputShare) * 3;
    const fullPriceIfNoCache = (cacheRead / 1e6) * weightedInputRate;
    const actualCacheCost = (cacheRead / 1e6) * weightedInputRate * 0.1;
    const cacheSavings = Math.round((fullPriceIfNoCache - actualCacheCost) * 100) / 100;

    res.json({
      period: `${periodWeeks}w`,
      models,
      totalCost,
      cacheSavings: Math.round(cacheSavings * 100) / 100,
      cacheHitRate: cacheRead + cacheCreation > 0
        ? Math.round((cacheRead / (cacheRead + cacheCreation + models.opus.input + models.sonnet.input + models.haiku.input)) * 100)
        : 0,
      cacheCreation,
      cacheRead,
      dailyCosts: Object.values(dailyCosts).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/yearly', async (req, res, next) => {
  try {
    const { project } = req.query;
    const data = await buildAnalyticsData(project || 'all');
    const year = dayjs().year();

    const days = {};
    for (const session of data.sessions) {
      const start = dayjs(session.startedAt);
      if (start.year() !== year) continue;
      const date = start.format('YYYY-MM-DD');
      if (!days[date]) days[date] = { date, sessions: 0, tokens: 0 };
      days[date].sessions += 1;
      days[date].tokens += session.tokens.totalInput + session.tokens.totalOutput;
    }

    res.json({ year, days: Object.values(days) });
  } catch (err) {
    next(err);
  }
});

function classifyModel(model) {
  if (!model) return 'sonnet';
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('haiku')) return 'haiku';
  return 'sonnet';
}

function estimateCost(tokens, modelKey) {
  const rates = {
    opus: { input: 15, output: 75 },
    sonnet: { input: 3, output: 15 },
    haiku: { input: 0.25, output: 1.25 },
  };
  const r = rates[modelKey];
  return (tokens.totalInput / 1e6) * r.input + (tokens.totalOutput / 1e6) * r.output;
}

function calcModelCost(models) {
  let total = 0;
  total += (models.opus.input / 1e6) * 15 + (models.opus.output / 1e6) * 75;
  total += (models.sonnet.input / 1e6) * 3 + (models.sonnet.output / 1e6) * 15;
  total += (models.haiku.input / 1e6) * 0.25 + (models.haiku.output / 1e6) * 1.25;
  return Math.round(total * 100) / 100;
}

/**
 * 이상 탐지 엔드포인트
 * 프로젝트별 기준선 대비 비용/시간/Bash 사용/파일 반복 편집 이상치를 감지
 */
router.get('/anomalies', async (req, res, next) => {
  try {
    const { month, project } = req.query;
    const target = month || dayjs().format('YYYY-MM');
    const data = await buildAnalyticsData(project || 'all');

    // 해당 월의 세션만 필터링
    const monthlySessions = data.sessions.filter(s =>
      dayjs(s.startedAt).format('YYYY-MM') === target
    );

    // 프로젝트별 세션 그룹핑
    const projectGroups = {};
    for (const session of monthlySessions) {
      const label = session.projectLabel || 'unknown';
      if (!projectGroups[label]) projectGroups[label] = [];
      projectGroups[label].push(session);
    }

    // 글로벌 기준선 계산
    const globalBaseline = calcBaseline(monthlySessions);

    // 프로젝트별 기준선 계산 (3개 미만이면 글로벌 폴백)
    const projectBaselines = {};
    for (const [label, sessions] of Object.entries(projectGroups)) {
      if (sessions.length >= 3) {
        projectBaselines[label] = calcBaseline(sessions);
      } else {
        projectBaselines[label] = { ...globalBaseline };
      }
    }

    // 이상치 탐지
    const anomalies = [];
    const normalSessions = [];

    for (const session of monthlySessions) {
      const label = session.projectLabel || 'unknown';
      const baseline = projectBaselines[label] || globalBaseline;
      const modelKey = classifyModel(session.model);
      const cost = Math.round(estimateCost(session.tokens, modelKey) * 100) / 100;
      const durationMin = session.endedAt
        ? Math.round(dayjs(session.endedAt).diff(dayjs(session.startedAt), 'minute'))
        : 0;
      const totalTokens = session.tokens.totalInput + session.tokens.totalOutput;
      const bashCalls = (session.toolUsage && session.toolUsage.Bash) || 0;

      const reasons = [];

      // 규칙 1: 비용 이상 (프로젝트 평균의 1.5배 초과)
      if (baseline.avgCost > 0 && cost > baseline.avgCost * 1.5) {
        const ratio = Math.round((cost / baseline.avgCost) * 10) / 10;
        reasons.push({ type: 'cost', label: `비용 평소의 ${ratio}배`, ratio });
      }

      // 규칙 2: 시간 이상 (프로젝트 평균의 2배 초과)
      if (baseline.avgDurationMin > 0 && durationMin > baseline.avgDurationMin * 2) {
        const ratio = Math.round((durationMin / baseline.avgDurationMin) * 10) / 10;
        reasons.push({ type: 'duration', label: `소요시간 평소의 ${ratio}배`, ratio });
      }

      // 규칙 3: Bash 과다 사용 (프로젝트 평균의 2배 초과)
      if (baseline.avgBashCalls > 0 && bashCalls > baseline.avgBashCalls * 2) {
        const ratio = Math.round((bashCalls / baseline.avgBashCalls) * 10) / 10;
        reasons.push({ type: 'bash', label: `Bash 호출 평소의 ${ratio}배`, ratio });
      }

      // 규칙 4: 동일 파일 반복 편집 (세션 내 같은 파일 Edit 5회 이상)
      if (session.toolCalls && Array.isArray(session.toolCalls)) {
        const editCounts = {};
        for (const call of session.toolCalls) {
          if (call.name === 'Edit' && call.input && call.input.file_path) {
            editCounts[call.input.file_path] = (editCounts[call.input.file_path] || 0) + 1;
          }
        }
        const thrashedFiles = Object.entries(editCounts)
          .filter(([, count]) => count >= 5)
          .map(([filePath, count]) => ({ filePath, count }));
        if (thrashedFiles.length > 0) {
          const maxFile = thrashedFiles.reduce((a, b) => a.count > b.count ? a : b);
          reasons.push({
            type: 'file_thrashing',
            label: `동일 파일 ${maxFile.count}회 반복 편집`,
            ratio: maxFile.count,
          });
        }
      }

      const sessionInfo = {
        sessionId: session.sessionId,
        date: dayjs(session.startedAt).format('YYYY-MM-DD'),
        projectLabel: label,
        firstPrompt: session.firstPrompt || '',
        model: modelKey,
        cost,
        durationMin,
        tokens: totalTokens,
      };

      if (reasons.length > 0) {
        anomalies.push({
          ...sessionInfo,
          toolSummary: buildToolSummary(session.toolUsage),
          reasons,
        });
      } else {
        normalSessions.push(sessionInfo);
      }
    }

    // 이상치: 비용 내림차순 정렬
    anomalies.sort((a, b) => b.cost - a.cost);

    // 최근 정상 세션 5개 (최신순)
    normalSessions.sort((a, b) => b.date.localeCompare(a.date));
    const recentSessions = normalSessions.slice(0, 5);

    const toolTotals = {};
    let sessionCount = 0;
    for (const session of monthlySessions) {
      sessionCount++;
      if (session.toolUsage) {
        for (const [name, count] of Object.entries(session.toolUsage)) {
          const short = shortToolName(name);
          toolTotals[short] = (toolTotals[short] || 0) + count;
        }
      }
    }

    res.json({
      month: target,
      sessionCount,
      baseline: {
        avgCostPerSession: globalBaseline.avgCost,
        avgDurationMin: globalBaseline.avgDurationMin,
        avgBashCalls: globalBaseline.avgBashCalls,
      },
      projectBaselines: Object.fromEntries(
        Object.entries(projectBaselines).map(([label, b]) => [
          label,
          { avgCost: b.avgCost, avgDurationMin: b.avgDurationMin, avgBashCalls: b.avgBashCalls },
        ])
      ),
      toolTotals,
      anomalies,
      recentSessions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 세션 목록에서 기준선(평균값) 계산
 */
function calcBaseline(sessions) {
  if (sessions.length === 0) {
    return { avgCost: 0, avgDurationMin: 0, avgBashCalls: 0 };
  }

  let totalCost = 0;
  let totalDuration = 0;
  let totalBash = 0;

  for (const session of sessions) {
    const modelKey = classifyModel(session.model);
    totalCost += estimateCost(session.tokens, modelKey);
    totalDuration += session.endedAt
      ? dayjs(session.endedAt).diff(dayjs(session.startedAt), 'minute')
      : 0;
    totalBash += (session.toolUsage && session.toolUsage.Bash) || 0;
  }

  return {
    avgCost: Math.round((totalCost / sessions.length) * 100) / 100,
    avgDurationMin: Math.round(totalDuration / sessions.length),
    avgBashCalls: Math.round(totalBash / sessions.length),
  };
}

/**
 * 도구 사용 요약 문자열 생성 (상위 3개)
 */
function shortToolName(name) {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    return parts[parts.length - 1];
  }
  return name;
}

function buildToolSummary(toolUsage) {
  if (!toolUsage) return '';
  const merged = {};
  for (const [name, count] of Object.entries(toolUsage)) {
    if (count <= 0) continue;
    const short = shortToolName(name);
    merged[short] = (merged[short] || 0) + count;
  }
  const entries = Object.entries(merged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return entries.map(([name, count]) => `${name}×${count}`).join(' ');
}

export default router;
