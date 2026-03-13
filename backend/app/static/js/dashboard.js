import { apiFetch, clearToken, decodeJwtPayload, getToken } from "./api.js";

const token = getToken();
const logoutButton = document.getElementById("logoutButton");
const dashboardMessage = document.getElementById("dashboardMessage");

if (!token) {
  window.location.href = "./login.html";
}

logoutButton?.addEventListener("click", () => {
  clearToken();
  window.location.href = "./login.html";
});

function setMessage(text, type = "") {
  dashboardMessage.textContent = text;
  dashboardMessage.className = "form-message";
  if (type) {
    dashboardMessage.classList.add(type);
  }
}

function capitalizeRole(role) {
  if (!role) return "-";
  const map = {
    user: "user",
    manager: "manager",
    admin: "admin",
  };
  return map[role] || role;
}

function fillUserUI(user) {
  const displayName = user.name || user.email || "ユーザー";
  const displayRole = capitalizeRole(user.role);
  const email = user.email || "-";
  const department = user.department_name || (user.department_id ? `department_id: ${user.department_id}` : "未設定");
  const joinedAt = user.joined_at || "未設定";
  const avatarText = displayName.slice(0, 1).toUpperCase();

  document.getElementById("sidebarUserName").textContent = displayName;
  document.getElementById("sidebarUserRole").textContent = displayRole;
  document.getElementById("headerUserName").textContent = displayName;
  document.getElementById("headerUserMeta").textContent = `${displayRole} / ${email}`;
  document.getElementById("userAvatar").textContent = avatarText;

  document.getElementById("cardName").textContent = displayName;
  document.getElementById("cardEmail").textContent = email;
  document.getElementById("cardRole").textContent = displayRole;
  document.getElementById("cardDepartment").textContent = department;
  document.getElementById("cardUserId").textContent = user.id ?? "-";
  document.getElementById("cardJoinedAt").textContent = joinedAt;
  document.getElementById("tokenState").textContent = "有効";
}

function buildFallbackUserFromToken(rawToken) {
  const payload = decodeJwtPayload(rawToken);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    name: payload.email ? payload.email.split("@")[0] : "ユーザー",
    email: payload.email,
    role: payload.role,
    joined_at: "-",
    department_id: null,
  };
}

async function loadDashboard() {
  try {
    const user = await apiFetch("/users/me", {
      method: "GET",
    });
    fillUserUI(user);
    setMessage("ログイン中のユーザー情報を取得しました。", "success");
  } catch (error) {
    if (error.status === 404 || error.status === 405) {
      const fallbackUser = buildFallbackUserFromToken(token);
      if (fallbackUser) {
        fillUserUI(fallbackUser);
        setMessage("/users/me が未実装のため、トークン情報を使って表示しています。", "");
        return;
      }
    }

    if (error.status === 401) {
      clearToken();
      window.location.href = "./login.html";
      return;
    }

    setMessage(`ユーザー情報の取得に失敗しました: ${error.message}`, "error");
    document.getElementById("tokenState").textContent = "取得失敗";
  }
}

loadDashboard();
