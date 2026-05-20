const API_BASE = '/api';

async function fetchJson(url, opts) {
  const res = await fetch(`${API_BASE}${url}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function fetchProjects() {
  return fetchJson('/projects');
}

export function fetchDailySessions(date, project = 'all') {
  return fetchJson(`/daily?date=${date}&project=${project}`);
}

export function fetchDates(project = 'all') {
  return fetchJson(`/daily/dates?project=${project}`);
}

export function fetchAnalyticsCalendar(month, project = 'all') {
  return fetchJson(`/analytics/calendar?month=${month}&project=${project}`);
}

export function fetchAnalyticsHeatmap(weeks = 4, project = 'all') {
  return fetchJson(`/analytics/heatmap?weeks=${weeks}&project=${project}`);
}

export function fetchAnalyticsCost(period = '4w', project = 'all') {
  return fetchJson(`/analytics/cost?period=${period}&project=${project}`);
}

export function fetchAnalyticsYearly(project = 'all') {
  return fetchJson(`/analytics/yearly?project=${project}`);
}

export function fetchAnalyticsAnomalies(month, project = 'all') {
  return fetchJson(`/analytics/anomalies?month=${month}&project=${project}`);
}

export function fetchDaybook(date, project = 'all', { signal } = {}) {
  return fetchJson(`/daybook?date=${date}&project=${project}`, { signal });
}

export function fetchDaybookRange(from, to, project = 'all', aggregate = false, { signal } = {}) {
  return fetchJson(`/daybook/range?from=${from}&to=${to}&project=${project}&aggregate=${aggregate}`, { signal });
}

export function fetchDaybookDates(project = 'all') {
  return fetchJson(`/daybook/dates?project=${project}`);
}

export async function saveMemo(date, content) {
  const res = await fetch(`${API_BASE}/daybook/memos/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function createMonitorStream(onEvent) {
  const eventSource = new EventSource(`${API_BASE}/monitor/stream`);

  eventSource.addEventListener('snapshot', (e) => {
    onEvent('snapshot', JSON.parse(e.data));
  });

  eventSource.addEventListener('update', (e) => {
    onEvent('update', JSON.parse(e.data));
  });

  eventSource.onerror = () => {};

  return eventSource;
}
