import { API_BASE_URL, getToken } from "./api.js";

const state = {
  users: [],
  filteredUsers: [],
  departments: [],
  latestPulseByUserId: {},
  selectedUserId: null,
};

const els = {
  listMessage: document.getElementById("list-message"),
  createMessage: document.getElementById("create-message"),
  editMessage: document.getElementById("edit-message"),
  userCount: document.getElementById("user-count"),
  cardList: document.getElementById("employee-card-list"),
  filterKeyword: document.getElementById("filter-keyword"),
  filterRole: document.getElementById("filter-role"),
  filterDepartmentId: document.getElementById("filter-department-id"),
  filterManagerId: document.getElementById("filter-manager-id"),
  filterRisk: document.getElementById("filter-risk"),
  sortUsers: document.getElementById("sort-users"),
  filterResetButton: document.getElementById("filter-reset-button"),
  reloadUsersButton: document.getElementById("reload-users-button"),
  createForm: document.getElementById("create-user-form"),
  createResetButton: document.getElementById("create-reset-button"),
  createModal: document.getElementById("employee-create-modal"),
  openCreateModalButton: document.getElementById("open-create-modal-button"),
  closeCreateModalButton: document.getElementById("close-create-modal-button"),
  editModal: document.getElementById("employee-edit-modal"),
  closeEditModalButton: document.getElementById("close-edit-modal-button"),
  editUserName: document.getElementById("edit-user-name"),
  editUserEmail: document.getElementById("edit-user-email"),
  editUserBase: document.getElementById("edit-user-base"),
  editUserCurrentValues: document.getElementById("edit-user-current-values"),
  editRoleForm: document.getElementById("edit-role-form"),
  editDepartmentForm: document.getElementById("edit-department-form"),
  editManagerForm: document.getElementById("edit-manager-form"),
  deleteUserButton: document.getElementById("delete-user-button"),
  statsTotalUsers: document.getElementById("stats-total-users"),
  statsUserRole: document.getElementById("stats-user-role"),
  statsManagerRole: document.getElementById("stats-manager-role"),
  statsAdminRole: document.getElementById("stats-admin-role"),
};

function getAuthHeaders(json = true) {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    let message = "API通信に失敗しました。";
    try {
      const data = await response.json();
      message = data.detail || data.message || JSON.stringify(data);
    } catch (_) {}
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRoleLabel(role) {
  const value = String(role || "").toLowerCase();
  if (value === "admin") return "Admin";
  if (value === "manager") return "Manager";
  return "User";
}

function getRoleClass(role) {
  const value = String(role || "").toLowerCase();
  if (value === "admin") return "danger";
  if (value === "manager") return "warning";
  return "success";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDepartmentName(departmentId) {
  if (departmentId == null || departmentId === "") return "-";
  const department = state.departments.find((item) => item.id === Number(departmentId));
  return department ? department.name : `#${departmentId}`;
}

function getManagerName(managerId) {
  if (managerId == null) return "-";
  const manager = state.users.find((user) => user.id === managerId);
  return manager ? `${manager.name} (#${manager.id})` : `#${managerId}`;
}

function getLatestPulse(userId) {
  return state.latestPulseByUserId[userId] || null;
}

function getPulseRiskMeta(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return { label: "未判定", className: "" };
  if (numeric <= 2) return { label: "高", className: "danger" };
  if (numeric === 3) return { label: "中", className: "warning" };
  return { label: "低", className: "success" };
}

function buildMemberDetailHref(user) {
  const params = new URLSearchParams({
    user_id: String(user.id),
    from: "employee-management",
    name: user.name || "",
    role: getRoleLabel(user.role),
    department: getDepartmentName(user.department_id),
    manager: getManagerName(user.manager_id),
  });
  return `./member-detail.html?${params.toString()}`;
}

function setMessage(el, text, type = "") {
  if (!el) return;
  el.textContent = text || "";
  el.className = `form-message${type ? ` ${type}` : ""}`;
}

function setCardListLoading(text) {
  if (!els.cardList) return;
  els.cardList.innerHTML = `<div class="employee-empty-card">${escapeHtml(text)}</div>`;
}

function getSelectedUser() {
  return state.users.find((user) => user.id === state.selectedUserId) || null;
}

function populateDepartmentSelects() {
  const options = ['<option value="">すべて</option>']
    .concat(state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)} (#${department.id})</option>`))
    .join("");

  if (els.filterDepartmentId) {
    const currentValue = els.filterDepartmentId.value;
    els.filterDepartmentId.innerHTML = options;
    els.filterDepartmentId.value = currentValue;
  }

  const formOptions = ['<option value="">選択してください</option>']
    .concat(state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)} (#${department.id})</option>`))
    .join("");

  const createSelect = els.createForm?.elements.namedItem("department_id");
  const editSelect = els.editDepartmentForm?.elements.namedItem("department_id");
  if (createSelect) createSelect.innerHTML = formOptions;
  if (editSelect) editSelect.innerHTML = formOptions;
}

function populateManagerSelects() {
  const managerCandidates = state.users.filter((user) => String(user.role).toLowerCase() !== "user");
  const options = ['<option value="">未設定</option>']
    .concat(managerCandidates.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (#${user.id}) / ${escapeHtml(getRoleLabel(user.role))}</option>`))
    .join("");

  const createSelect = els.createForm?.elements.namedItem("manager_id");
  const editSelect = els.editManagerForm?.elements.namedItem("manager_id");
  if (createSelect) createSelect.innerHTML = options;
  if (editSelect) editSelect.innerHTML = options;
}

function renderStats() {
  const counts = state.users.reduce((acc, user) => {
    const role = String(user.role || "user").toLowerCase();
    if (role === "admin") acc.admin += 1;
    else if (role === "manager") acc.manager += 1;
    else acc.user += 1;
    return acc;
  }, { user: 0, manager: 0, admin: 0 });

  els.statsTotalUsers.textContent = String(state.users.length);
  els.statsUserRole.textContent = String(counts.user);
  els.statsManagerRole.textContent = String(counts.manager);
  els.statsAdminRole.textContent = String(counts.admin);
}

function getRiskOrder(risk) {
  if (risk === "high") return 0;
  if (risk === "medium") return 1;
  if (risk === "low") return 2;
  return 3;
}

function getUserRisk(user) {
  const latestPulse = getLatestPulse(user.id);
  const numeric = Number(latestPulse?.score);
  if (!Number.isFinite(numeric)) return "unknown";
  if (numeric <= 2) return "high";
  if (numeric === 3) return "medium";
  return "low";
}

function compareNullable(a, b, direction = "asc") {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return direction === "asc" ? -1 : 1;
  if (a > b) return direction === "asc" ? 1 : -1;
  return 0;
}

function applyFilters() {
  const keyword = (els.filterKeyword.value || "").trim().toLowerCase();
  const role = (els.filterRole.value || "").trim().toLowerCase();
  const departmentId = (els.filterDepartmentId.value || "").trim();
  const managerId = (els.filterManagerId.value || "").trim();
  const risk = (els.filterRisk?.value || "").trim().toLowerCase();
  const sortBy = (els.sortUsers?.value || "risk_desc").trim();

  state.filteredUsers = state.users.filter((user) => {
    const matchesKeyword = !keyword || [user.name, user.email].some((value) => String(value || "").toLowerCase().includes(keyword));
    const matchesRole = !role || String(user.role || "").toLowerCase() === role;
    const matchesDepartment = !departmentId || String(user.department_id ?? "") === departmentId;
    const matchesManager = !managerId || String(user.manager_id ?? "") === managerId;
    const matchesRisk = !risk || getUserRisk(user) === risk;
    return matchesKeyword && matchesRole && matchesDepartment && matchesManager && matchesRisk;
  });

  state.filteredUsers.sort((a, b) => {
    const pulseA = getLatestPulse(a.id);
    const pulseB = getLatestPulse(b.id);
    const scoreA = Number.isFinite(Number(pulseA?.score)) ? Number(pulseA.score) : null;
    const scoreB = Number.isFinite(Number(pulseB?.score)) ? Number(pulseB.score) : null;
    const riskA = getUserRisk(a);
    const riskB = getUserRisk(b);
    const joinedA = a.joined_at || null;
    const joinedB = b.joined_at || null;

    switch (sortBy) {
      case "name_asc":
        return String(a.name || "").localeCompare(String(b.name || ""), "ja");
      case "joined_asc":
        return compareNullable(joinedA, joinedB, "asc") || String(a.name || "").localeCompare(String(b.name || ""), "ja");
      case "joined_desc":
        return compareNullable(joinedA, joinedB, "desc") || String(a.name || "").localeCompare(String(b.name || ""), "ja");
      case "pulse_asc":
        return compareNullable(scoreA, scoreB, "asc") || getRiskOrder(riskA) - getRiskOrder(riskB);
      case "pulse_desc":
        return compareNullable(scoreA, scoreB, "desc") || getRiskOrder(riskA) - getRiskOrder(riskB);
      case "risk_desc":
      default:
        return getRiskOrder(riskA) - getRiskOrder(riskB) || compareNullable(scoreA, scoreB, "asc") || String(a.name || "").localeCompare(String(b.name || ""), "ja");
    }
  });

  renderCardList();
}

function renderCardList() {
  const users = state.filteredUsers;
  els.userCount.textContent = String(users.length);

  if (!users.length) {
    setCardListLoading("該当する社員がいません。");
    return;
  }

  els.cardList.innerHTML = users
    .map((user) => {
      const latestPulse = getLatestPulse(user.id);
      const risk = getPulseRiskMeta(latestPulse?.score);
      const scoreText = latestPulse?.score != null ? String(latestPulse.score) : "-";
      const pulseDate = latestPulse?.survey_date ? formatDate(latestPulse.survey_date) : "未回答";
      const pulseMemo = latestPulse?.memo ? latestPulse.memo : "メモなし";
      return `
        <article class="employee-row-card">
          <div class="employee-row-top">
            <div>
              <div class="employee-row-title">${escapeHtml(user.name || "-")}</div>
              <div class="employee-row-sub">${escapeHtml(user.email || "-")}</div>
            </div>
            <div class="employee-row-chip-group">
              <span class="chip ${escapeHtml(getRoleClass(user.role))}">${escapeHtml(getRoleLabel(user.role))}</span>
              <span class="chip ${escapeHtml(risk.className)}">離職リスク ${escapeHtml(risk.label)}</span>
            </div>
          </div>
          <div class="employee-row-meta-grid">
            <div><span class="employee-meta-label">ID</span><strong>#${escapeHtml(user.id)}</strong></div>
            <div><span class="employee-meta-label">所属部署</span><strong>${escapeHtml(getDepartmentName(user.department_id))}</strong></div>
            <div><span class="employee-meta-label">manager</span><strong>${escapeHtml(getManagerName(user.manager_id))}</strong></div>
            <div><span class="employee-meta-label">joined_at</span><strong>${escapeHtml(formatDate(user.joined_at))}</strong></div>
            <div><span class="employee-meta-label">最新Pulse</span><strong>Score ${escapeHtml(scoreText)}</strong></div>
            <div><span class="employee-meta-label">最終回答日</span><strong>${escapeHtml(pulseDate)}</strong></div>
          </div>
          <div class="employee-row-note">最新メモ: ${escapeHtml(pulseMemo)}</div>
          <div class="employee-row-actions">
            <a class="btn btn-secondary" href="${buildMemberDetailHref(user)}">詳細を見る</a>
            <button class="btn btn-primary action-edit" type="button" data-user-id="${user.id}">編集</button>
            <button class="btn btn-secondary action-delete" type="button" data-user-id="${user.id}">削除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function openCreateModal() {
  resetCreateForm();
  els.createModal.classList.add("open");
  els.createModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCreateModal() {
  els.createModal.classList.remove("open");
  els.createModal.setAttribute("aria-hidden", "true");
  if (!els.editModal?.classList.contains("open")) {
    if (!els.createModal?.classList.contains("open")) {
    document.body.style.overflow = "";
  }
  }
}

function openEditModal(userId) {
  state.selectedUserId = Number(userId);
  syncEditModal();
  els.editModal.classList.add("open");
  els.editModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  els.editModal.classList.remove("open");
  els.editModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  setMessage(els.editMessage, "");
}

function syncEditModal() {
  const user = getSelectedUser();
  if (!user) return;

  const latestPulse = getLatestPulse(user.id);
  const risk = getPulseRiskMeta(latestPulse?.score);
  els.editUserName.textContent = user.name || "-";
  els.editUserEmail.textContent = user.email || "-";
  els.editUserBase.textContent = `ID: ${user.id} / joined_at: ${formatDate(user.joined_at)} / 最新Pulse: ${latestPulse?.score ?? "-"}`;
  els.editUserCurrentValues.textContent = [
    `role: ${getRoleLabel(user.role)}`,
    `department: ${getDepartmentName(user.department_id)}`,
    `manager: ${getManagerName(user.manager_id)}`,
    `risk: ${risk.label}`,
  ].join(" / ");

  els.editRoleForm.elements.namedItem("role").value = String(user.role || "user").toLowerCase();
  els.editDepartmentForm.elements.namedItem("department_id").value = user.department_id ?? "";
  els.editManagerForm.elements.namedItem("manager_id").value = user.manager_id ?? "";

  const managerSelect = els.editManagerForm.elements.namedItem("manager_id");
  Array.from(managerSelect.options).forEach((option) => {
    option.disabled = Number(option.value) === user.id;
  });
}

async function loadDepartments() {
  try {
    const departments = await apiFetch("/departments/", {
      method: "GET",
      headers: getAuthHeaders(false),
    });
    state.departments = Array.isArray(departments) ? departments : [];
    populateDepartmentSelects();
  } catch (error) {
    state.departments = [];
    populateDepartmentSelects();
    setMessage(els.listMessage, `部署一覧の取得に失敗しました。${error.message || ""}`.trim(), "error");
  }
}

async function fetchLatestPulseForUser(userId) {
  try {
    const pulseList = await apiFetch(`/pulse/?user_id=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: getAuthHeaders(false),
    });
    if (Array.isArray(pulseList) && pulseList.length > 0) {
      return pulseList[0];
    }
  } catch (_) {}
  return null;
}

async function loadLatestPulses() {
  const entries = await Promise.all(
    state.users.map(async (user) => [user.id, await fetchLatestPulseForUser(user.id)])
  );
  state.latestPulseByUserId = Object.fromEntries(entries);
}

async function loadUsers() {
  setCardListLoading("読み込み中...");
  setMessage(els.listMessage, "");

  try {
    const users = await apiFetch("/users/", {
      method: "GET",
      headers: getAuthHeaders(false),
    });

    state.users = Array.isArray(users) ? users : [];
    renderStats();
    populateManagerSelects();
    await loadLatestPulses();
    applyFilters();
  } catch (error) {
    state.users = [];
    state.filteredUsers = [];
    state.latestPulseByUserId = {};
    setCardListLoading(error.message || "社員一覧の取得に失敗しました。");
    setMessage(els.listMessage, error.message || "社員一覧の取得に失敗しました。", "error");
  }
}

function resetFilters() {
  els.filterKeyword.value = "";
  els.filterRole.value = "";
  els.filterDepartmentId.value = "";
  els.filterManagerId.value = "";
  if (els.filterRisk) els.filterRisk.value = "";
  if (els.sortUsers) els.sortUsers.value = "risk_desc";
  applyFilters();
}

function resetCreateForm() {
  els.createForm.reset();
  const managerSelect = els.createForm.elements.namedItem("manager_id");
  if (managerSelect) managerSelect.value = "";
  setMessage(els.createMessage, "");
}

function parseOptionalInt(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : NaN;
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  setMessage(els.createMessage, "");

  const formData = new FormData(els.createForm);
  const departmentId = parseOptionalInt(formData.get("department_id"));
  const managerId = parseOptionalInt(formData.get("manager_id"));

  if (Number.isNaN(departmentId) || departmentId == null) {
    setMessage(els.createMessage, "所属部署を選択してください。", "error");
    return;
  }
  if (Number.isNaN(managerId)) {
    setMessage(els.createMessage, "manager_id が不正です。", "error");
    return;
  }

  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "user").trim().toLowerCase(),
    department_id: departmentId,
    manager_id: managerId,
    joined_at: String(formData.get("joined_at") || "").trim() || null,
  };

  try {
    const created = await apiFetch("/users/", {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    setMessage(els.createMessage, `社員を登録しました: ${created.name} (#${created.id})`, "success");
    await loadUsers();
    window.setTimeout(() => {
      closeCreateModal();
      resetCreateForm();
    }, 500);
  } catch (error) {
    setMessage(els.createMessage, error.message || "社員登録に失敗しました。", "error");
  }
}

async function updateSelectedUser(path, payload, successMessage) {
  const user = getSelectedUser();
  if (!user) {
    setMessage(els.editMessage, "編集対象が選択されていません。", "error");
    return;
  }

  setMessage(els.editMessage, "");

  try {
    await apiFetch(`/users/${user.id}${path}`, {
      method: "PUT",
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    setMessage(els.editMessage, successMessage, "success");
    await loadUsers();
    state.selectedUserId = user.id;
    syncEditModal();
  } catch (error) {
    setMessage(els.editMessage, error.message || "更新に失敗しました。", "error");
  }
}

async function handleRoleSubmit(event) {
  event.preventDefault();
  const role = String(els.editRoleForm.elements.namedItem("role").value || "user").trim().toLowerCase();
  await updateSelectedUser("/role", { role }, "権限を更新しました。");
}

async function handleDepartmentSubmit(event) {
  event.preventDefault();
  const departmentId = parseOptionalInt(els.editDepartmentForm.elements.namedItem("department_id").value);
  if (Number.isNaN(departmentId) || departmentId == null) {
    setMessage(els.editMessage, "所属部署を選択してください。", "error");
    return;
  }
  await updateSelectedUser("/department", { department_id: departmentId }, "所属を更新しました。");
}

async function handleManagerSubmit(event) {
  event.preventDefault();
  const selectedUser = getSelectedUser();
  const managerId = parseOptionalInt(els.editManagerForm.elements.namedItem("manager_id").value);
  if (Number.isNaN(managerId)) {
    setMessage(els.editMessage, "manager_id が不正です。", "error");
    return;
  }
  if (selectedUser && managerId === selectedUser.id) {
    setMessage(els.editMessage, "自分自身を manager に設定できません。", "error");
    return;
  }
  await updateSelectedUser("/manager", { manager_id: managerId }, "マネージャーを更新しました。");
}

async function handleDeleteClick() {
  const user = getSelectedUser();
  if (!user) {
    setMessage(els.editMessage, "削除対象が選択されていません。", "error");
    return;
  }

  const confirmed = window.confirm(
    `社員ID ${user.id} / ${user.name} を削除します。\nこの操作は取り消せません。\n本当に削除しますか？`
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/users/${user.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(false),
    });
    closeEditModal();
    setMessage(els.listMessage, `社員を削除しました: ${user.name} (#${user.id})`, "success");
    state.selectedUserId = null;
    await loadUsers();
  } catch (error) {
    setMessage(els.editMessage, error.message || "削除に失敗しました。", "error");
  }
}

function handleCardListClick(event) {
  const editButton = event.target.closest(".action-edit");
  if (editButton) {
    openEditModal(editButton.dataset.userId);
    return;
  }

  const deleteButton = event.target.closest(".action-delete");
  if (deleteButton) {
    openEditModal(deleteButton.dataset.userId);
    handleDeleteClick();
  }
}

function bindEvents() {
  [els.filterKeyword, els.filterRole, els.filterDepartmentId, els.filterManagerId, els.filterRisk, els.sortUsers].forEach((element) => {
    element?.addEventListener("input", applyFilters);
    element?.addEventListener("change", applyFilters);
  });

  els.filterResetButton?.addEventListener("click", resetFilters);
  els.openCreateModalButton?.addEventListener("click", openCreateModal);
  els.reloadUsersButton?.addEventListener("click", () => loadUsers());
  els.createResetButton?.addEventListener("click", resetCreateForm);
  els.createForm?.addEventListener("submit", handleCreateSubmit);
  els.editRoleForm?.addEventListener("submit", handleRoleSubmit);
  els.editDepartmentForm?.addEventListener("submit", handleDepartmentSubmit);
  els.editManagerForm?.addEventListener("submit", handleManagerSubmit);
  els.deleteUserButton?.addEventListener("click", handleDeleteClick);
  els.cardList?.addEventListener("click", handleCardListClick);
  els.closeCreateModalButton?.addEventListener("click", closeCreateModal);
  els.closeEditModalButton?.addEventListener("click", closeEditModal);
  els.createModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-create-modal='true']")) {
      closeCreateModal();
    }
  });
  els.editModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal='true']")) {
      closeEditModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.createModal?.classList.contains("open")) closeCreateModal();
      if (els.editModal?.classList.contains("open")) closeEditModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadDepartments();
  await loadUsers();
});
