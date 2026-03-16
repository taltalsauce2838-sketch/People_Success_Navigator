const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function clearToken() {
  localStorage.removeItem("access_token");
}

function setMessage(text, type = "") {
  if (!loginMessage) return;

  loginMessage.textContent = text;
  loginMessage.className = "form-message";

  if (type) {
    loginMessage.classList.add(type);
  }
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

async function fetchMe() {
  const token = getToken();

  if (!token) {
    throw new Error("アクセストークンがありません。");
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
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

async function redirectByRole() {
  try {
    const user = await fetchMe();
    const nextPath = getDashboardPathByRole(user.role);
    window.location.replace(nextPath);
  } catch (error) {
    clearToken();
    setMessage("ログイン後のユーザー情報取得に失敗しました。再度ログインしてください。", "error");
  }
}

async function login(email, password) {
  const formBody = new URLSearchParams();
  formBody.append("username", email);
  formBody.append("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "ログインに失敗しました。");
  }

  if (!result.access_token) {
    throw new Error("アクセストークンを取得できませんでした。");
  }

  setToken(result.access_token);
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = getToken();

  if (token) {
    await redirectByRole();
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    setMessage("メールアドレスとパスワードを入力してください。", "error");
    return;
  }

  if (loginButton) {
    loginButton.disabled = true;
  }
  setMessage("ログイン中です...");

  try {
    await login(email, password);
    await redirectByRole();
  } catch (error) {
    clearToken();
    setMessage(error.message || "ログインに失敗しました。", "error");
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
    }
  }
});
