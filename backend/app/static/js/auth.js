import { getApiBaseUrl, setToken, isLoggedIn } from "./api.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

if (isLoggedIn()) {
  window.location.href = "./dashboard.html";
}

function setMessage(text, type = "") {
  loginMessage.textContent = text;
  loginMessage.className = "form-message";
  if (type) {
    loginMessage.classList.add(type);
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email")?.value.trim() || "";
  const password = document.getElementById("password")?.value || "";

  if (!email || !password) {
    setMessage("メールアドレスとパスワードを入力してください", "error");
    return;
  }

  loginButton.disabled = true;
  setMessage("ログイン中です...", "");

  try {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);

    const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "ログインに失敗しました");
    }

    setToken(result.access_token);
    setMessage("ログインに成功しました。ダッシュボードへ移動します。", "success");

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 500);
  } catch (error) {
    setMessage(error.message || "ログイン処理でエラーが発生しました", "error");
  } finally {
    loginButton.disabled = false;
  }
});
