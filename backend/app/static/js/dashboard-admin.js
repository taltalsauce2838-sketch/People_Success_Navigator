import { API_BASE_URL, getToken } from "./api.js";

function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    let message = "データ取得に失敗しました。";
    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function roleValue(role) {
  return String(role || "").toLowerCase();
}

function formatDate(dateValue) {
  if (!dateValue) return "日付未設定";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRecentUsers(users) {
  const container = document.getElementById("adminRecentUsers");
  if (!container) return;

  if (!Array.isArray(users) || users.length === 0) {
    container.innerHTML = `<div class="admin-empty-state">最近追加された社員はまだありません。</div>`;
    return;
  }

  container.innerHTML = users.slice(0, 5).map((user) => {
    const dept = user.department_name || (user.department?.name) || (user.department_id ? `部署ID: ${user.department_id}` : "所属未設定");
    const role = roleValue(user.role);
    return `
      <div class="admin-list-item">
        <div>
          <strong>${escapeHtml(user.name || "名称未設定")}</strong>
          <div class="card-sub">${escapeHtml(user.email || "メール未設定")}</div>
        </div>
        <div class="admin-list-meta">
          <span class="chip neutral-chip">${escapeHtml(role || "user")}</span>
          <span class="card-sub">${escapeHtml(dept)}</span>
          <span class="card-sub">登録日: ${escapeHtml(formatDate(user.joined_at))}</span>
        </div>
      </div>
    `;
  }).join("");
}

async function loadAdminDashboard() {
  try {
    const [users, departments] = await Promise.all([
      fetchJson("/users/"),
      fetchJson("/departments/"),
    ]);

    const userList = Array.isArray(users) ? users : [];
    const departmentList = Array.isArray(departments) ? departments : [];

    const total = userList.length;
    const managerCount = userList.filter((u) => roleValue(u.role) === "manager").length;
    const userCount = userList.filter((u) => roleValue(u.role) === "user").length;
    const adminCount = userList.filter((u) => roleValue(u.role) === "admin").length;

    setText("adminTotalUsers", `${total}`);
    setText("adminManagerCount", `${managerCount}`);
    setText("adminUserCount", `${userCount}`);
    setText("adminDepartmentCount", `${departmentList.length}`);

    const sortedRecent = [...userList].sort((a, b) => {
      const da = new Date(a.joined_at || 0).getTime();
      const db = new Date(b.joined_at || 0).getTime();
      return db - da;
    });

    renderRecentUsers(sortedRecent);

    const totalCard = document.getElementById("adminTotalUsers");
    if (totalCard?.nextElementSibling) {
      totalCard.nextElementSibling.textContent = `登録済みユーザー総数（Admin ${adminCount}名を含む）`;
    }
  } catch (error) {
    console.error(error);
    setText("adminTotalUsers", "-");
    setText("adminManagerCount", "-");
    setText("adminUserCount", "-");
    setText("adminDepartmentCount", "-");
    const container = document.getElementById("adminRecentUsers");
    if (container) {
      container.innerHTML = `<div class="admin-empty-state error-state">${escapeHtml(error.message || "読み込みに失敗しました")}</div>`;
    }
  }
}

window.addEventListener("DOMContentLoaded", loadAdminDashboard);
