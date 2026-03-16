const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const NAV_ITEMS = {
  user: [
    { href: "./dashboard-user.html", label: "ダッシュボード" },
    { href: "./pulse.html", label: "Pulse Survey" },
    { href: "./skills.html", label: "スキル成長" },
    { href: "./ai-chat.html", label: "AI相談" },
    { href: "./referral.html", label: "リファラル" },
  ],
  manager: [
    { href: "./dashboard-manager.html", label: "ダッシュボード" },
    { href: "./pulse.html", label: "Pulse Survey" },
    { href: "./skills.html", label: "スキル成長" },
    { href: "./ai-chat.html", label: "AI相談" },
    { href: "./referral.html", label: "リファラル" },
    { href: "./team-overview.html", label: "チーム状況" },
    { href: "./member-detail.html", label: "メンバー詳細" },
  ],
  admin: [
    { href: "./dashboard-admin.html", label: "ダッシュボード" },
    { href: "./pulse.html", label: "Pulse Survey" },
    { href: "./skills.html", label: "スキル成長" },
    { href: "./ai-chat.html", label: "AI相談" },
    { href: "./referral.html", label: "リファラル" },
    { href: "./team-overview.html", label: "チーム状況" },
    { href: "./member-detail.html", label: "メンバー詳細" },
    { href: "./company-analytics.html", label: "全社分析" },
    { href: "./employee-management.html", label: "社員管理" },
  ],
};

const ACCESS_RULES = Object.fromEntries(
  Object.entries(NAV_ITEMS).map(([role, items]) => [
    role,
    items.map((item) => item.href.replace("./", "")),
  ])
);

const ROLE_LABELS = {
  user: "User",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_SCOPE_LABELS = {
  user: "一般ユーザー",
  manager: "マネージャー",
  admin: "管理者",
};

function getToken() {
  return localStorage.getItem("access_token");
}

function clearToken() {
  localStorage.removeItem("access_token");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "dashboard.html";
}

function getDashboardPathByRole(role) {
  switch (role) {
    case "admin":
      return "./dashboard-admin.html";
    case "manager":
      return "./dashboard-manager.html";
    case "user":
    default:
      return "./dashboard-user.html";
  }
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || "User";
}

function getRoleScopeLabel(role) {
  return ROLE_SCOPE_LABELS[role] || "一般ユーザー";
}

function getUserName(user) {
  return user?.name || user?.full_name || user?.username || "ユーザー";
}

function getDepartmentLabel(user, role) {
  const department = user?.department_name || user?.department?.name || user?.department;
  if (department) return department;

  if (role === "admin") return "管理部門";
  if (role === "manager") return "担当チーム";
  return "所属未設定";
}

function getAvatarText(name) {
  const trimmed = String(name || "").trim();
  return trimmed ? trimmed.charAt(0) : "U";
}

function getCurrentNavItem(role) {
  const currentPage = getCurrentPage();
  const items = NAV_ITEMS[role] || NAV_ITEMS.user;
  return items.find((item) => item.href.replace("./", "") === currentPage) || null;
}

async function fetchMe() {
  const token = getToken();
  if (!token) {
    throw new Error("アクセストークンがありません。");
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "ユーザー情報の取得に失敗しました。";
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch (_) {}

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function ensureAuthorizedPage(role) {
  const currentPage = getCurrentPage();
  const allowedPages = ACCESS_RULES[role] || ACCESS_RULES.user;

  if (!allowedPages.includes(currentPage)) {
    window.location.replace(getDashboardPathByRole(role));
    return false;
  }

  return true;
}

function renderSidebar(role, user) {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const name = getUserName(user);
  const roleLabel = getRoleLabel(role);
  const department = getDepartmentLabel(user, role);
  const avatar = getAvatarText(name);
  const currentPage = getCurrentPage();
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.user;

  const profile = sidebar.querySelector(".sidebar-profile");
  if (profile) {
    profile.innerHTML = `
      <div class="avatar">${escapeHtml(avatar)}</div>
      <h3>${escapeHtml(name)}</h3>
      <div class="role-badge">${escapeHtml(roleLabel)}</div>
      <div class="footer-note">${escapeHtml(department)}</div>
    `;
  }

  const nav = sidebar.querySelector(".side-nav");
  if (nav) {
    nav.innerHTML = navItems
      .map((item) => {
        const isActive = item.href.replace("./", "") === currentPage;
        return `<a href="${item.href}" class="${isActive ? "active" : ""}">${escapeHtml(item.label)}</a>`;
      })
      .join("\n");
  }
}

function renderTopbar(role, user) {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const name = getUserName(user);
  const roleLabel = getRoleLabel(role);
  const department = getDepartmentLabel(user, role);
  const avatar = getAvatarText(name);
  const currentNav = getCurrentNavItem(role);
  const pageLabel = currentNav?.label || "ダッシュボード";
  const scopeLabel = getRoleScopeLabel(role);

  topbar.innerHTML = `
    <div class="topbar-left">
      <div class="topbar-title">${escapeHtml(pageLabel)}</div>
      <div class="card-sub">${escapeHtml(scopeLabel)}向け画面</div>
    </div>
    <div class="topbar-right">
      <div class="role-badge">${escapeHtml(roleLabel)}</div>
      <div class="user-chip">
        <div class="avatar">${escapeHtml(avatar)}</div>
        <div>
          <div><strong>${escapeHtml(name)}</strong></div>
          <div class="card-sub">${escapeHtml(department)}</div>
        </div>
      </div>
    </div>
  `;
}

function bindLogout() {
  document.querySelectorAll(".logout-button").forEach((button) => {
    button.addEventListener("click", () => {
      clearToken();
      window.location.href = "./login.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindLogout();

  try {
    const user = await fetchMe();
    if (!ensureAuthorizedPage(user.role)) return;
    renderSidebar(user.role, user);
    renderTopbar(user.role, user);
  } catch (error) {
    clearToken();
    window.location.href = "./login.html";
  }
});
