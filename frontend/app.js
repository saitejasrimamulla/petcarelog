const $ = (id) => document.getElementById(id);
const state = { user: null, pets: [], records: [], selectedPetId: null, authMode: "login" };
const icons = { Dog:"🐶", Cat:"🐱", Bird:"🐦", Rabbit:"🐰", Other:"🐾" };
const recordIcons = { "Vet visit":"🩺", Vaccination:"💉", Medication:"💊", Grooming:"🧼", Feeding:"🥣", Other:"📝" };
let pendingDelete = null;

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function showMessage(id, text, kind = "error") {
  const el = $(id); el.textContent = text; el.className = `message ${kind}`;
}
function hideMessage(id) { $(id).classList.add("hidden"); }
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }
function escapeText(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function dateLabel(value) {
  if (!value) return "";
  const d = new Date(`${value.slice(0,10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" });
}
function localDate() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === mode));
  $("name-wrap").classList.toggle("hidden", mode !== "register");
  $("name").required = mode === "register";
  $("auth-title").textContent = mode === "login" ? "Welcome back" : "Create your account";
  $("auth-subtitle").textContent = mode === "login" ? "Log in to see your pet care dashboard." : "Create a private space for your pet records.";
  $("auth-submit").textContent = mode === "login" ? "Log in" : "Create account";
  $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
  hideMessage("auth-error");
}
function renderShell() {
  $("auth-view").classList.toggle("hidden", !!state.user);
  $("app-view").classList.toggle("hidden", !state.user);
  $("logout-btn").classList.toggle("hidden", !state.user);
  $("header-user").textContent = state.user ? `Hello, ${state.user.name}` : "";
}
async function loadDashboard() {
  const data = await api("/pets");
  state.pets = data.pets;
  if (!state.pets.some(p => p.id === state.selectedPetId)) state.selectedPetId = state.pets[0]?.id || null;
  state.records = [];
  if (state.selectedPetId) {
    const result = await api(`/pets/${state.selectedPetId}/records`);
    state.records = result.records;
  }
  renderDashboard();
}
function renderDashboard() {
  $("pet-count").textContent = state.pets.length;
  $("record-count").textContent = state.pets.reduce((n,p) => n + Number(p.record_count || 0), 0);
  const today = localDate();
  $("upcoming-count").textContent = state.pets.reduce((n,p) => n + Number(p.upcoming_count || 0), 0);
  const query = $("pet-search").value.trim().toLowerCase();
  const visible = state.pets.filter(p => `${p.name} ${p.species} ${p.breed || ""}`.toLowerCase().includes(query));
  $("pet-list").innerHTML = visible.map(p => `
    <article class="pet-card ${p.id === state.selectedPetId ? "selected" : ""}" data-pet-card="${p.id}">
      <div class="pet-head"><div class="pet-avatar">${icons[p.species] || "🐾"}</div><div><h3>${escapeText(p.name)}</h3><p>${escapeText(p.breed || p.species)}</p></div></div>
      <div class="pet-facts"><span class="pill">${escapeText(p.species)}</span>${p.sex ? `<span class="pill">${escapeText(p.sex)}</span>` : ""}${p.date_of_birth ? `<span class="pill">Born ${dateLabel(p.date_of_birth)}</span>` : ""}</div>
      <p class="pet-note">${escapeText(p.notes || "No extra notes yet.")}</p>
      <div class="card-actions"><button class="text-button" data-action="records" data-id="${p.id}">View care history</button><button class="text-button" data-action="edit-pet" data-id="${p.id}">Edit</button><button class="text-button danger" data-action="delete-pet" data-id="${p.id}">Delete</button></div>
    </article>`).join("");
  $("empty-state").classList.toggle("hidden", state.pets.length > 0);
  $("pet-list").classList.toggle("hidden", state.pets.length === 0);
  $("records-section").classList.toggle("hidden", !state.selectedPetId || state.pets.length === 0);
  const selected = state.pets.find(p => p.id === state.selectedPetId);
  $("records-title").textContent = selected ? `${selected.name}’s care history` : "Care history";
  $("record-list").innerHTML = state.records.length ? state.records.map(r => `
    <article class="record-card"><div class="record-main"><span class="record-icon">${recordIcons[r.type] || "📝"}</span><div><h3>${escapeText(r.title)}</h3><p>${escapeText(r.details || "No details added.")}</p><div class="record-meta"><span class="pill">${escapeText(r.type)}</span><span class="muted">${dateLabel(r.record_date)}</span>${r.next_due_date ? `<span class="due">${new Date(`${r.next_due_date}T12:00:00`) < new Date(`${today}T12:00:00`) ? "Overdue" : "Next due"}: ${dateLabel(r.next_due_date)}</span>` : ""}</div></div></div><div class="record-actions"><button class="text-button" data-action="edit-record" data-id="${r.id}">Edit</button><button class="text-button danger" data-action="delete-record" data-id="${r.id}">Delete</button></div></article>`).join("") : `<div class="empty-state"><div class="empty-emoji">📔</div><h3>No care entries yet</h3><p>Add a vaccination, vet visit, medication, or other care note.</p><button class="button button-primary" id="first-record">Add care entry</button></div>`;
}
async function enterApp(user) {
  state.user = user; renderShell();
  try { await loadDashboard(); } catch (e) { showMessage("notice", e.message); }
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.tab)));
$("auth-form").addEventListener("submit", async e => {
  e.preventDefault(); hideMessage("auth-error");
  const body = { email: $("email").value.trim(), password: $("password").value };
  if (state.authMode === "register") body.name = $("name").value.trim();
  $("auth-submit").disabled = true;
  try {
    const result = await api(`/auth/${state.authMode}`, { method:"POST", body: JSON.stringify(body) });
    $("auth-form").reset(); await enterApp(result.user);
  } catch (err) { showMessage("auth-error", err.message); }
  finally { $("auth-submit").disabled = false; }
});
$("logout-btn").addEventListener("click", async () => {
  try { await api("/auth/logout", { method:"POST", body:"{}" }); } catch {}
  state.user = null; state.pets = []; state.records = []; state.selectedPetId = null; renderShell();
});
$("add-pet-open").addEventListener("click", () => openPetForm());
$("empty-add").addEventListener("click", () => openPetForm());
function openPetForm(pet = null) {
  $("pet-form").reset(); hideMessage("pet-error"); $("pet-id").value = pet?.id || "";
  $("pet-modal-title").textContent = pet ? "Edit pet" : "Add a pet";
  $("pet-name").value = pet?.name || ""; $("pet-species").value = pet?.species || "Dog";
  $("pet-breed").value = pet?.breed || ""; $("pet-dob").value = pet?.date_of_birth || "";
  $("pet-sex").value = pet?.sex || ""; $("pet-notes").value = pet?.notes || "";
  openModal("pet-modal");
}
$("pet-form").addEventListener("submit", async e => {
  e.preventDefault(); hideMessage("pet-error");
  const id = $("pet-id").value;
  const body = { name:$("pet-name").value.trim(), species:$("pet-species").value, breed:$("pet-breed").value.trim(), date_of_birth:$("pet-dob").value || null, sex:$("pet-sex").value || null, notes:$("pet-notes").value.trim() };
  try {
    const result = await api(id ? `/pets/${id}` : "/pets", { method:id ? "PATCH" : "POST", body:JSON.stringify(body) });
    closeModal("pet-modal"); state.selectedPetId = result.pet.id; await loadDashboard(); showMessage("notice", id ? "Pet profile updated." : "Pet added successfully.", "success");
  } catch (err) { showMessage("pet-error", err.message); }
});
$("add-record-open").addEventListener("click", () => openRecordForm());
$("record-list").addEventListener("click", e => { if (e.target.id === "first-record") openRecordForm(); });
function openRecordForm(record = null) {
  $("record-form").reset(); hideMessage("record-error"); $("record-id").value = record?.id || "";
  $("record-modal-title").textContent = record ? "Edit care entry" : "Add care entry";
  $("record-title").value = record?.title || ""; $("record-type").value = record?.type || "Vet visit";
  $("record-date").value = record?.record_date || localDate(); $("record-due").value = record?.next_due_date || "";
  $("record-details").value = record?.details || ""; openModal("record-modal");
}
$("record-form").addEventListener("submit", async e => {
  e.preventDefault(); hideMessage("record-error");
  const id = $("record-id").value;
  const body = { title:$("record-title").value.trim(), type:$("record-type").value, record_date:$("record-date").value, next_due_date:$("record-due").value || null, details:$("record-details").value.trim() };
  try {
    await api(id ? `/records/${id}` : `/pets/${state.selectedPetId}/records`, { method:id ? "PATCH" : "POST", body:JSON.stringify(body) });
    closeModal("record-modal"); await loadDashboard(); showMessage("notice", id ? "Care entry updated." : "Care entry saved.", "success");
  } catch (err) { showMessage("record-error", err.message); }
});
$("pet-search").addEventListener("input", renderDashboard);
$("pet-list").addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]"); const card = e.target.closest("[data-pet-card]");
  if (!btn && card) { state.selectedPetId = card.dataset.petCard; try { await loadDashboard(); } catch(err) { showMessage("notice", err.message); } return; }
  if (!btn) return;
  const id = btn.dataset.id; const action = btn.dataset.action;
  if (action === "records") { state.selectedPetId = id; try { await loadDashboard(); $("records-section").scrollIntoView({behavior:"smooth",block:"start"}); } catch(err) { showMessage("notice",err.message); } }
  if (action === "edit-pet") openPetForm(state.pets.find(p => p.id === id));
  if (action === "delete-pet") askDelete("pet", id, `Delete ${state.pets.find(p=>p.id===id)?.name || "this pet"} and all its care entries? This cannot be undone.`);
});
$("record-list").addEventListener("click", e => {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const record = state.records.find(r => r.id === btn.dataset.id);
  if (btn.dataset.action === "edit-record") openRecordForm(record);
  if (btn.dataset.action === "delete-record") askDelete("record", btn.dataset.id, "Delete this care entry? This cannot be undone.");
});
function askDelete(type, id, text) { pendingDelete = {type,id}; $("confirm-text").textContent = text; openModal("confirm-modal"); }
$("confirm-cancel").addEventListener("click", () => { pendingDelete = null; closeModal("confirm-modal"); });
$("confirm-delete").addEventListener("click", async () => {
  if (!pendingDelete) return; const {type,id} = pendingDelete; $("confirm-delete").disabled = true;
  try {
    await api(type === "pet" ? `/pets/${id}` : `/records/${id}`, {method:"DELETE"});
    if (type === "pet" && state.selectedPetId === id) state.selectedPetId = null;
    closeModal("confirm-modal"); pendingDelete = null; await loadDashboard(); showMessage("notice", type === "pet" ? "Pet and care entries deleted." : "Care entry deleted.", "success");
  } catch(err) { closeModal("confirm-modal"); showMessage("notice", err.message); }
  finally { $("confirm-delete").disabled = false; }
});
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m && m.id !== "confirm-modal") closeModal(m.id); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach(m => { if (m.id !== "confirm-modal") closeModal(m.id); }); });
(async function init() {
  setAuthMode("login");
  try { const result = await api("/auth/me"); await enterApp(result.user); }
  catch { renderShell(); }
})();
