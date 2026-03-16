(function () {
  const svg = document.getElementById('teamMemberTrendSvg');
  const presetsEl = document.getElementById('teamChartPresets');
  const tooltip = document.getElementById('teamChartTooltip');
  const searchInput = document.getElementById('memberSearchInput');
  const memberSelect = document.getElementById('memberSelect');
  const addMemberButton = document.getElementById('addMemberButton');
  const selectedMemberChips = document.getElementById('selectedMemberChips');
  if (!svg || !presetsEl || !tooltip || !searchInput || !memberSelect || !addMemberButton || !selectedMemberChips) return;

  const data = {
    labels: ['3/02','3/03','3/04','3/05','3/06','3/07','3/08','3/09','3/10','3/11','3/12','3/13','3/14','3/15'],
    members: [
      { id:'a', name:'山田 健太', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'開発は順調。学習面も安定。', values:[4,4,3,4,4,5,4,3,4,4,5,5,4,4] },
      { id:'b', name:'鈴木 花子', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'やや疲労感あり。相談は可能。', values:[2,3,3,2,3,3,2,3,3,2,3,3,3,3] },
      { id:'c', name:'田辺 一郎', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'不安感あり。面談設定を推奨。', values:[3,2,2,3,2,2,3,2,2,1,2,2,2,2] },
      { id:'d', name:'高橋 美咲', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'相談量が増加。学習進捗は維持。', values:[5,4,4,3,4,5,4,3,4,3,4,4,3,4] },
      { id:'e', name:'佐藤 悠', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'終盤に負荷増。残業注意。', values:[4,4,4,4,4,3,3,3,4,4,3,2,2,2] },
      { id:'f', name:'中村 葵', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'概ね安定。週前半はやや低下。', values:[3,3,4,4,3,3,4,4,4,4,4,4,4,4] },
      { id:'g', name:'小林 直人', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'直近3営業日は未回答。フォロー推奨。', values:[4,4,4,3,4,4,3,4,4,3,null,null,null,null] },
      { id:'h', name:'伊藤 真央', role:'User', department:'開発1部', manager:'田中 太郎', latestMemo:'安定推移。比較対象向き。', values:[5,5,4,5,5,4,5,5,5,4,5,5,4,5] }
    ]
  };

  const palette = ['#4c6ef5', '#f59f00', '#12b886', '#e64980', '#7950f2', '#228be6', '#2b8a3e', '#c92a2a'];
  data.members = data.members.map((member, index) => ({ ...member, color: palette[index % palette.length] }));

  const dims = { left: 56, right: 24, top: 24, bottom: 38, width: 980, height: 340 };
  const plotWidth = dims.width - dims.left - dims.right;
  const plotHeight = dims.height - dims.top - dims.bottom;

  const presets = [
    { id:'focus', label:'注目', resolve: getFocusIds },
    { id:'risk', label:'高リスク', resolve: getHighRiskIds },
    { id:'volatile', label:'変動大', resolve: getVolatileIds },
    { id:'missing', label:'未回答', resolve: getMissingIds },
    { id:'manual', label:'手動選択', resolve: () => Array.from(state.visible) }
  ];

  const state = {
    hoverIndex: null,
    searchTerm: '',
    activePreset: 'focus',
    visible: new Set()
  };

  state.visible = new Set(getFocusIds());

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
    const latest = lastNumeric(member.values) ?? 0;
    return {
      latest,
      volatility: volatility(member.values),
      missing: missingCount(member.values),
      latestMissing: latestStreakMissing(member.values),
      delta: trendDelta(member.values),
      average: average(member.values)
    };
  }

  function getHighRiskIds() {
    return data.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.latest <= 2)
      .sort((a, b) => a.latest - b.latest || b.volatility - a.volatility)
      .map(member => member.id);
  }

  function getVolatileIds() {
    return data.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.volatility >= 2)
      .sort((a, b) => b.volatility - a.volatility || a.latest - b.latest)
      .map(member => member.id);
  }

  function getMissingIds() {
    return data.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.latestMissing >= 2 || member.missing >= 2)
      .sort((a, b) => b.latestMissing - a.latestMissing || b.missing - a.missing)
      .map(member => member.id);
  }

  function getStableIds() {
    return data.members
      .map(member => ({ id: member.id, ...memberMeta(member) }))
      .filter(member => member.average >= 4 && member.volatility <= 1)
      .sort((a, b) => b.average - a.average)
      .map(member => member.id);
  }

  function getFocusIds() {
    const result = [];
    const buckets = [getHighRiskIds(), getVolatileIds(), getMissingIds(), getStableIds()];
    buckets.forEach(bucket => {
      bucket.forEach(id => {
        if (result.length < 6 && !result.includes(id)) result.push(id);
      });
    });
    data.members.forEach(member => {
      if (result.length < 6 && !result.includes(member.id)) result.push(member.id);
    });
    return result.slice(0, 6);
  }

  function sx(i) {
    return dims.left + (plotWidth / (data.labels.length - 1)) * i;
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
    data.members
      .filter(member => !term || member.name.toLowerCase().includes(term))
      .forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.name}（${member.department}）`;
        memberSelect.appendChild(option);
      });
  }

  function renderSelectedChips() {
    selectedMemberChips.innerHTML = '';
    Array.from(state.visible)
      .map(id => data.members.find(member => member.id === id))
      .filter(Boolean)
      .forEach(member => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'selected-member-chip';
        chip.innerHTML = `<span class="legend-dot" style="background:${member.color}"></span><span>${member.name}</span><span class="chip-close">×</span>`;
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

  function showTooltip(clientX, clientY, index) {
    const rows = data.members
      .filter(member => state.visible.has(member.id))
      .map(member => {
        const value = member.values[index];
        return `<div class="tooltip-row"><span><i class="legend-dot" style="background:${member.color}"></i>${member.name}</span><strong>${typeof value === 'number' ? value : '未回答'}</strong></div>`;
      })
      .join('');
    tooltip.innerHTML = `<div class="tooltip-date">${data.labels[index]}</div>${rows}`;
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

    svg.appendChild(el('rect', { x: dims.left, y: sy(2), width: plotWidth, height: sy(1) - sy(2), class: 'zone-low' }));
    svg.appendChild(el('rect', { x: dims.left, y: sy(3), width: plotWidth, height: sy(2) - sy(3), class: 'zone-mid' }));
    svg.appendChild(el('rect', { x: dims.left, y: sy(5), width: plotWidth, height: sy(3) - sy(5), class: 'zone-high' }));

    const gh = el('g', { class: 'grid horizontal' });
    [1,2,3,4,5].forEach(v => gh.appendChild(el('line', { x1: dims.left, y1: sy(v), x2: dims.width - dims.right, y2: sy(v) })));
    svg.appendChild(gh);

    const gv = el('g', { class: 'grid vertical subtle' });
    data.labels.forEach((_, i) => gv.appendChild(el('line', { x1: sx(i), y1: dims.top, x2: sx(i), y2: dims.height - dims.bottom })));
    svg.appendChild(gv);

    const yl = el('g', { class: 'y-labels' });
    [1,2,3,4,5].forEach(v => yl.appendChild(el('text', { x: 28, y: sy(v) + 5, class: 'axis-label' }, String(v))));
    svg.appendChild(yl);

    const xl = el('g', { class: 'x-labels dense' });
    data.labels.forEach((label, i) => xl.appendChild(el('text', { x: sx(i), y: dims.height - 14, class: 'axis-label', 'text-anchor': 'middle' }, label)));
    svg.appendChild(xl);

    const focusLayer = el('g', { class: 'focus-layer' });
    if (Number.isInteger(state.hoverIndex)) {
      focusLayer.appendChild(el('line', { x1: sx(state.hoverIndex), y1: dims.top, x2: sx(state.hoverIndex), y2: dims.height - dims.bottom, class: 'focus-guide' }));
    }

    data.members.filter(member => state.visible.has(member.id)).forEach(member => {
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
    data.labels.forEach((_, i) => {
      const x = sx(i);
      const prev = i === 0 ? dims.left : (sx(i - 1) + x) / 2;
      const next = i === data.labels.length - 1 ? dims.width - dims.right : (x + sx(i + 1)) / 2;
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

  searchInput.addEventListener('input', () => {
    state.searchTerm = searchInput.value;
    syncPicker();
  });

  addMemberButton.addEventListener('click', () => {
    const id = memberSelect.value;
    if (!id) return;
    state.visible.add(id);
    state.activePreset = 'manual';
    renderPresetButtons();
    renderSelectedChips();
    renderChart();
    memberSelect.value = '';
  });

  syncPicker();
  renderPresetButtons();
  renderSelectedChips();
  renderChart();
})();
