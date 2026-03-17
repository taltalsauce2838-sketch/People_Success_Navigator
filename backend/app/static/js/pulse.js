const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const ROLE_LABELS = {
  user: "User",
  manager: "Manager",
  admin: "Admin",
};

const form = document.getElementById("pulseForm");
const surveyDateInput = document.getElementById("surveyDate");
const todayLabel = document.getElementById("todayLabel");
const scoreSelect = document.getElementById("score");
const memoInput = document.getElementById("memo");
const messageEl = document.getElementById("pulseMessage");
const submitButton = document.getElementById("pulseSubmitButton");
const resetButton = document.getElementById("pulseResetButton");
const answerStatusBadge = document.getElementById("answerStatusBadge");
const resultSubmissionStatus = document.getElementById("resultSubmissionStatus");
const resultSurveyDate = document.getElementById("resultSurveyDate");
const resultScore = document.getElementById("resultScore");
const resultCreatedAt = document.getElementById("resultCreatedAt");
const resultMemoPreview = document.getElementById("resultMemoPreview");
const pulseHistory = document.getElementById("pulseHistory");

let currentUser = null;
let todayKey = "";
let todayRecord = null;

function getToken() {
  return localStorage.getItem("access_token");
}

function clearToken() {
  localStorage.removeItem("access_token");
}

function setMessage(text, type = "") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = "form-message";
  if (type) messageEl.classList.add(type);
}

function getTodayKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateLabel(value) {
  const normalized = normalizeDateString(value);
  if (!normalized) return "-";
  const [year, month, day] = normalized.split("-");
  return `${year}/${month}/${day}`;
}

function formatDateTimeLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDepartmentLabel(user) {
  return user?.department_name || user?.department?.name || user?.department || "所属未設定";
}

function getUserId(user) {
  return user?.id ?? user?.user_id ?? "-";
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || "-";
}

function normalizeDateString(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRecordDate(record) {
  return normalizeDateString(record?.survey_date || record?.date || record?.created_at);
}

function getRecordScore(record) {
  return record?.score ?? null;
}

function getRecordMemo(record) {
  return record?.memo ?? "";
}

function getRecordCreatedAt(record) {
  return record?.created_at ?? null;
}

function updateAnswerStatus(answered) {
  if (!answerStatusBadge) return;
  answerStatusBadge.textContent = answered ? "本日回答済み" : "未回答";
  answerStatusBadge.className = `status-badge ${answered ? "success" : "neutral"}`;
}

function renderLoginInfo(user) {
  const userIdEl = document.getElementById("cardUserId");
  const roleEl = document.getElementById("cardRole");
  const departmentEl = document.getElementById("cardDepartment");

  if (userIdEl) userIdEl.textContent = getUserId(user);
  if (roleEl) roleEl.textContent = getRoleLabel(user?.role);
  if (departmentEl) departmentEl.textContent = getDepartmentLabel(user);
}

function renderResult(record, { justSubmitted = false } = {}) {
  if (!record) {
    resultSubmissionStatus.textContent = "未登録";
    resultSurveyDate.textContent = "-";
    resultScore.textContent = "-";
    resultCreatedAt.textContent = "-";
    resultMemoPreview.textContent = "まだ登録されていません。";
    updateAnswerStatus(false);
    return;
  }

  const score = getRecordScore(record);
  const memo = getRecordMemo(record);
  const surveyDate = getRecordDate(record);
  const createdAt = getRecordCreatedAt(record);

  resultSubmissionStatus.textContent = justSubmitted ? "登録完了" : "登録済み";
  resultSurveyDate.textContent = formatDateLabel(surveyDate);
  resultScore.textContent = score ?? "-";
  resultCreatedAt.textContent = formatDateTimeLabel(createdAt);
  resultMemoPreview.textContent = memo ? `メモ: ${memo}` : "メモは未入力です。";
  updateAnswerStatus(true);
}

function setFormDisabled(disabled) {
  scoreSelect.disabled = disabled;
  memoInput.disabled = disabled;
  submitButton.disabled = disabled;
}

function fillForm(record) {
  scoreSelect.value = getRecordScore(record) ?? "";
  memoInput.value = getRecordMemo(record) || "";
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.survey_date || 0).getTime();
    const bTime = new Date(b?.created_at || b?.survey_date || 0).getTime();
    return bTime - aTime;
  });
}

function renderHistory(records) {
  if (!pulseHistory) return;

  if (!Array.isArray(records) || records.length === 0) {
    pulseHistory.innerHTML = '<div class="timeline-item"><strong>履歴未取得</strong><div class="card-sub">まだ表示できる回答履歴がありません。</div></div>';
    return;
  }

  pulseHistory.innerHTML = sortRecords(records)
    .slice(0, 5)
    .map((record) => {
      const date = formatDateLabel(getRecordDate(record));
      const score = getRecordScore(record);
      const memo = getRecordMemo(record) || "メモなし";
      const createdAt = formatDateTimeLabel(getRecordCreatedAt(record));

      return `
        <div class="timeline-item">
          <strong>${escapeHtml(date)} / スコア ${escapeHtml(score ?? "-")}</strong>
          <div class="card-sub">${escapeHtml(memo)}</div>
          <div class="history-meta">登録日時: ${escapeHtml(createdAt)}</div>
        </div>
      `;
    })
    .join("");
}

async function fetchJson(url, options = {}) {
  const token = getToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    const error = new Error(data?.detail || "API呼び出しに失敗しました。");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function fetchMe() {
  return fetchJson(`${API_BASE_URL}/users/me`, { method: "GET" });
}

async function fetchPulseRecords(userId) {
  const query = new URLSearchParams({ user_id: String(userId) });
  const data = await fetchJson(`${API_BASE_URL}/pulse/?${query.toString()}`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

async function fetchTodayPulseRecord(userId, surveyDate) {
  const query = new URLSearchParams({
    user_id: String(userId),
    survey_date: surveyDate,
  });

  try {
    return await fetchJson(`${API_BASE_URL}/pulse/by-user-date?${query.toString()}`, { method: "GET" });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function submitPulse(payload) {
  return fetchJson(`${API_BASE_URL}/pulse/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function loadOwnHistory() {
  const userId = getUserId(currentUser);
  const records = await fetchPulseRecords(userId);
  renderHistory(records);
  return sortRecords(records);
}

async function initializePage() {
  todayKey = getTodayKey();
  const label = getTodayLabel();
  if (surveyDateInput) surveyDateInput.value = label;
  if (todayLabel) todayLabel.textContent = label;

  currentUser = await fetchMe();
  renderLoginInfo(currentUser);
  renderResult(null);

  const userId = getUserId(currentUser);
  const [today, records] = await Promise.all([
    fetchTodayPulseRecord(userId, todayKey),
    fetchPulseRecords(userId),
  ]);

  todayRecord = today;
  renderHistory(records);

  if (todayRecord) {
    fillForm(todayRecord);
    renderResult(todayRecord);
    setFormDisabled(true);
    setMessage("本日はすでに回答済みです。内容を確認できます。", "success");
  } else {
    setFormDisabled(false);
    setMessage("コンディションを入力して登録してください。");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    setMessage("ユーザー情報が未取得です。再読み込みしてください。", "error");
    return;
  }

  const score = Number(scoreSelect.value);
  const memo = memoInput.value.trim();

  if (!score) {
    setMessage("コンディションを選択してください。", "error");
    return;
  }

  submitButton.disabled = true;
  resetButton.disabled = true;
  setMessage("登録中です...");

  try {
    const result = await submitPulse({
      score,
      memo,
      survey_date: todayKey,
    });

    todayRecord = {
      ...result,
      score: getRecordScore(result) ?? score,
      memo: getRecordMemo(result) || memo,
      survey_date: getRecordDate(result) || todayKey,
    };

    fillForm(todayRecord);
    renderResult(todayRecord, { justSubmitted: true });
    setFormDisabled(true);
    resetButton.disabled = false;
    setMessage("Pulse Survey を登録しました。", "success");

    await loadOwnHistory();
  } catch (error) {
    if (error.status === 401) {
      clearToken();
      window.location.href = "./login.html";
      return;
    }

    if (error.status === 400 || error.status === 409) {
      const latestToday = await fetchTodayPulseRecord(getUserId(currentUser), todayKey);
      if (latestToday) {
        todayRecord = latestToday;
        fillForm(todayRecord);
        renderResult(todayRecord);
        setFormDisabled(true);
      }
      await loadOwnHistory();
      setMessage(error.message || "本日の回答はすでに登録済みです。", "error");
      return;
    }

    setMessage(error.message || "登録に失敗しました。", "error");
  } finally {
    submitButton.disabled = scoreSelect.disabled;
    resetButton.disabled = false;
  }
});

resetButton?.addEventListener("click", () => {
  if (scoreSelect.disabled) return;
  form?.reset();
  if (surveyDateInput) surveyDateInput.value = getTodayLabel();
  setMessage("入力内容をクリアしました。");
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initializePage();
  } catch (error) {
    if (error?.status === 401) {
      clearToken();
      window.location.href = "./login.html";
      return;
    }
    setMessage(error.message || "画面初期化に失敗しました。", "error");
  }
});
