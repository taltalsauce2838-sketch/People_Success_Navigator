
(function () {
  const API_BASE_URL = "http://127.0.0.1:8000/api/v1";
  const svg = document.getElementById('teamMemberTrendSvg');
  const presetsEl = document.getElementById('teamChartPresets');
  const tooltip = document.getElementById('teamChartTooltip');
  const searchInput = document.getElementById('memberSearchInput');
  const memberSelect = document.getElementById('memberSelect');
  const addMemberButton = document.getElementById('addMemberButton');
  const selectedMemberChips = document.getElementById('selectedMemberChips');
  const listEl = document.getElementById('teamMemberList');
  const listStatusEl = document.getElementById('teamListStatus');
  const chartStatusEl = document.getElementById('teamChartStatus');
  const summaryStatsEl = document.getElementById('team-summary-stats');
  const summaryCaptionEl = document.getElementById('team-summary-caption');
  const memberListCaptionEl = document.getElementById('member-list-caption');
  if (!svg || !presetsEl || !tooltip || !searchInput || !memberSelect || !addMemberButton || !selectedMemberChips || !listEl) return;

  const state = {
    hoverIndex: null,
    searchTerm: '',
    activePreset: 'focus',
    visible: new Set(),
    currentUser: null,
    labels: [],
    members: [],
    pulseCache: new Map(),
    pulsePending: new Set(),
  };

  const dims = { left: 56, right: 24, top: 24, bottom: 38, width: 980, height: 340 };
  const plotWidth = dims.width - dims.left - dims.right;
  const plotHeight = dims.height - dims.top - dims.bottom;
  const palette = ['#4c6ef5', '#f59f00', '#12b886', '#e64980', '#7950f2', '#228be6', '#2b8a3e', '#c92a2a', '#5f3dc4', '#d9480f'];

  const presets = [
    { id: 'focus', label: '注目', resolve: getFocusIds },
    { id: 'risk', label: '高リスク', resolve: getHighRiskIds },
    { id: 'volatile', label: '変動大', resolve: getVolatileIds },
    { id: 'missing', label: '未回答', resolve: getMissingIds },
    { id: 'manual', label: '手動選択', resolve: () => Array.from(state.visible) },
  ];

  function getToken() {
    return localStorage.getItem('access_token');
  }

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
      method: 'GET',
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

  function roleValue(role) {
    if (role && typeof role === 'object' && 'value' in role) return role.value;
    return String(role || '');
  }

  function normalizeStatusRisk(value, score) {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('high') || raw.includes('critical')) return 'high';
    if (raw.includes('medium') || raw.includes('mid') || raw.includes('warning')) return 'medium';
    if (raw.includes('low') || raw.includes('stable')) return 'low';
    const numeric = Number(score);
    if (!Number.isFinite(numeric)) return 'unknown';
    if (numeric <= 2) return 'high';
    if (numeric === 3) return 'medium';
    return 'low';
  }

  function riskMeta(value, score) {
    const risk = normalizeStatusRisk(value, score);
    if (risk === 'high') return { label: '高', className: 'danger' };
    if (risk === 'medium') return { label: '中', className: 'warning' };
    if (risk === 'low') return { label: '低', className: 'success' };
    return { label: '未判定', className: '' };
  }

  function formatDate(value) {
    if (!value) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function cleanValues(values) {
    return values.filter(v => typeof v === 'number');
  }
  function lastNumeric(values) {
    for (let i = values.length - 1; i >= 0; i--) {
      if (typeof values[i] === 'number') return values[i];
    }
    return null;
  }
  function firstNumeric(values) {
    for (let i = 0; i < values.length; i++) {
      if (typeof values[i] === 'number') return values[i];
    }
    return null;
  }
  function missingCount(values) {
    return values.filter(v => typeof v !== 'number').length;
  }
  function latestStreakMissing(values) {
    let count = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (typeof values[i] === 'number') break;
      count += 1;
    }
    return count;
  }
  function volatility(values) {
    const numeric = cleanValues(values);
    if (numeric.length <= 1) return 0;
    return Math.max(...numeric) - Math.min(...numeric);
  }
  function trendDelta(values) {
    const first = firstNumeric(values);
    const last = lastNumeric(values);
    if (first == null || last == null) return 0;
    return last - first;
  }
  function average(values) {
    const numeric = cleanValues(values);
    if (!numeric.length) return 0;
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  }

  function memberMeta(member) {
    const latest = lastNumeric(member.values) ?? member.latestSurveyScore ?? 0;
    return {
      latest,
      volatility: volatility(member.values),
      missing: missingCount(member.values),
      latestMissing: latestStreakMissing(member.values),
      delta: trendDelta(member.values),
      average: average(member.values),
      risk: normalizeStatusRisk(member.riskLevel, latest),
    };
  }

  function getHighRiskIds() {
    return state.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.risk === 'high' || member.latest <= 2)
      .sort((a, b) => a.latest - b.latest || b.volatility - a.volatility)
      .map(member => member.id);
  }

  function getVolatileIds() {
    return state.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.volatility >= 2 || member.delta <= -2)
      .sort((a, b) => b.volatility - a.volatility || a.delta - b.delta)
      .map(member => member.id);
  }

  function getMissingIds() {
    return state.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.latestMissing >= 2 || member.missing >= 2)
      .sort((a, b) => b.latestMissing - a.latestMissing || b.missing - a.missing)
      .map(member => member.id);
  }

  function getStableIds() {
    return state.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.average >= 4 && member.volatility <= 1)
      .sort((a, b) => b.average - a.average)
      .map(member => member.id);
  }

  function getFocusIds() {
    const result = [];
    [getHighRiskIds(), getVolatileIds(), getMissingIds(), getStableIds()].forEach(bucket => {
      bucket.forEach(id => {
        if (result.length < 6 && !result.includes(id)) result.push(id);
      });
    });
    state.members.forEach(member => {
      if (result.length < 6 && !result.includes(member.id)) result.push(member.id);
    });
    return result.slice(0, 6);
  }

  function sx(i) {
    return dims.left + (plotWidth / Math.max(state.labels.length - 1, 1)) * i;
  }
  function sy(v) {
    return dims.top + ((5 - v) / 4) * plotHeight;
  }
  function el(name, attrs = {}, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text != null) node.textContent = text;
    return node;
  }
  function pathD(values) {
    const points = values.map((v, i) => ({ v, i })).filter(point => typeof point.v === 'number');
    return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${sx(point.i)},${sy(point.v)}`).join(' ');
  }

  function buildDetailHref(member) {
    const params = new URLSearchParams({
      user_id: String(member.id),
      from: 'team-overview',
      name: member.name || '対象メンバー',
      role: member.role || 'User',
      department: member.department || '-',
      manager: member.manager || '-',
    });
    return `./member-detail.html?${params.toString()}`;
  }

  function getPulseDetail(memberId) {
    return state.pulseCache.get(String(memberId)) || null;
  }

  async function fetchPulseDetail(memberId) {
    const key = String(memberId);
    if (state.pulseCache.has(key) || state.pulsePending.has(key)) return;
    state.pulsePending.add(key);
    try {
      const payload = await apiFetch(`/pulse/?user_id=${encodeURIComponent(memberId)}`);
      const history = Array.isArray(payload) ? payload : [];
      const latest = history[0] || null;
      state.pulseCache.set(key, {
        latestDate: latest?.survey_date || null,
        latestMemo: latest?.memo || '',
      });
    } catch (_) {
      state.pulseCache.set(key, { latestDate: null, latestMemo: '' });
    } finally {
      state.pulsePending.delete(key);
      renderList();
    }
  }

  async function preloadPulseDetails(memberIds) {
    const ids = memberIds.filter(id => !state.pulseCache.has(String(id)));
    const concurrency = 4;
    let index = 0;

    async function worker() {
      while (index < ids.length) {
        const current = ids[index++];
        await fetchPulseDetail(current);
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  }

  function renderSummary() {
    const count = state.members.length;
    const highRiskCount = state.members.filter(member => normalizeStatusRisk(member.riskLevel, member.latestSurveyScore) === 'high').length;
    const withScores = state.members.filter(member => Number.isFinite(Number(member.latestSurveyScore)));
    const avg = withScores.length
      ? (withScores.reduce((sum, member) => sum + Number(member.latestSurveyScore), 0) / withScores.length).toFixed(1)
      : '-';
    const missingCountMembers = state.members.filter(member => memberMeta(member).latestMissing >= 2 || memberMeta(member).missing >= 2).length;

    summaryStatsEl.innerHTML = `
      <div class="stat-card solid primary"><div class="stat-label dark">対象メンバー数</div><div class="stat-value dark">${count}</div></div>
      <div class="stat-card solid"><div class="stat-label dark">高リスク</div><div class="stat-value dark">${highRiskCount}</div></div>
      <div class="stat-card solid"><div class="stat-label dark">平均スコア</div><div class="stat-value dark">${escapeHtml(avg)}</div></div>
      <div class="stat-card solid"><div class="stat-label dark">未回答あり</div><div class="stat-value dark">${missingCountMembers}</div></div>
    `;

    const managerName = state.currentUser?.name || '担当マネージャー';
    summaryCaptionEl.textContent = `${managerName} 配下 ${count} 名の最新状態を表示しています。既存の analytics/team-status と analytics/team-health?days=14 を利用しています。`;
    memberListCaptionEl.textContent = `${count} 件を表示しています。latest_survey_score と risk_level を基準に、詳細な日付・メモは pulse API から補完しています。`;
  }

  function renderPresetButtons() {
    presetsEl.innerHTML = '';
    presets.forEach(preset => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `preset-pill${state.activePreset === preset.id ? ' active' : ''}`;
      button.textContent = preset.label;
      button.addEventListener('click', () => {
        state.activePreset = preset.id;
        state.visible = new Set(preset.resolve());
        syncPicker();
        renderPresetButtons();
        renderSelectedChips();
        renderChart();
      });
      presetsEl.appendChild(button);
    });
  }

  function syncPicker() {
    const term = state.searchTerm.trim().toLowerCase();
    memberSelect.innerHTML = '<option value="">メンバーを選択してください</option>';
    state.members
      .filter(member => !term || member.name.toLowerCase().includes(term))
      .forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
      });
  }

  function renderSelectedChips() {
    selectedMemberChips.innerHTML = '';
    Array.from(state.visible)
      .map(id => state.members.find(member => String(member.id) === String(id)))
      .filter(Boolean)
      .forEach(member => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'selected-member-chip';
        chip.innerHTML = `<span class="legend-dot" style="background:${member.color}"></span><span>${escapeHtml(member.name)}</span><span class="chip-close">×</span>`;
        chip.addEventListener('click', () => {
          if (state.visible.size <= 1) return;
          state.visible.delete(member.id);
          state.activePreset = 'manual';
          renderPresetButtons();
          renderSelectedChips();
          renderChart();
        });
        selectedMemberChips.appendChild(chip);
      });
  }

  function renderList() {
    if (!state.members.length) {
      listStatusEl.textContent = '表示できる配下メンバーがありません。';
      listEl.innerHTML = '<div class="empty-state">配下メンバーが存在しません。</div>';
      return;
    }

    listStatusEl.textContent = '一覧を表示中です。最新メモと最終回答日は pulse API から補完しています。';
    listEl.innerHTML = state.members.map(member => {
      const pulseDetail = getPulseDetail(member.id);
      const risk = riskMeta(member.riskLevel, member.latestSurveyScore);
      const latestDate = pulseDetail?.latestDate ? formatDate(pulseDetail.latestDate) : (state.pulsePending.has(String(member.id)) ? '取得中…' : '-');
      const latestMemo = pulseDetail?.latestMemo ? pulseDetail.latestMemo : (state.pulsePending.has(String(member.id)) ? '取得中…' : 'メモなし');
      return `
        <article class="employee-row-card team-row-card">
          <div class="employee-row-top">
            <div>
              <div class="employee-row-title">${escapeHtml(member.name)}</div>
              <div class="employee-row-sub">${escapeHtml(member.role || 'User')} ・ ${escapeHtml(member.department || '-')}</div>
            </div>
            <div class="employee-row-chip-group">
              <span class="chip ${escapeHtml(risk.className)}">離職リスク ${escapeHtml(risk.label)}</span>
            </div>
          </div>
          <div class="employee-row-meta-grid team-row-meta-grid">
            <div><span class="employee-meta-label">最新スコア</span><strong>${escapeHtml(member.latestSurveyScore ?? '-')}</strong></div>
            <div><span class="employee-meta-label">最終回答日</span><strong>${escapeHtml(latestDate)}</strong></div>
            <div><span class="employee-meta-label">直属上司</span><strong>${escapeHtml(member.manager || '-')}</strong></div>
            <div class="team-row-note-wrap"><span class="employee-meta-label">最新メモ</span><div class="employee-row-note">${escapeHtml(latestMemo)}</div></div>
          </div>
          <div class="employee-row-actions">
            <a class="btn btn-secondary" href="${buildDetailHref(member)}">詳細へ</a>
          </div>
        </article>
      `;
    }).join('');
  }

  function showTooltip(clientX, clientY, index) {
    const rows = state.members
      .filter(member => state.visible.has(member.id))
      .map(member => {
        const value = member.values[index];
        return `<div class="tooltip-row"><span><i class="legend-dot" style="background:${member.color}"></i>${escapeHtml(member.name)}</span><strong>${typeof value === 'number' ? value : '未回答'}</strong></div>`;
      })
      .join('');
    tooltip.innerHTML = `<div class="tooltip-date">${escapeHtml(state.labels[index] || '')}</div>${rows}`;
    const rect = svg.getBoundingClientRect();
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(clientX - rect.left + 18, rect.width - 180)}px`;
    tooltip.style.top = `${Math.max(clientY - rect.top - 10, 10)}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function renderChart() {
    svg.innerHTML = '';

    if (!state.labels.length || !state.members.length) {
      chartStatusEl.textContent = 'グラフ表示に必要なデータがありません。';
      return;
    }

    chartStatusEl.textContent = `表示中 ${state.visible.size} 名。プリセットまたは検索追加で切り替えできます。`;

    svg.appendChild(el('rect', { x: dims.left, y: sy(2), width: plotWidth, height: sy(1) - sy(2), class: 'zone-low' }));
    svg.appendChild(el('rect', { x: dims.left, y: sy(3), width: plotWidth, height: sy(2) - sy(3), class: 'zone-mid' }));
    svg.appendChild(el('rect', { x: dims.left, y: sy(5), width: plotWidth, height: sy(3) - sy(5), class: 'zone-high' }));

    const gh = el('g', { class: 'grid horizontal' });
    [1, 2, 3, 4, 5].forEach(v => gh.appendChild(el('line', { x1: dims.left, y1: sy(v), x2: dims.width - dims.right, y2: sy(v) })));
    svg.appendChild(gh);

    const gv = el('g', { class: 'grid vertical subtle' });
    state.labels.forEach((_, i) => gv.appendChild(el('line', { x1: sx(i), y1: dims.top, x2: sx(i), y2: dims.height - dims.bottom })));
    svg.appendChild(gv);

    const yl = el('g', { class: 'y-labels' });
    [1, 2, 3, 4, 5].forEach(v => yl.appendChild(el('text', { x: 28, y: sy(v) + 5, class: 'axis-label' }, String(v))));
    svg.appendChild(yl);

    const xl = el('g', { class: 'x-labels dense' });
    state.labels.forEach((label, i) => xl.appendChild(el('text', { x: sx(i), y: dims.height - 14, class: 'axis-label', 'text-anchor': 'middle' }, label)));
    svg.appendChild(xl);

    const focusLayer = el('g', { class: 'focus-layer' });
    if (Number.isInteger(state.hoverIndex)) {
      focusLayer.appendChild(el('line', { x1: sx(state.hoverIndex), y1: dims.top, x2: sx(state.hoverIndex), y2: dims.height - dims.bottom, class: 'focus-guide' }));
    }

    state.members.filter(member => state.visible.has(member.id)).forEach(member => {
      svg.appendChild(el('path', { d: pathD(member.values), class: 'member-line', stroke: member.color }));
      member.values.forEach((value, i) => {
        if (typeof value !== 'number') return;
        const cx = sx(i), cy = sy(value);
        if (value <= 2) svg.appendChild(el('circle', { cx, cy, r: 9, class: 'risk-ring' }));
        svg.appendChild(el('circle', { cx, cy, r: value <= 2 ? 6 : 4.5, class: `member-point${value <= 2 ? ' risk-high' : ''}`, fill: member.color }));
        if (Number.isInteger(state.hoverIndex) && state.hoverIndex === i) {
          focusLayer.appendChild(el('circle', { cx, cy, r: 6.5, class: 'focus-dot', fill: member.color }));
        }
      });
    });
    svg.appendChild(focusLayer);

    const hit = el('g', { class: 'hover-layer' });
    state.labels.forEach((_, i) => {
      const x = sx(i);
      const prev = i === 0 ? dims.left : (sx(i - 1) + x) / 2;
      const next = i === state.labels.length - 1 ? dims.width - dims.right : (x + sx(i + 1)) / 2;
      const rect = el('rect', { x: prev, y: dims.top, width: next - prev, height: plotHeight, class: 'hover-column' });
      rect.addEventListener('mousemove', (e) => {
        state.hoverIndex = i;
        renderChart();
        showTooltip(e.clientX, e.clientY, i);
      });
      rect.addEventListener('mouseleave', () => {
        state.hoverIndex = null;
        renderChart();
        hideTooltip();
      });
      hit.appendChild(rect);
    });
    svg.appendChild(hit);
  }

  function applyData(currentUser, teamStatus, teamHealth) {
    const labels = Array.isArray(teamHealth?.labels) ? teamHealth.labels : [];
    const statusMembers = Array.isArray(teamStatus?.members) ? teamStatus.members : [];
    const dataSets = Array.isArray(teamHealth?.datasets) ? teamHealth.datasets : [];

    const managerDepartment = currentUser?.department_id ? `Department ID ${currentUser.department_id}` : '-';
    const managerName = currentUser?.name || '-';

    state.currentUser = currentUser;
    state.labels = labels;
    state.members = statusMembers.map((member, index) => {
      const dataset = dataSets.find(item => String(item.user_id) === String(member.user_id)) || dataSets.find(item => item.label === member.name) || {};
      return {
        id: member.user_id,
        name: member.name,
        role: 'User',
        department: managerDepartment,
        manager: managerName,
        riskLevel: member.risk_level,
        latestSurveyScore: member.latest_survey_score,
        values: Array.isArray(dataset.data) ? dataset.data : [],
        color: palette[index % palette.length],
      };
    });

    state.activePreset = 'focus';
    state.visible = new Set(getFocusIds());

    renderSummary();
    syncPicker();
    renderPresetButtons();
    renderSelectedChips();
    renderList();
    renderChart();
  }

  async function initialize() {
    try {
      const [currentUser, teamStatus, teamHealth] = await Promise.all([
        apiFetch('/users/me'),
        apiFetch('/analytics/team-status'),
        apiFetch('/analytics/team-health?days=14'),
      ]);

      if (!['manager', 'admin'].includes(roleValue(currentUser.role))) {
        listStatusEl.textContent = 'この画面は manager / admin 向けです。';
        chartStatusEl.textContent = 'この画面は manager / admin 向けです。';
        listEl.innerHTML = '<div class="empty-state">閲覧権限がありません。</div>';
        return;
      }

      applyData(currentUser, teamStatus, teamHealth);
      const memberIds = state.members.map(member => member.id);
      preloadPulseDetails(memberIds);
    } catch (error) {
      const message = error?.message || 'チーム状況の取得に失敗しました。';
      listStatusEl.textContent = message;
      chartStatusEl.textContent = message;
      listEl.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      summaryCaptionEl.textContent = message;
    }
  }

  searchInput.addEventListener('input', () => {
    state.searchTerm = searchInput.value;
    syncPicker();
  });

  addMemberButton.addEventListener('click', () => {
    const id = memberSelect.value;
    if (!id) return;
    state.visible.add(Number.isNaN(Number(id)) ? id : Number(id));
    state.activePreset = 'manual';
    renderPresetButtons();
    renderSelectedChips();
    renderChart();
    memberSelect.value = '';
  });

  document.addEventListener('DOMContentLoaded', initialize);
})();
