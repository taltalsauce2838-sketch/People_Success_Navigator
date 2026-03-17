import { API_BASE_URL, getToken } from './api.js';

const summaryRoot = document.getElementById('managerSummaryStats');
const riskStatusBadge = document.getElementById('riskStatusBadge');
const riskDistributionChips = document.getElementById('riskDistributionChips');
const managerRiskList = document.getElementById('managerRiskList');
const managerRiskEmpty = document.getElementById('managerRiskEmpty');
const managerMiniTrendSvg = document.getElementById('managerMiniTrendSvg');
const managerAlertBadge = document.getElementById('managerAlertBadge');
const managerAlertSummaryChips = document.getElementById('managerAlertSummaryChips');
const managerAlertList = document.getElementById('managerAlertList');
const managerAlertEmpty = document.getElementById('managerAlertEmpty');
const managerAlertActionStatus = document.getElementById('managerAlertActionStatus');
const managerMiniTrendStatus = document.getElementById('managerMiniTrendStatus');
const managerMiniChartLegend = document.getElementById('managerMiniChartLegend');
const managerTeamTableWrap = document.getElementById('managerTeamTableWrap');
const managerTeamTableStatus = document.getElementById('managerTeamTableStatus');

const dims = { left: 44, right: 22, top: 20, bottom: 34, width: 760, height: 260 };
const plotWidth = dims.width - dims.left - dims.right;
const plotHeight = dims.height - dims.top - dims.bottom;
const palette = ['#4c6ef5', '#f59f00', '#12b886', '#e64980', '#7950f2', '#228be6'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiFetch(path) {
  const token = getToken();
  if (!token) throw new Error('アクセストークンがありません。');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = 'データ取得に失敗しました。';
    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch (_) {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}


async function apiPost(path, payload) {
  const token = getToken();
  if (!token) throw new Error('アクセストークンがありません。');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  });

  if (!response.ok) {
    let message = '更新に失敗しました。';
    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch (_) {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function normalizeRisk(value, score) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('high') || raw.includes('critical')) return 'high';
  if (raw.includes('medium') || raw.includes('warning') || raw.includes('mid')) return 'medium';
  if (raw.includes('low') || raw.includes('stable')) return 'low';
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 'unknown';
  if (numeric <= 2) return 'high';
  if (numeric === 3) return 'medium';
  return 'low';
}

function riskMeta(value, score) {
  const risk = normalizeRisk(value, score);
  if (risk === 'high') return { key: risk, label: '高', className: 'danger' };
  if (risk === 'medium') return { key: risk, label: '中', className: 'warning' };
  if (risk === 'low') return { key: risk, label: '低', className: 'success' };
  return { key: 'unknown', label: '未判定', className: '' };
}

function formatDate(value) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return `${Math.round(numeric * 100)}%`;
}

function clampText(value, limit = 80) {
  const text = String(value || '').trim();
  if (!text) return '理由はまだ登録されていません。';
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function setAlertSection(alertPayload) {
  if (!managerAlertBadge || !managerAlertSummaryChips || !managerAlertList || !managerAlertEmpty) return;

  const members = Array.isArray(alertPayload?.members) ? alertPayload.members : [];
  const unresolvedCount = Number(alertPayload?.unresolved_count || 0);
  const highCount = Number(alertPayload?.high_count || 0);

  managerAlertSummaryChips.innerHTML = [
    { label: `未解消 ${unresolvedCount}件`, className: unresolvedCount > 0 ? 'danger' : 'success' },
    { label: `高リスク由来 ${highCount}件`, className: highCount > 0 ? 'warning' : '' },
    { label: `最新アラート ${members.length}件`, className: '' },
  ].map((item) => `<span class="chip ${item.className}">${escapeHtml(item.label)}</span>`).join('');

  const activeMembers = members
    .filter((member) => !member.is_resolved)
    .sort((a, b) => {
      const weight = { high: 0, medium: 1, low: 2 };
      const riskA = normalizeRisk(a.risk_level);
      const riskB = normalizeRisk(b.risk_level);
      return (weight[riskA] ?? 9) - (weight[riskB] ?? 9);
    })
    .slice(0, 5);

  managerAlertBadge.textContent = unresolvedCount > 0 ? `要対応 ${unresolvedCount}件` : 'アラームなし';
  managerAlertBadge.className = `status-badge ${unresolvedCount > 0 ? 'error' : 'success'}`;

  if (!activeMembers.length) {
    managerAlertList.innerHTML = '';
    managerAlertEmpty.classList.remove('hidden');
    return;
  }

  managerAlertEmpty.classList.add('hidden');
  managerAlertList.innerHTML = activeMembers.map((member) => {
    const risk = riskMeta(member.risk_level);
    return `
      <div class="manager-alert-item">
        <div class="manager-alert-main">
          <div class="manager-alert-head">
            <strong>${escapeHtml(member.name)}</strong>
            <span class="chip ${risk.className}">${escapeHtml(risk.label)}</span>
            <span class="chip danger">未解消</span>
          </div>
          <div class="card-sub">検知日: ${escapeHtml(formatDate(member.last_alert_date))} / 確信度: ${escapeHtml(formatConfidence(member.confidence))}</div>
          <div class="manager-alert-reason">${escapeHtml(clampText(member.reason))}</div>
        </div>
        <div class="manager-alert-actions">
          <button class="btn btn-primary btn-sm" type="button" data-resolve-alert-id="${escapeHtml(member.alert_id)}" data-member-name="${escapeHtml(member.name)}">対応完了</button>
          <a class="btn btn-secondary btn-sm" href="${buildDetailHref(member)}">詳細</a>
        </div>
      </div>
    `;
  }).join('');
}


async function refreshAlertSection() {
  const alertPayload = await apiFetch('/alerts/team-risk?days=14');
  setAlertSection(alertPayload);
  return alertPayload;
}

async function handleResolveAlert(alertId, memberName, button) {
  if (!alertId) return;
  if (managerAlertActionStatus) {
    managerAlertActionStatus.textContent = `${memberName || '対象メンバー'} の対応完了を更新しています…`;
  }
  if (button) button.disabled = true;

  try {
    await apiPost(`/alerts/${encodeURIComponent(alertId)}/resolve`, { is_resolved: true });
    await refreshAlertSection();
    if (managerAlertActionStatus) {
      managerAlertActionStatus.textContent = `${memberName || '対象メンバー'} を対応完了に更新しました。`;
    }
  } catch (error) {
    if (managerAlertActionStatus) {
      managerAlertActionStatus.textContent = error.message || '対応完了の更新に失敗しました。';
    }
    if (button) button.disabled = false;
  }
}

if (managerAlertList) {
  managerAlertList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-resolve-alert-id]');
    if (!button) return;
    handleResolveAlert(button.dataset.resolveAlertId, button.dataset.memberName, button);
  });
}

function cleanValues(values) {
  return values.filter((value) => typeof value === 'number');
}

function lastNumeric(values) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (typeof values[i] === 'number') return values[i];
  }
  return null;
}

function firstNumeric(values) {
  for (let i = 0; i < values.length; i += 1) {
    if (typeof values[i] === 'number') return values[i];
  }
  return null;
}

function volatility(values) {
  const numeric = cleanValues(values);
  if (numeric.length <= 1) return 0;
  return Math.max(...numeric) - Math.min(...numeric);
}

function average(values) {
  const numeric = cleanValues(values);
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function latestMissing(values) {
  let count = 0;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (typeof values[i] === 'number') break;
    count += 1;
  }
  return count;
}

function missingCount(values) {
  return values.filter((value) => typeof value !== 'number').length;
}

function delta(values) {
  const first = firstNumeric(values);
  const last = lastNumeric(values);
  if (first == null || last == null) return 0;
  return last - first;
}

function buildDetailHref(member) {
  const params = new URLSearchParams({
    user_id: String(member.user_id || member.id),
    from: 'dashboard-manager',
    name: member.name || '対象メンバー',
    role: member.role || 'User',
    department: member.department || '-',
    manager: member.manager || '-',
  });
  return `./member-detail.html?${params.toString()}`;
}

function setSummaryCards(summary) {
  if (!summaryRoot) return;
  const items = [
    ['配下メンバー', summary.memberCountText],
    ['高リスク', summary.highRiskText],
    ['未回答あり', summary.missingText],
    ['平均スコア', summary.avgScoreText],
  ];
  summaryRoot.innerHTML = items.map(([label, value]) => `
    <article class="card summary-stat-card">
      <div class="card-sub">${escapeHtml(label)}</div>
      <div class="summary-stat-value">${escapeHtml(value)}</div>
    </article>
  `).join('');
}

function setRiskSection(statusMembers, pulseMap) {
  const counters = { high: 0, medium: 0, low: 0, unknown: 0 };
  statusMembers.forEach((member) => {
    const meta = riskMeta(member.risk_level, member.latest_survey_score);
    counters[meta.key] = (counters[meta.key] || 0) + 1;
  });

  riskDistributionChips.innerHTML = [
    { label: `高 ${counters.high || 0}`, className: 'danger' },
    { label: `中 ${counters.medium || 0}`, className: 'warning' },
    { label: `低 ${counters.low || 0}`, className: 'success' },
  ].map((item) => `<span class="chip ${item.className}">${escapeHtml(item.label)}</span>`).join('');

  const highRiskMembers = statusMembers
    .filter((member) => normalizeRisk(member.risk_level, member.latest_survey_score) === 'high')
    .sort((a, b) => (a.latest_survey_score ?? 99) - (b.latest_survey_score ?? 99))
    .slice(0, 4);

  const badgeText = counters.high > 0 ? `高リスク ${counters.high}名` : '安定';
  riskStatusBadge.textContent = badgeText;
  riskStatusBadge.className = `status-badge ${counters.high > 0 ? 'error' : 'success'}`;

  if (!highRiskMembers.length) {
    managerRiskList.innerHTML = '';
    managerRiskEmpty.classList.remove('hidden');
    return;
  }

  managerRiskEmpty.classList.add('hidden');
  managerRiskList.innerHTML = highRiskMembers.map((member) => {
    const pulse = pulseMap.get(String(member.user_id)) || {};
    return `
      <div class="manager-risk-item">
        <div>
          <div class="manager-risk-name-row">
            <strong>${escapeHtml(member.name)}</strong>
            <span class="chip danger">高リスク</span>
          </div>
          <div class="card-sub">最新スコア: ${escapeHtml(member.latest_survey_score ?? '-')} / 最終回答日: ${escapeHtml(formatDate(pulse.latestDate))}</div>
          <div class="manager-risk-memo">${escapeHtml(pulse.latestMemo || '最新メモはまだありません。')}</div>
        </div>
        <a class="btn btn-secondary btn-sm" href="${buildDetailHref({ ...member, department: pulse.department, manager: pulse.manager })}">詳細</a>
      </div>
    `;
  }).join('');
}

function sx(index, labelCount) {
  return dims.left + (plotWidth / Math.max(labelCount - 1, 1)) * index;
}
function sy(value) {
  return dims.top + ((5 - value) / 4) * plotHeight;
}
function createSvg(name, attrs = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text != null) node.textContent = text;
  return node;
}

function pathD(values, labels) {
  const points = values.map((value, index) => ({ value, index })).filter((point) => typeof point.value === 'number');
  return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${sx(point.index, labels.length)},${sy(point.value)}`).join(' ');
}

function selectFocusMembers(datasets, membersById) {
  const metas = datasets.map((dataset) => {
    const latest = lastNumeric(dataset.data);
    return {
      dataset,
      latest,
      risk: normalizeRisk(membersById.get(String(dataset.user_id))?.risk_level, latest),
      volatility: volatility(dataset.data),
      avg: average(dataset.data),
      latestMissing: latestMissing(dataset.data),
      totalMissing: missingCount(dataset.data),
      delta: delta(dataset.data),
    };
  });

  const pick = [];
  const buckets = [
    metas.filter((item) => item.risk === 'high' || (item.latest ?? 99) <= 2).sort((a, b) => (a.latest ?? 99) - (b.latest ?? 99)),
    metas.filter((item) => item.volatility >= 2 || item.delta <= -2).sort((a, b) => b.volatility - a.volatility),
    metas.filter((item) => item.latestMissing >= 2 || item.totalMissing >= 2).sort((a, b) => b.latestMissing - a.latestMissing),
    metas.filter((item) => item.avg >= 4 && item.volatility <= 1).sort((a, b) => b.avg - a.avg),
  ];

  buckets.forEach((bucket) => {
    bucket.forEach((item) => {
      if (pick.length < 5 && !pick.some((selected) => selected.dataset.user_id === item.dataset.user_id)) {
        pick.push(item);
      }
    });
  });

  metas.forEach((item) => {
    if (pick.length < 5 && !pick.some((selected) => selected.dataset.user_id === item.dataset.user_id)) {
      pick.push(item);
    }
  });

  return pick.slice(0, 5);
}

function renderMiniChart(teamHealth, statusMembers) {
  if (!managerMiniTrendSvg || !managerMiniTrendStatus) return;
  if (!teamHealth?.labels?.length || !teamHealth?.datasets?.length) {
    if (managerAlertBadge) {
      managerAlertBadge.textContent = '取得失敗';
      managerAlertBadge.className = 'status-badge error';
    }
    if (managerAlertSummaryChips) managerAlertSummaryChips.innerHTML = '';
    if (managerAlertList) managerAlertList.innerHTML = '';
    if (managerAlertEmpty) {
      managerAlertEmpty.classList.remove('hidden');
      managerAlertEmpty.textContent = error.message || 'アラーム情報を取得できませんでした。';
    }
    managerMiniTrendSvg.innerHTML = '';
    managerMiniChartLegend.innerHTML = '';
    managerMiniTrendStatus.textContent = 'グラフ対象データがまだありません。';
    return;
  }

  const membersById = new Map(statusMembers.map((member) => [String(member.user_id), member]));
  const focusMembers = selectFocusMembers(teamHealth.datasets, membersById);
  if (!focusMembers.length) {
    managerMiniTrendSvg.innerHTML = '';
    managerMiniChartLegend.innerHTML = '';
    managerMiniTrendStatus.textContent = '注目メンバーを選定できませんでした。';
    return;
  }

  managerMiniTrendStatus.textContent = '注目メンバーを表示中';
  managerMiniChartLegend.innerHTML = focusMembers.map((item, index) => {
    const member = membersById.get(String(item.dataset.user_id));
    const risk = riskMeta(member?.risk_level, item.latest);
    return `
      <span class="mini-legend-chip">
        <span class="mini-legend-dot" style="background:${palette[index % palette.length]}"></span>
        ${escapeHtml(item.dataset.label)}
        <span class="chip ${risk.className}">${escapeHtml(risk.label)}</span>
      </span>
    `;
  }).join('');

  managerMiniTrendSvg.innerHTML = '';
  managerMiniTrendSvg.appendChild(createSvg('rect', { x: 0, y: 0, width: dims.width, height: dims.height, fill: '#fff' }));
  managerMiniTrendSvg.appendChild(createSvg('rect', { x: dims.left, y: sy(2), width: plotWidth, height: sy(1) - sy(2), fill: 'rgba(214,69,69,0.08)' }));

  [1, 2, 3, 4, 5].forEach((value) => {
    managerMiniTrendSvg.appendChild(createSvg('line', {
      x1: dims.left,
      y1: sy(value),
      x2: dims.width - dims.right,
      y2: sy(value),
      stroke: '#e4ebf5',
      'stroke-width': 1,
    }));
    managerMiniTrendSvg.appendChild(createSvg('text', {
      x: dims.left - 14,
      y: sy(value) + 4,
      'text-anchor': 'end',
      'font-size': 12,
      fill: '#6c7f9b',
    }, String(value)));
  });

  teamHealth.labels.forEach((label, index) => {
    if (index % 2 !== 0 && index !== teamHealth.labels.length - 1) return;
    managerMiniTrendSvg.appendChild(createSvg('text', {
      x: sx(index, teamHealth.labels.length),
      y: dims.height - 10,
      'text-anchor': 'middle',
      'font-size': 11,
      fill: '#7f90aa',
    }, label));
  });

  focusMembers.forEach((item, index) => {
    const color = palette[index % palette.length];
    managerMiniTrendSvg.appendChild(createSvg('path', {
      d: pathD(item.dataset.data, teamHealth.labels),
      fill: 'none',
      stroke: color,
      'stroke-width': 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }));

    item.dataset.data.forEach((value, pointIndex) => {
      if (typeof value !== 'number') return;
      managerMiniTrendSvg.appendChild(createSvg('circle', {
        cx: sx(pointIndex, teamHealth.labels.length),
        cy: sy(value),
        r: value <= 2 ? 5.5 : 4,
        fill: '#fff',
        stroke: color,
        'stroke-width': value <= 2 ? 3 : 2,
      }));
    });
  });
}

function renderTeamTable(statusMembers, pulseMap) {
  const rows = [...statusMembers].sort((a, b) => {
    const riskWeight = { high: 0, medium: 1, low: 2, unknown: 3 };
    const riskA = normalizeRisk(a.risk_level, a.latest_survey_score);
    const riskB = normalizeRisk(b.risk_level, b.latest_survey_score);
    return (riskWeight[riskA] ?? 9) - (riskWeight[riskB] ?? 9) || (a.latest_survey_score ?? 99) - (b.latest_survey_score ?? 99);
  });

  managerTeamTableWrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>氏名</th>
            <th>リスク</th>
            <th>最新スコア</th>
            <th>最終回答日</th>
            <th>最新メモ</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((member) => {
            const risk = riskMeta(member.risk_level, member.latest_survey_score);
            const pulse = pulseMap.get(String(member.user_id)) || {};
            return `
              <tr>
                <td><strong>${escapeHtml(member.name)}</strong></td>
                <td><span class="chip ${risk.className}">${escapeHtml(risk.label)}</span></td>
                <td>${escapeHtml(member.latest_survey_score ?? '-')}</td>
                <td>${escapeHtml(formatDate(pulse.latestDate))}</td>
                <td class="manager-table-memo">${escapeHtml((pulse.latestMemo || '-').slice(0, 42))}</td>
                <td><a class="btn btn-secondary btn-sm" href="${buildDetailHref(member)}">詳細</a></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function fetchLatestPulse(memberId) {
  try {
    const payload = await apiFetch(`/pulse/?user_id=${encodeURIComponent(memberId)}`);
    const history = Array.isArray(payload) ? payload : [];
    const latest = history[0] || null;
    return {
      latestDate: latest?.survey_date || latest?.created_at || null,
      latestMemo: latest?.memo || '',
    };
  } catch (_) {
    return { latestDate: null, latestMemo: '' };
  }
}

async function init() {
  if (!summaryRoot) return;

  try {
    const [teamStatus, teamHealth, teamAlerts] = await Promise.all([
      apiFetch('/analytics/team-status'),
      apiFetch('/analytics/team-health?days=14'),
      apiFetch('/alerts/team-risk?days=14'),
    ]);

    const statusMembers = Array.isArray(teamStatus?.members) ? teamStatus.members : [];
    const pulseResults = await Promise.all(statusMembers.map(async (member) => [String(member.user_id), await fetchLatestPulse(member.user_id)]));
    const pulseMap = new Map(pulseResults);

    const highRiskCount = statusMembers.filter((member) => normalizeRisk(member.risk_level, member.latest_survey_score) === 'high').length;
    const missingCountValue = (Array.isArray(teamHealth?.datasets) ? teamHealth.datasets : []).filter((dataset) => latestMissing(dataset.data || []) >= 2).length;
    const avg = Number(teamStatus?.team_summary?.avg_survey_score);

    setSummaryCards({
      memberCountText: `${statusMembers.length}名`,
      highRiskText: `${highRiskCount}名`,
      missingText: `${missingCountValue}名`,
      avgScoreText: Number.isFinite(avg) ? avg.toFixed(1) : '-',
    });

    setRiskSection(statusMembers, pulseMap);
    setAlertSection(teamAlerts);
    renderMiniChart(teamHealth, statusMembers);
    renderTeamTable(statusMembers, pulseMap);
    managerTeamTableStatus.textContent = statusMembers.length ? `${statusMembers.length}名の最新状況を表示しています。` : '配下メンバーがまだいません。';
  } catch (error) {
    setSummaryCards({ memberCountText: '-', highRiskText: '-', missingText: '-', avgScoreText: '-' });
    riskStatusBadge.textContent = '取得失敗';
    riskStatusBadge.className = 'status-badge error';
    riskDistributionChips.innerHTML = '';
    managerRiskList.innerHTML = '';
    managerRiskEmpty.classList.remove('hidden');
    managerRiskEmpty.textContent = error.message || 'チーム情報を取得できませんでした。';
    if (managerAlertBadge) {
      managerAlertBadge.textContent = '取得失敗';
      managerAlertBadge.className = 'status-badge error';
    }
    if (managerAlertSummaryChips) managerAlertSummaryChips.innerHTML = '';
    if (managerAlertList) managerAlertList.innerHTML = '';
    if (managerAlertEmpty) {
      managerAlertEmpty.classList.remove('hidden');
      managerAlertEmpty.textContent = error.message || 'アラーム情報を取得できませんでした。';
    }
    managerMiniTrendSvg.innerHTML = '';
    managerMiniChartLegend.innerHTML = '';
    managerMiniTrendStatus.textContent = error.message || 'グラフ情報を取得できませんでした。';
    managerTeamTableWrap.innerHTML = '';
    managerTeamTableStatus.textContent = error.message || '一覧を取得できませんでした。';
    managerTeamTableStatus.classList.add('error');
  }
}

init();
