const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function getToken() {
  return localStorage.getItem('access_token');
}

function getUserId() {
  const value = getParams().get('user_id');
  return value ? Number(value) : null;
}

function getContextMember() {
  const params = getParams();
  return {
    id: getUserId(),
    name: params.get('name') || '対象メンバー',
    role: params.get('role') || '-',
    department: params.get('department') || '-',
    manager: params.get('manager') || '-',
  };
}

function getBackLink() {
  const from = getParams().get('from');
  if (from === 'employee-management') return './employee-management.html';
  return './team-overview.html';
}

function getBackLabel() {
  const from = getParams().get('from');
  if (from === 'employee-management') return '社員管理へ戻る';
  return 'チーム状況へ戻る';
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

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function getRiskMeta(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return { label: '判定前', className: '' };
  if (numeric <= 2) return { label: '高', className: 'danger' };
  if (numeric === 3) return { label: '中', className: 'warning' };
  return { label: '低', className: 'success' };
}

function setStatus(message, isError = false) {
  const el = document.getElementById('member-pulse-status');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#b42318' : '';
}

function renderSummary(member, latestSurvey, totalCount) {
  const summary = document.getElementById('member-summary');
  if (!summary) return;

  const latestScore = latestSurvey?.score ?? '-';
  const latestSurveyDate = latestSurvey?.survey_date ? formatDate(latestSurvey.survey_date) : '-';
  const latestCreatedAt = latestSurvey?.created_at ? formatDateTime(latestSurvey.created_at) : '-';
  const latestMemo = latestSurvey?.memo ? latestSurvey.memo : 'メモなし';
  const risk = getRiskMeta(latestSurvey?.score);

  summary.innerHTML = `
    <div class="detail-summary-grid">
      <div><div class="card-sub">社員ID</div><strong>${escapeHtml(member.id ?? '-')}</strong></div>
      <div><div class="card-sub">氏名</div><strong>${escapeHtml(member.name)}</strong></div>
      <div><div class="card-sub">権限</div><strong>${escapeHtml(member.role)}</strong></div>
      <div><div class="card-sub">所属</div><strong>${escapeHtml(member.department)}</strong></div>
      <div><div class="card-sub">マネージャー</div><strong>${escapeHtml(member.manager)}</strong></div>
      <div><div class="card-sub">最新回答日</div><strong>${escapeHtml(latestSurveyDate)}</strong></div>
      <div><div class="card-sub">最新スコア</div><strong>${escapeHtml(latestScore)}</strong></div>
      <div><div class="card-sub">履歴件数</div><strong>${escapeHtml(totalCount)}</strong></div>
    </div>
    <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <span class="chip ${escapeHtml(risk.className)}">離職リスク ${escapeHtml(risk.label)}</span>
      <span class="card-sub">最新登録日時: ${escapeHtml(latestCreatedAt)}</span>
    </div>
    <div class="card-sub" style="margin-top:10px;">最新メモ: ${escapeHtml(latestMemo)}</div>
  `;
}

function renderTimeline(surveys) {
  const timeline = document.getElementById('member-timeline');
  if (!timeline) return;

  if (!Array.isArray(surveys) || surveys.length === 0) {
    timeline.innerHTML = '<div class="timeline-item"><strong>履歴なし</strong><div class="card-sub">まだPulse Surveyの回答がありません。</div></div>';
    return;
  }

  timeline.innerHTML = surveys
    .map((item) => {
      const risk = getRiskMeta(item?.score);
      const surveyDate = formatDate(item?.survey_date);
      const createdAt = formatDateTime(item?.created_at);
      const memo = item?.memo ? item.memo : 'メモなし';
      return `
        <div class="timeline-item">
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
            <strong>${escapeHtml(surveyDate)}</strong>
            <span class="chip ${escapeHtml(risk.className)}">Score ${escapeHtml(item?.score ?? '-')}</span>
            <span class="card-sub">登録日時: ${escapeHtml(createdAt)}</span>
          </div>
          <div class="card-sub">メモ: ${escapeHtml(memo)}</div>
        </div>
      `;
    })
    .join('');
}

function normalizeSurveys(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function fetchPulseHistory(userId) {
  const token = getToken();
  if (!token) throw new Error('アクセストークンがありません。');
  const response = await fetch(`${API_BASE_URL}/pulse/?user_id=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = 'Pulse履歴の取得に失敗しました。';
    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch (_) {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return normalizeSurveys(await response.json());
}

function renderPageFrame(member) {
  const title = document.getElementById('member-page-title');
  const subtitle = document.getElementById('member-page-subtitle');
  const personName = document.getElementById('member-name');
  const backLink = document.getElementById('member-back-link');
  const memoDate = document.getElementById('intervention-date');

  if (title) title.textContent = `${member.name} の詳細`;
  if (subtitle) subtitle.textContent = '個人のPulse推移確認と介入メモ入力を行う詳細画面です。';
  if (personName) personName.textContent = member.name;
  if (backLink) {
    backLink.href = getBackLink();
    backLink.textContent = getBackLabel();
  }
  if (memoDate && !memoDate.value) {
    const now = new Date();
    memoDate.value = formatDate(now.toISOString());
  }

  renderSummary(member, null, 0);
  renderTimeline([]);
}

async function initializeMemberDetail() {
  const member = getContextMember();
  renderPageFrame(member);

  if (!member.id) {
    setStatus('対象ユーザーIDが指定されていません。', true);
    return;
  }

  try {
    const surveys = await fetchPulseHistory(member.id);
    const latestSurvey = surveys[0] || null;
    renderSummary(member, latestSurvey, surveys.length);
    renderTimeline(surveys);
    setStatus(surveys.length > 0 ? `Pulse履歴 ${surveys.length} 件を表示しています。` : 'Pulse履歴はまだありません。');
  } catch (error) {
    renderSummary(member, null, 0);
    renderTimeline([]);
    setStatus(error?.message || 'Pulse履歴の取得に失敗しました。', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeMemberDetail();
});
