const STORAGE_KEY = "daily-journal-entries-v1";
const ACCESS_KEY = "button-journal-access-v1";
const DELETED_KEY = "button-journal-deleted-v2";
const OVERRIDES_KEY = "button-journal-overrides-v2";
const JOURNAL_PASSWORD = "NIUKOU2026";
const videoSource = "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4";

// ===== 云端同步（GitHub Contents API） =====
const GH_API = "https://api.github.com";
let cloudSha = null;
function loadGh() {
  return {
    owner: localStorage.getItem("diary_gh_owner") || "jayawardenaadithya-boop",
    repo: localStorage.getItem("diary_gh_repo") || "niukou-diary",
    branch: localStorage.getItem("diary_gh_branch") || "main",
    token: localStorage.getItem("diary_gh_token") || ""
  };
}
function saveGh(cfg) {
  localStorage.setItem("diary_gh_owner", cfg.owner);
  localStorage.setItem("diary_gh_repo", cfg.repo);
  localStorage.setItem("diary_gh_branch", cfg.branch);
  localStorage.setItem("diary_gh_token", cfg.token);
}
function ghB64(str) { return btoa(unescape(encodeURIComponent(str))); }
function ghB64d(str) { return decodeURIComponent(escape(atob(str))); }
async function fetchCloudEntries() {
  const cfg = loadGh();
  if (!cfg.token || !cfg.owner || !cfg.repo) return;
  try {
    const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/data.json?ref=${cfg.branch}`;
    const headers = { Authorization: "token " + cfg.token, Accept: "application/vnd.github+json" };
    const res = await fetch(url, { headers });
    if (!res.ok) return;
    const data = await res.json();
    cloudSha = data.sha;
    const arr = JSON.parse(ghB64d(data.content));
    const cloudEntries = arr.map((e) => ({
      id: e.id || ("cloud-" + (e.date || "") + "-" + (e.title || "").replace(/\s+/g, "")),
      date: e.date || "",
      title: e.title || "",
      note: e.note || e.content || "",
      tag: e.tag || "日常",
      time: e.time || "",
      type: e.type || "text",
      media: e.media || "",
      localVideo: e.localVideo || "",
      layout: e.layout || "card-wide"
    }));
    const localIds = new Set(userEntries.map((e) => e.id));
    const toAdd = cloudEntries.filter((e) => !localIds.has(e.id));
    if (toAdd.length) {
      userEntries = [...toAdd, ...userEntries];
      persistArchive();
      render();
    }
  } catch (e) {}
}
async function pushCloudEntries() {
  const cfg = loadGh();
  if (!cfg.token || !cfg.owner || !cfg.repo) return;
  try {
    const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/data.json?ref=${cfg.branch}`;
    const headers = { Authorization: "token " + cfg.token, Accept: "application/vnd.github+json" };
    let sha = cloudSha;
    if (!sha) {
      const r = await fetch(url, { headers });
      if (r.ok) sha = (await r.json()).sha;
    }
    const payload = userEntries.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      note: e.note,
      tag: e.tag || "日常",
      time: e.time || "",
      type: e.type || "text",
      media: (e.media && typeof e.media === "string" && e.media.startsWith("data:")) ? "" : (e.media || ""),
      localVideo: (e.localVideo && typeof e.localVideo === "string" && e.localVideo.startsWith("data:")) ? "" : (e.localVideo || ""),
      layout: e.layout || "card-wide"
    }));
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "diary sync: " + new Date().toISOString().slice(0, 16),
        content: ghB64(JSON.stringify(payload, null, 2)),
        sha: sha,
        branch: cfg.branch
      })
    });
    if (res.ok) { const d = await res.json(); cloudSha = d.content.sha; }
  } catch (e) {}
}

const demoEntries = [
  {
    id: "demo-0803",
    date: "2026-08-03",
    title: "人一到夜里，便开始审判自己",
    note: "今天的风很轻，刚好把桌上那张纸翻到背面。没有急着把它翻回来。",
    type: "image",
    media: "assets/entry-window.jpg",
    tag: "窗边",
    time: "07:42",
    layout: "card-featured"
  },
  {
    id: "demo-0802",
    date: "2026-08-02",
    title: "我只是走远了一点，离开必须回答的问题",
    note: "下楼买咖啡的时候，发现熟悉的路也会有新的颜色。",
    type: "video",
    media: "assets/entry-road.jpg",
    tag: "散步",
    time: "18:16",
    layout: "card-note"
  },
  {
    id: "demo-0801",
    date: "2026-08-01",
    title: "一个人也能把清晨过得像一场忏悔",
    note: "把早晨延长一点，房间就开始有了自己的呼吸。",
    type: "image",
    media: "assets/entry-coffee.jpg",
    tag: "周末",
    time: "09:08",
    layout: "card-tall"
  },
  {
    id: "demo-0731",
    date: "2026-07-31",
    title: "我们总在幸福经过以后，才认出它来",
    note: "回家的路上遇见一块很安静的绿色，停下来拍了一张。",
    type: "image",
    media: "assets/entry-green.jpg",
    tag: "慢下来",
    time: "20:24",
    layout: "card-tall"
  },
  {
    id: "demo-0729",
    date: "2026-07-29",
    title: "海并不回答我，却使沉默有了形状",
    note: "没有真的去海边，但看到这片蓝的时候，心里已经走了一小段路。",
    type: "image",
    media: "assets/entry-sea.jpg",
    tag: "慢下来",
    time: "16:52",
    layout: "card-wide"
  }
];

const state = { filter: "all", query: "" };
const journalGrid = document.querySelector("#journalGrid");
const entryCount = document.querySelector("#entryCount");
const searchInput = document.querySelector("#searchInput");
const composeModal = document.querySelector("#composeModal");
const composeForm = document.querySelector("#composeForm");
const entryDate = document.querySelector("#entryDate");
const entryMedia = document.querySelector("#entryMedia");
const fileName = document.querySelector("#fileName");
const formMessage = document.querySelector("#formMessage");
const lightbox = document.querySelector("#lightbox");
const lightboxMedia = document.querySelector("#lightboxMedia");
const toast = document.querySelector("#toast");
const passwordGate = document.querySelector("#passwordGate");
const passwordForm = document.querySelector("#passwordForm");
const passwordInput = document.querySelector("#passwordInput");
const passwordMessage = document.querySelector("#passwordMessage");

let userEntries = readEntries();
fetchCloudEntries();
let deletedEntryIds = readDeletedEntryIds();
let entryOverrides = readEntryOverrides();
let editingId = null;
let existingMedia = "";
let existingType = "text";
let existingLocalVideo = "";

function unlockJournal() {
  sessionStorage.setItem(ACCESS_KEY, "unlocked");
  passwordGate.classList.add("is-hidden");
  document.body.classList.remove("is-locked");
  window.setTimeout(() => passwordGate.setAttribute("hidden", ""), 260);
}

function lockJournal() {
  document.body.classList.add("is-locked");
  passwordGate.removeAttribute("hidden");
  window.setTimeout(() => passwordInput.focus(), 40);
}

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (passwordInput.value === JOURNAL_PASSWORD) {
    passwordMessage.textContent = "";
    unlockJournal();
    return;
  }
  passwordMessage.textContent = "密码不对，再试一次。";
  passwordInput.select();
  passwordGate.classList.remove("shake");
  window.requestAnimationFrame(() => passwordGate.classList.add("shake"));
});

if (sessionStorage.getItem(ACCESS_KEY) === "unlocked") {
  unlockJournal();
} else {
  lockJournal();
}

function readEntries() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function readDeletedEntryIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function readEntryOverrides() {
  try {
    const stored = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function persistArchive() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userEntries));
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedEntryIds]));
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(entryOverrides));
    return true;
  } catch {
    return false;
  }
}

function allEntries() {
  const visibleDemoEntries = demoEntries
    .map((entry) => ({ ...entry, ...(entryOverrides[entry.id] || {}) }))
    .filter((entry) => !deletedEntryIds.has(entry.id));
  const visibleUserEntries = userEntries.filter((entry) => !deletedEntryIds.has(entry.id));
  return [...visibleDemoEntries, ...visibleUserEntries].sort((a, b) => b.date.localeCompare(a.date));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function formatDate(date) {
  return date.replace(/-/g, " / ");
}

function formatWeekday(date) {
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return weekdays[new Date(`${date}T12:00:00`).getDay()];
}

function mediaMarkup(entry) {
  const media = escapeHtml(entry.media || "");
  const label = entry.type === "video" ? "VIDEO" : "IMAGE";
  if (!media) {
    return `<div class="text-only-visual"><p>“${escapeHtml(entry.note.slice(0, 42))}”</p></div>`;
  }
  return `<div class="card-visual" role="button" tabindex="0" data-open-id="${escapeHtml(entry.id)}" aria-label="打开：${escapeHtml(entry.title)}">
    <img src="${media}" alt="${escapeHtml(entry.title)}" loading="lazy" />
    <div class="card-shade"><span class="media-badge">${label}${entry.type === "video" ? " / 00:18" : ""}</span>${entry.type === "video" ? "<span class=\"play-mark\" aria-hidden=\"true\">▶</span>" : ""}</div>
  </div>`;
}

function cardMarkup(entry, index) {
  const layout = entry.layout || (index % 3 === 0 ? "card-featured" : "card-note");
  return `<article class="journal-card ${layout}" style="animation-delay:${Math.min(index * 55, 260)}ms" data-type="${escapeHtml(entry.type)}">
    ${mediaMarkup(entry)}
    <div class="card-info">
      <div class="card-meta"><span>${formatDate(entry.date)} / ${formatWeekday(entry.date)}</span><span>${escapeHtml(entry.time || "")}</span></div>
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(entry.note)}</p>
      <div class="card-footer">
        <span class="card-tag"># ${escapeHtml(entry.tag || "日常")}</span>
        <span class="card-actions">
          <button class="icon-button" type="button" data-edit-id="${escapeHtml(entry.id)}" aria-label="编辑：${escapeHtml(entry.title)}" title="编辑日志">✎</button>
          <button class="icon-button delete-button" type="button" data-delete-id="${escapeHtml(entry.id)}" aria-label="删除：${escapeHtml(entry.title)}" title="删除日志">×</button>
        </span>
      </div>
    </div>
  </article>`;
}

function render() {
  const filtered = allEntries().filter((entry) => {
    const matchesType = state.filter === "all" || entry.type === state.filter;
    const searchable = `${entry.title} ${entry.note} ${entry.tag}`.toLowerCase();
    return matchesType && searchable.includes(state.query.toLowerCase());
  });
  entryCount.textContent = String(filtered.length).padStart(2, "0");
  journalGrid.innerHTML = filtered.length
    ? filtered.map(cardMarkup).join("")
    : `<div class="empty-state">还没有找到这一页。换个关键词试试看。</div>`;
  updateStreak();
}

function updateStreak() {
  const dates = new Set(allEntries().map((entry) => entry.date));
  const latest = allEntries()[0]?.date;
  if (!latest) return;
  let streak = 0;
  let cursor = new Date(`${latest}T12:00:00`);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  document.querySelector("#streakValue").textContent = String(streak).padStart(2, "0");
}

function openCompose(id = null) {
  editingId = id;
  const entry = id ? allEntries().find((item) => item.id === id) : null;
  const composeTitle = document.querySelector("#composeTitle");
  const composeSubmitText = document.querySelector("#composeSubmitText");
  composeModal.hidden = false;
  document.body.classList.add("modal-open");
  if (entry) {
    entryDate.value = entry.date;
    document.querySelector("#entryTag").value = entry.tag || "";
    document.querySelector("#entryTitle").value = entry.title;
    document.querySelector("#entryNote").value = entry.note;
    existingMedia = entry.media || "";
    existingType = entry.type || "text";
    existingLocalVideo = entry.localVideo || "";
    fileName.textContent = existingMedia ? "不更换媒体则保留当前文件" : "支持本地文件，单个不超过 8 MB";
    composeTitle.textContent = "修改这一页";
    composeSubmitText.textContent = "保存修改";
  } else {
    entryDate.value = new Date().toISOString().slice(0, 10);
    existingMedia = "";
    existingType = "text";
    existingLocalVideo = "";
    composeTitle.textContent = "写下今天";
    composeSubmitText.textContent = "保存这一页";
  }
  formMessage.textContent = "";
  setTimeout(() => document.querySelector("#entryTitle").focus(), 40);
}

function closeCompose() {
  composeModal.hidden = true;
  document.body.classList.remove("modal-open");
  composeForm.reset();
  fileName.textContent = "支持本地文件，单个不超过 8 MB";
  formMessage.textContent = "";
  editingId = null;
  existingMedia = "";
  existingType = "text";
  existingLocalVideo = "";
  document.querySelector("#composeTitle").textContent = "写下今天";
  document.querySelector("#composeSubmitText").textContent = "保存这一页";
}

function openLightbox(id) {
  const entry = allEntries().find((item) => item.id === id);
  if (!entry) return;
  const media = escapeHtml(entry.media || "");
  lightboxMedia.innerHTML = entry.type === "video"
    ? `<video controls autoplay playsinline poster="${media}"><source src="${entry.localVideo || videoSource}" type="video/mp4" /></video>`
    : media
      ? `<img src="${media}" alt="${escapeHtml(entry.title)}" />`
      : `<div class="text-only-visual"><p>“${escapeHtml(entry.note)}”</p></div>`;
  document.querySelector("#lightboxDate").textContent = `${formatDate(entry.date)} / ${formatWeekday(entry.date)} / ${entry.time || ""}`;
  document.querySelector("#lightboxTitle").textContent = entry.title;
  document.querySelector("#lightboxNote").textContent = entry.note;
  lightbox.hidden = false;
  document.body.classList.add("modal-open");
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxMedia.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function deleteEntry(id) {
  const entry = allEntries().find((item) => item.id === id);
  if (!entry || !window.confirm(`确定删除“${entry.title}”吗？`)) return;
  if (id.startsWith("demo-")) {
    deletedEntryIds.add(id);
    delete entryOverrides[id];
  } else {
    userEntries = userEntries.filter((item) => item.id !== id);
  }
  if (!persistArchive()) {
    showToast("浏览器存储空间不足，删除没有完成");
    return;
  }
  render();
  pushCloudEntries();
  showToast("这一页已经从日志里移除了");
}

document.querySelectorAll("#composeButton, #introComposeButton").forEach((button) => button.addEventListener("click", openCompose));
document.querySelector("#closeCompose").addEventListener("click", closeCompose);
document.querySelector("#cancelCompose").addEventListener("click", closeCompose);
document.querySelector("#closeLightbox").addEventListener("click", closeLightbox);

composeModal.addEventListener("click", (event) => { if (event.target === composeModal) closeCompose(); });
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!composeModal.hidden) closeCompose();
    if (!lightbox.hidden) closeLightbox();
  }
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  render();
});

document.querySelectorAll("[data-tag]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.tag;
    state.query = button.dataset.tag;
    render();
    document.querySelector("#entries").scrollIntoView({ behavior: "smooth" });
  });
});

journalGrid.addEventListener("click", (event) => {
  const editTarget = event.target.closest("[data-edit-id]");
  if (editTarget) {
    openCompose(editTarget.dataset.editId);
    return;
  }
  const deleteTarget = event.target.closest("[data-delete-id]");
  if (deleteTarget) {
    deleteEntry(deleteTarget.dataset.deleteId);
    return;
  }
  const target = event.target.closest("[data-open-id]");
  if (target) openLightbox(target.dataset.openId);
});
journalGrid.addEventListener("keydown", (event) => {
  const target = event.target.closest("[data-open-id]");
  if (target && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openLightbox(target.dataset.openId);
  }
});

entryMedia.addEventListener("change", () => {
  fileName.textContent = entryMedia.files[0]?.name || "支持本地文件，单个不超过 8 MB";
});

composeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const file = entryMedia.files[0];
  if (file && file.size > 8 * 1024 * 1024) {
    formMessage.textContent = "这个文件有点大，请换一个 8 MB 以内的文件。";
    return;
  }
  const currentEditingId = editingId;
  const saveEntry = (media = "", type = "text", localVideo = "") => {
    const entryFields = {
      date: entryDate.value,
      title: document.querySelector("#entryTitle").value.trim(),
      note: document.querySelector("#entryNote").value.trim(),
      tag: document.querySelector("#entryTag").value.trim() || "日常"
    };
    if (currentEditingId) {
      const currentEntry = allEntries().find((item) => item.id === currentEditingId);
      if (!currentEntry) return;
      const updatedEntry = {
        ...currentEntry,
        ...entryFields,
        type: file ? type : existingType,
        media: file ? media : existingMedia,
        localVideo: file ? localVideo : existingLocalVideo
      };
      if (currentEditingId.startsWith("demo-")) {
        entryOverrides[currentEditingId] = updatedEntry;
      } else {
        userEntries = userEntries.map((item) => item.id === currentEditingId ? updatedEntry : item);
      }
    } else {
      userEntries = [{
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...entryFields,
        type,
        media,
        localVideo,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        layout: "card-wide"
      }, ...userEntries];
    }
    if (!persistArchive()) {
      formMessage.textContent = "浏览器存储空间不足，这一页暂时无法保存。";
      return;
    }
    closeCompose();
    render();
    pushCloudEntries();
    showToast(currentEditingId ? "这一页已经更新" : "这一页已经收进日志里了");
    document.querySelector("#entries").scrollIntoView({ behavior: "smooth" });
  };
  if (!file) {
    saveEntry();
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => saveEntry(reader.result, file.type.startsWith("video/") ? "video" : "image", file.type.startsWith("video/") ? reader.result : ""));
  reader.readAsDataURL(file);
});

// ===== 云端同步设置 UI =====
(function setupSyncUI() {
  const syncModal = document.querySelector("#syncModal");
  const syncOpen = document.querySelector("#syncOpen");
  if (!syncModal || !syncOpen) return;
  syncOpen.addEventListener("click", (e) => {
    e.preventDefault();
    const c = loadGh();
    document.querySelector("#syncOwner").value = c.owner;
    document.querySelector("#syncRepo").value = c.repo;
    document.querySelector("#syncBranch").value = c.branch;
    document.querySelector("#syncToken").value = c.token;
    syncModal.hidden = false;
    document.body.classList.add("modal-open");
  });
  const closeSync = () => { syncModal.hidden = true; document.body.classList.remove("modal-open"); };
  document.querySelector("#closeSync").addEventListener("click", closeSync);
  document.querySelector("#cancelSync").addEventListener("click", closeSync);
  syncModal.addEventListener("click", (ev) => { if (ev.target === syncModal) closeSync(); });
  document.querySelector("#syncForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveGh({
      owner: document.querySelector("#syncOwner").value.trim(),
      repo: document.querySelector("#syncRepo").value.trim(),
      branch: document.querySelector("#syncBranch").value.trim() || "main",
      token: document.querySelector("#syncToken").value.trim()
    });
    document.querySelector("#syncMsg").textContent = "已保存。现在写日记会自动同步到 GitHub。";
    fetchCloudEntries();
  });
  document.querySelector("#syncNow").addEventListener("click", async () => {
    const msg = document.querySelector("#syncMsg");
    msg.textContent = "同步中…";
    await fetchCloudEntries();
    await pushCloudEntries();
    render();
    msg.textContent = "已同步：云端与本机已对齐。";
  });
})();

render();
