import { apiFetch, clearToken, decodeJwtPayload, getToken } from "./api.js";

const token = getToken();
const logoutButton = document.getElementById("logoutButton");
const pulseForm = document.getElementById("pulseForm");
const pulseMessage = document.getElementById("pulseMessage");
const pulseSubmitButton = document.getElementById("pulseSubmitButton");
const pulseResetButton = document.getElementById("pulseResetButton");
const surveyDateInput = document.getElementById("surveyDate");
const todayLabel = document.getElementById("todayLabel");

if (!token) {
  window.location.href = "./login.html";
}

logoutButton?.addEventListener("click", () => {
  clearToken();
  window.location.href = "./login.html";
});

pulseResetButton?.addEventListener("click", () => {
  document.getElementById("score").value = "";
  document.getElementById("memo").value = "";
  setMessage("入力内容をクリアしました。", "");
});

function setMessage(text, type = "") {
  pulseMessage.textContent = text;
  pulseMessage.className = "form-message";
  if (type) {
    pulseMessage.classList.add(type);
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

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}`;
  surveyDateInput.value = iso;
  todayLabel.textContent = iso;
  return iso;
}

function fillUserUI(user) {
  const displayName = user.name || user.email || "ユーザー";
  const displayRole = capitalizeRole(user.role);
  const email = user.email || "-";
  const department = user.department_name || (user.department_id ? `department_id: ${user.department_id}` : "未設定");
  const avatarText = displayName.slice(0, 1).toUpperCase();

  document.getElementById("sidebarUserName").textContent = displayName;
  document.getElementById("sidebarUserRole").textContent = displayRole;
  document.getElementById("headerUserName").textContent = displayName;
  document.getElementById("headerUserMeta").textContent = `${displayRole} / ${email}`;
  document.getElementById("userAvatar").textContent = avatarText;
  document.getElementById("cardUserId").textContent = user.id ?? "-";
  document.getElementById("cardRole").textContent = displayRole;
  document.getElementById("cardDepartment").textContent = department;
}

function buildFallbackUserFromToken(rawToken) {
  const payload = decodeJwtPayload(rawToken);
  if (!payload) return null;

  return {
    id: payload.sub,
    name: payload.email ? payload.email.split("@")[0] : "ユーザー",
    email: payload.email,
    role: payload.role,
    department_id: null,
  };
}

async function loadUser() {
  try {
    const user = await apiFetch("/users/me", { method: "GET" });
    fillUserUI(user);
  } catch (error) {
    if (error.status === 401) {
      clearToken();
      window.location.href = "./login.html";
      return null;
    }

    const fallbackUser = buildFallbackUserFromToken(token);
    if (fallbackUser) {
      fillUserUI(fallbackUser);
      return fallbackUser;
    }

    setMessage(`ユーザー情報の取得に失敗しました: ${error.message}`, "error");
    return null;
  }
}

pulseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const score = document.getElementById("score").value;
  const memo = document.getElementById("memo").value.trim();
  const surveyDate = surveyDateInput.value;

  if (!score) {
    setMessage("コンディションを選択してください。", "error");
    return;
  }

  pulseSubmitButton.disabled = true;
  setMessage("登録中です...", "");

  try {
    await apiFetch(`/pulse/?current_user=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        score: Number(score),
        memo,
        survey_date: surveyDate,
      }),
    });

    setMessage("Pulse Surveyを登録しました。必要に応じて分析処理が実行されます。", "success");

    setTimeout(() => {
      setMessage("", "");
    }, 4000);
  } catch (error) {
    if (error.status === 401) {
      clearToken();
      window.location.href = "./login.html";
      return;
    }

    setMessage(`登録に失敗しました: ${error.message}`, "error");
  } finally {
    pulseSubmitButton.disabled = false;
  }
});

setToday();
loadUser();
