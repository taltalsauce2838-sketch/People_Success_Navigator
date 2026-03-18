import { API_BASE_URL, getToken, clearToken } from './api.js';

const state = {
  me: null,
  records: [],
  todayKey: null,
  tooltipPinnedIndex: null,
};

const COLORS = {
  line: '#2c8fe3',
  fillStart: 'rgba(44,143,227,0.22)',
  fillEnd: 'rgba(44,143,227,0.02)',
  grid: '#dfe7f2',
  text: '#5c6f8f',
  point: '#17356f',
  risk: '#d64545',
  safe: '#0f9d58',
};

function getTodayKey() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function normalizeDateString(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateLabel(value) {
  const normalized = normalizeDateString(value);
  if (!normalized) return '-';
  const [year, month, day] = normalized.split('-');
  return `${year}/${month}/${day}`;
}

function formatShortDateLabel(value) {
  const normalized = normalizeDateString(value);
  if (!normalized) return '';
  const [, month, day] = normalized.split('-');
  return `${month}/${day}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJson(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    const error = new Error(data?.detail || 'API呼び出しに失敗しました。');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function fetchMe() {
  return fetchJson('/users/me', { method: 'GET' });
}

async function fetchPulseRecords(userId) {
  const query = new URLSearchParams({ user_id: String(userId) });
  const data = await fetchJson(`/pulse/?${query.toString()}`, { method: 'GET' });
  return Array.isArray(data) ? data : [];
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const aTime = new Date(a?.survey_date || a?.created_at || 0).getTime();
    const bTime = new Date(b?.survey_date || b?.created_at || 0).getTime();
    return aTime - bTime;
  });
}

function getLatestRecord(records) {
  if (!records.length) return null;
  return [...records].sort((a, b) => new Date(b?.survey_date || b?.created_at || 0) - new Date(a?.survey_date || a?.created_at || 0))[0];
}

function getRecentWindow(records, days = 14) {
  const sorted = sortRecords(records);
  if (!sorted.length) return [];

  const byDate = new Map(sorted.map((record) => [normalizeDateString(record.survey_date), record]));
  const end = state.todayKey;
  const result = [];
  const endDate = new Date(`${end}T00:00:00+09:00`);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(endDate);
    current.setDate(endDate.getDate() - offset);
    const key = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(current);
    const record = byDate.get(key) || null;
    result.push({
      key,
      label: formatShortDateLabel(key),
      score: record?.score ?? null,
      memo: record?.memo ?? '',
      createdAt: record?.created_at ?? null,
    });
  }
  return result;
}

function calculateAverage(items) {
  const scores = items.map((item) => item.score).filter((score) => typeof score === 'number');
  if (!scores.length) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function calculateStreak(items) {
  let streak = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (typeof items[i].score === 'number') streak += 1;
    else break;
  }
  return streak;
}

function setChip(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = `chip ${kind}`;
}

function updateSummary(recentItems) {
  const records = state.records;
  const latest = getLatestRecord(records);
  const todayRecord = records.find((record) => normalizeDateString(record.survey_date) === state.todayKey) || null;
  const average = calculateAverage(recentItems);
  const streak = calculateStreak(recentItems);

  document.getElementById('userAnswerStatusValue').textContent = todayRecord ? '回答済' : '未回答';
  setChip(document.getElementById('userAnswerStatusChip'), todayRecord ? '本日回答済み' : '本日未回答', todayRecord ? 'success' : 'warning');
  setChip(document.getElementById('todayPulseStatusChip'), todayRecord ? '本日回答済み' : '本日未回答', todayRecord ? 'success' : 'warning');

  document.getElementById('userLatestScoreValue').textContent = latest?.score ?? '-';
  document.getElementById('userLatestScoreMeta').textContent = latest ? `最新回答日: ${formatDateLabel(latest.survey_date)}` : 'まだ回答履歴がありません';

  document.getElementById('userAverageScoreValue').textContent = average == null ? '-' : average.toFixed(1);
  document.getElementById('userAverageScoreMeta').textContent = average == null ? '直近2週間の回答がありません' : '回答済み日の平均スコア';

  document.getElementById('userStreakValue').textContent = streak > 0 ? `${streak}日` : '0日';
  document.getElementById('userStreakMeta').textContent = streak > 0 ? '今日から連続で回答しています' : '直近は未回答です';
}

function renderLatestList(items) {
  const el = document.getElementById('userConditionLatestList');
  if (!el) return;
  const latestAnswered = [...items].filter((item) => typeof item.score === 'number').slice(-3).reverse();

  if (!latestAnswered.length) {
    el.innerHTML = '<div class="timeline-item"><strong>履歴未取得</strong><div class="card-sub">まだ表示できる回答履歴がありません。</div></div>';
    return;
  }

  el.innerHTML = latestAnswered.map((item) => `
    <div class="timeline-item">
      <strong>${escapeHtml(formatDateLabel(item.key))} / スコア ${escapeHtml(item.score)}</strong>
      <div class="card-sub">${escapeHtml(item.memo || 'メモなし')}</div>
    </div>
  `).join('');
}

function buildPath(points) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function buildAreaPath(points, bottomY) {
  if (!points.length) return '';
  const line = buildPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
}

function renderConditionChart(items) {
  const svg = document.getElementById('userConditionSvg');
  const tooltip = document.getElementById('userConditionTooltip');
  const status = document.getElementById('userConditionStatus');
  const legend = document.getElementById('userConditionLegend');
  if (!svg || !tooltip || !status || !legend) return;

  if (!items.length || items.every((item) => typeof item.score !== 'number')) {
    status.textContent = '直近2週間の回答データがありません。';
    legend.innerHTML = '<span class="mini-legend-chip"><span class="mini-legend-dot" style="background:#d9e2ee"></span>データなし</span>';
    svg.innerHTML = `
      <rect x="0" y="0" width="760" height="280" rx="20" fill="#f8fbff"></rect>
      <text x="380" y="146" text-anchor="middle" fill="#8da1bf" font-size="18">回答データがありません</text>
    `;
    return;
  }

  status.textContent = '回答済みの日だけスコアを結び、未回答日は欠損として表示しています。';
  legend.innerHTML = `
    <span class="mini-legend-chip"><span class="mini-legend-dot" style="background:${COLORS.line}"></span>コンディション推移</span>
    <span class="mini-legend-chip"><span class="mini-legend-dot" style="background:${COLORS.risk}"></span>要注意帯（1〜2）</span>
  `;

  const width = 760;
  const height = 280;
  const margin = { top: 18, right: 20, bottom: 40, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const bottomY = margin.top + innerHeight;
  const maxXIndex = Math.max(items.length - 1, 1);

  const scoreToY = (score) => margin.top + ((5 - score) / 4) * innerHeight;
  const indexToX = (index) => margin.left + (index / maxXIndex) * innerWidth;

  const points = items
    .map((item, index) => (typeof item.score === 'number' ? {
      ...item,
      index,
      x: indexToX(index),
      y: scoreToY(item.score),
    } : null))
    .filter(Boolean);

  const areaPath = buildAreaPath(points, bottomY);
  const linePath = buildPath(points);

  const gridY = [1, 2, 3, 4, 5].map((score) => ({ score, y: scoreToY(score) }));
  const xTicks = items.map((item, index) => ({ label: item.label, x: indexToX(index), index }));

  svg.innerHTML = `
    <defs>
      <linearGradient id="userConditionFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${COLORS.fillStart}" />
        <stop offset="100%" stop-color="${COLORS.fillEnd}" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="20" fill="#fbfdff"></rect>
    <rect x="${margin.left}" y="${scoreToY(2)}" width="${innerWidth}" height="${bottomY - scoreToY(2)}" fill="rgba(214,69,69,0.08)"></rect>
    ${gridY.map((tick) => `<g>
      <line x1="${margin.left}" x2="${width - margin.right}" y1="${tick.y}" y2="${tick.y}" stroke="${COLORS.grid}" stroke-dasharray="4 6"></line>
      <text x="${margin.left - 16}" y="${tick.y + 5}" text-anchor="end" font-size="12" fill="${COLORS.text}">${tick.score}</text>
    </g>`).join('')}
    ${xTicks.map((tick, index) => `<text x="${tick.x}" y="${height - 14}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${index % 2 === 0 ? tick.label : ''}</text>`).join('')}
    <path d="${areaPath}" fill="url(#userConditionFill)"></path>
    <path d="${linePath}" fill="none" stroke="${COLORS.line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    ${points.map((point) => `<g>
      <circle cx="${point.x}" cy="${point.y}" r="${point.score <= 2 ? 7 : 5}" fill="#fff" stroke="${point.score <= 2 ? COLORS.risk : COLORS.point}" stroke-width="${point.score <= 2 ? 3 : 2}"></circle>
      <circle cx="${point.x}" cy="${point.y}" r="2.5" fill="${point.score <= 2 ? COLORS.risk : COLORS.point}"></circle>
    </g>`).join('')}
  `;

  const activePoints = items.map((item, index) => ({
    index,
    x: indexToX(index),
    item,
  }));

  const showTooltip = (index) => {
    const target = activePoints[index];
    if (!target) return;
    const scoreLabel = typeof target.item.score === 'number' ? `スコア ${target.item.score}` : '未回答';
    tooltip.innerHTML = `<strong>${escapeHtml(formatDateLabel(target.item.key))}</strong><br>${escapeHtml(scoreLabel)}${target.item.memo ? `<br>${escapeHtml(target.item.memo)}` : ''}`;
    tooltip.classList.remove('hidden');
    tooltip.style.left = `${target.x}px`;
    tooltip.style.top = `${typeof target.item.score === 'number' ? scoreToY(target.item.score) : bottomY - 6}px`;
  };

  svg.onmousemove = (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let minDiff = Infinity;
    activePoints.forEach((point) => {
      const diff = Math.abs(point.x - x);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = point.index;
      }
    });
    showTooltip(nearest);
  };

  svg.onmouseleave = () => {
    tooltip.classList.add('hidden');
  };
}

async function init() {
  state.todayKey = getTodayKey();

  try {
    state.me = await fetchMe();
    state.records = await fetchPulseRecords(state.me.id);

    const recentItems = getRecentWindow(state.records, 14);
    updateSummary(recentItems);
    renderConditionChart(recentItems);
    renderLatestList(recentItems);
  } catch (error) {
    console.error(error);
    if (error?.status === 401 || error?.status === 403) {
      clearToken();
      window.location.href = './login.html';
      return;
    }
    const status = document.getElementById('userConditionStatus');
    if (status) status.textContent = error.message || 'ダッシュボードの読み込みに失敗しました。';
  }
}

document.addEventListener('DOMContentLoaded', init);
