/* ===== Splash SMDN – logica pubblica ===== */

// ---------- Stato globale ----------
const state = {
  teams: [],
  matches: [],
  votes: [],    // voti MVP (con id documento)
  fanta: [],    // punti fanta
  photos: [],   // foto/video approvati
  tourney: "calcetto",
  uid: null,    // uid Firebase (anonimo o admin)
};

let db = null;
let auth = null;

// ---------- Inizializzazione ----------
(function init() {
  setupStaticLinks();
  setupTabs();
  setupModals();
  setupMobileMenu();
  setupUpload();
  spawnBubbles();

  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
  auth.onAuthStateChanged((u) => {
    if (u) {
      state.uid = u.uid;
      renderMvp();
    } else {
      auth.signInAnonymously().catch((e) => console.error("Auth anonima fallita:", e));
    }
  });
  subscribeData();
})();

function subscribeData() {
  db.collection("teams").onSnapshot((snap) => {
    state.teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  });
  db.collection("matches").onSnapshot((snap) => {
    state.matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  });
  db.collection("votes").onSnapshot((snap) => {
    state.votes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMvp();
  });
  db.collection("fanta").onSnapshot((snap) => {
    state.fanta = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderFanta();
    if (typeof renderAdmin === "function") renderAdmin();
  });
  db.collection("photos").where("approved", "==", true).onSnapshot((snap) => {
    state.photos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGallery();
  });
}

// ---------- Link statici ----------
function setupStaticLinks() {
  const wa = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(SITE_CONFIG.whatsappMessage)}`;
  document.getElementById("linkWhatsapp").href = wa;
  document.getElementById("linkInstagram").href = SITE_CONFIG.instagramUrl;
  document.getElementById("linkInstagramText").href = SITE_CONFIG.instagramUrl;
  document.getElementById("linkIscrizioni").href = SITE_CONFIG.iscrizioniUrl;
  document.getElementById("linkIscrizioni2").href = SITE_CONFIG.iscrizioniUrl;
}

// ---------- Tab torneo ----------
function setupTabs() {
  document.querySelectorAll(".tourney-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tourney-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tourney = btn.dataset.tourney;
      renderAll();
    });
  });
}

// ---------- Menu mobile (hamburger) ----------
function setupMobileMenu() {
  const btn = document.getElementById("btnMenu");
  const nav = document.getElementById("topnav");
  if (!btn || !nav) return;
  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!nav.classList.contains("open")); });
  nav.addEventListener("click", (e) => { if (e.target.tagName === "A") setOpen(false); });
  document.addEventListener("click", (e) => { if (!nav.contains(e.target) && e.target !== btn) setOpen(false); });
}

// ---------- Modali ----------
function setupModals() {
  document.getElementById("btnRegolamento").addEventListener("click", (e) => {
    e.preventDefault();
    openModal("modalRegolamento");
  });
  document.querySelectorAll(".open-regolamento").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); openModal("modalRegolamento"); }));
  document.getElementById("btnAdmin").addEventListener("click", () => {
    // se già loggato, riapri direttamente il pannello invece del login
    if (typeof admin !== "undefined" && admin.logged && typeof showAdminPanel === "function") showAdminPanel();
    else openModal("modalAdmin");
  });
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.hasAttribute("data-close")) closeModal(m);
    });
  });
}

// ---------- Modali accessibili (focus trap, Esc, ritorno del focus) ----------
let modalReturnFocus = null;
const modalCloseHooks = {}; // id -> callback eseguito alla chiusura (per confirmDialog)

function openModal(id) {
  const m = document.getElementById(id);
  if (!m || !m.hidden) return;
  modalReturnFocus = document.activeElement;
  m.hidden = false;
  const f = m.querySelector("input:not([type=hidden]), select, textarea, button:not([data-close])")
        || m.querySelector("button");
  if (f) f.focus();
}

function closeModal(m) {
  if (typeof m === "string") m = document.getElementById(m);
  if (!m || m.hidden) return;
  m.hidden = true;
  const vid = m.querySelector("video");
  if (vid) vid.pause();
  const hook = modalCloseHooks[m.id];
  if (hook) { delete modalCloseHooks[m.id]; hook(); }
  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus();
  modalReturnFocus = null;
}

function topModal() {
  const mods = [...document.querySelectorAll(".modal")].filter((m) => !m.hidden);
  return mods[mods.length - 1] || null;
}

function modalFocusables(m) {
  return [...m.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
}

document.addEventListener("keydown", (e) => {
  const m = topModal();
  if (!m) return;
  if (e.key === "Escape") { e.preventDefault(); closeModal(m); return; }
  if (e.key !== "Tab") return;
  const f = modalFocusables(m);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// ---------- Dialog di conferma (sostituisce confirm() nativo) ----------
function confirmDialog({ title = "Conferma", bodyHtml = "", okLabel = "Elimina", danger = true } = {}) {
  return new Promise((resolve) => {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmBody").innerHTML = bodyHtml;
    const ok = document.getElementById("confirmOk");
    const cancel = document.getElementById("confirmCancel");
    ok.textContent = okLabel;
    ok.className = danger ? "btn btn-danger" : "btn btn-primary";
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      ok.onclick = null; cancel.onclick = null;
      delete modalCloseHooks.modalConfirm;
      closeModal("modalConfirm");
      resolve(val);
    };
    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    modalCloseHooks.modalConfirm = () => { if (!done) { done = true; ok.onclick = null; cancel.onclick = null; resolve(false); } };
    openModal("modalConfirm");
    cancel.focus(); // default sull'azione sicura, non su "Elimina"
  });
}

// ---------- Toast con azione "Annulla" ----------
function toastUndo(msg, undoFn, ms = 6000) {
  const el = document.getElementById("toast");
  el.textContent = "";
  const span = document.createElement("span");
  span.textContent = msg;
  const btn = document.createElement("button");
  btn.className = "toast-undo";
  btn.textContent = "↩︎ Annulla";
  el.append(span, btn);
  el.hidden = false;
  el.onclick = null; // qui comanda solo il bottone Annulla
  clearTimeout(el._t);
  btn.onclick = () => { clearTimeout(el._t); el.hidden = true; el.textContent = ""; undoFn(); };
  el._t = setTimeout(() => { el.hidden = true; el.textContent = ""; }, ms);
}

// ---------- Utility ----------
function teamById(id) { return state.teams.find((t) => t.id === id); }
function teamName(id) { const t = teamById(id); return t ? t.name : "?"; }
// Pallino colore per un id squadra, sicuro da iniettare come HTML (stringa vuota se squadra assente).
function teamDotById(id) { const t = teamById(id); return t ? teamDot(t) : ""; }
function matchTeamName(m, side) { return matchSideName(m, side, state.teams); }
function matchTeamDot(m, side) { const t = teamById(m["team" + side]); return t ? teamDot(t) : ""; }
function inTourney(t) { return t.tournament === state.tourney || t.tournament === "entrambi"; }
// Normalizza i giocatori: stringhe legacy -> oggetti {name, gender}
function normPlayers(t) {
  return ((t && t.players) || []).map((p) =>
    typeof p === "string" ? { name: p, gender: "m" } : { name: p.name, gender: p.gender === "f" ? "f" : "m" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  el.onclick = () => { clearTimeout(el._t); el.hidden = true; el.textContent = ""; }; // click per chiudere
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 3000);
}

// Tempo relativo compatto: "ora", "5 min fa", "2 h fa", "3 g fa"
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "ora";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24); return `${d} g fa`;
}

// ---------- Render ----------
function renderAll() {
  renderNextMatches();
  renderTeams();
  renderMatches();
  renderStandings();
  renderScorers();
  renderFanta();
  renderMvp();
  renderGallery();
  if (typeof renderAdmin === "function") renderAdmin();
}

function currentMatches() {
  return state.matches
    .filter((m) => m.tournament === state.tourney)
    .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}

function renderNextMatches() {
  const el = document.getElementById("nextMatches");
  const next = currentMatches().filter((m) => !m.played).slice(0, 3);
  if (!next.length) {
    el.innerHTML = '<p class="muted">Nessuna partita in programma. Il calendario verrà pubblicato qualche giorno prima del torneo!</p>';
    return;
  }
  el.innerHTML = next.map((m) => `
    <div class="next-match">
      <span class="when">${esc(m.day)} · ${esc(m.time)}</span>
      <span>${matchTeamDot(m, "A")}${esc(matchTeamName(m, "A"))} <b>vs</b> ${matchTeamDot(m, "B")}${esc(matchTeamName(m, "B"))}</span>
      ${m.label ? `<span class="muted">(${esc(m.label)})</span>` : ""}
    </div>`).join("");
}

function renderTeams() {
  const el = document.getElementById("teamsGrid");
  document.getElementById("squadreTitle").textContent =
    state.tourney === "calcetto" ? "⚽ Squadre – Calcetto Saponato" : "🏐 Squadre – Splash Volley";
  const teams = state.teams.filter(inTourney).sort((a, b) => a.name.localeCompare(b.name));
  if (!teams.length) {
    el.innerHTML = '<p class="muted">Le squadre verranno pubblicate a breve…</p>';
    return;
  }
  el.innerHTML = teams.map((t) => `
    <div class="team-card" style="${teamCardStyle(t)}">
      <h3>${teamDot(t)}${esc(t.name)}
        ${t.tournament === "entrambi" ? '<span class="team-badge">⚽+🏐</span>' : ""}</h3>
      <ul>${normPlayers(t).map((p) => `<li>${esc(p.name)}${p.gender === "f" ? " <span class='f-mark'>♀</span>" : ""}</li>`).join("")}</ul>
    </div>`).join("");
}

function renderMatches() {
  const el = document.getElementById("matchesList");
  const matches = currentMatches();
  if (!matches.length) {
    el.innerHTML = '<p class="muted">Il calendario preciso delle partite verrà indicato qualche giorno prima dell\'inizio del torneo.</p>';
    return;
  }
  const byDay = {};
  matches.forEach((m) => (byDay[m.day] = byDay[m.day] || []).push(m));
  el.innerHTML = Object.keys(byDay).sort().map((day) => `
    <div class="match-day">
      <h3>📆 ${esc(day)}</h3>
      ${byDay[day].map((m) => {
        const scorersTxt = (m.scorers || []).map((s) => `${esc(s.player)}${s.goals > 1 ? " ×" + s.goals : ""}`).join(", ");
        return `
        <div class="match-row">
          <span class="time">${esc(m.time)}</span>
          <span class="team a">${matchTeamDot(m, "A")}${esc(matchTeamName(m, "A"))}</span>
          <span class="score ${m.played ? "" : "pending"}">${m.played ? `${m.scoreA} – ${m.scoreB}` : "vs"}</span>
          <span class="team b">${matchTeamDot(m, "B")}${esc(matchTeamName(m, "B"))}</span>
          ${m.label ? `<span class="match-label">${esc(m.label)}</span>` : ""}
          ${m.played && scorersTxt ? `<span class="match-scorers">⚽ ${scorersTxt}</span>` : ""}
        </div>`;
      }).join("")}
    </div>`).join("");
}

function renderStandings() {
  const el = document.getElementById("standings");
  const played = currentMatches().filter((m) => m.played && matchSideHasRealTeam(m, "A", state.teams) && matchSideHasRealTeam(m, "B", state.teams));
  if (!played.length) {
    el.innerHTML = '<p class="muted">Classifica non ancora disponibile…</p>';
    return;
  }
  const table = {};
  const row = (id) => (table[id] = table[id] || { id, pts: 0, g: 0, w: 0, d: 0, l: 0, gf: 0, gs: 0 });
  played.forEach((m) => {
    const a = row(m.teamA), b = row(m.teamB);
    a.g++; b.g++;
    a.gf += m.scoreA; a.gs += m.scoreB;
    b.gf += m.scoreB; b.gs += m.scoreA;
    if (m.scoreA > m.scoreB) { a.w++; b.l++; a.pts += 3; }
    else if (m.scoreA < m.scoreB) { b.w++; a.l++; b.pts += 3; }
    else { a.d++; b.d++; a.pts++; b.pts++; }
  });
  const rows = Object.values(table).sort((x, y) => y.pts - x.pts || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf);
  const unit = state.tourney === "calcetto" ? "Gol" : "Set";
  el.innerHTML = `
    <table class="rank">
      <tr><th>#</th><th>Squadra</th><th>Pt</th><th>G</th><th>V</th><th>N</th><th>P</th><th>${unit} F</th><th>${unit} S</th></tr>
      ${rows.map((r, i) => `
        <tr><td>${i + 1}</td><td>${teamDotById(r.id)}${esc(teamName(r.id))}</td><td><b>${r.pts}</b></td>
        <td>${r.g}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.gs}</td></tr>`).join("")}
    </table>
    <p class="muted" style="font-size:.8rem">Vittoria 3 pt · Pareggio 1 pt · Sconfitta 0 pt</p>`;
}

function renderScorers() {
  const sec = document.getElementById("secMarcatori");
  sec.style.display = state.tourney === "calcetto" ? "" : "none";
  if (state.tourney !== "calcetto") return;
  const el = document.getElementById("scorers");
  const tally = {};
  state.matches.filter((m) => m.tournament === "calcetto" && m.played && matchSideHasRealTeam(m, "A", state.teams) && matchSideHasRealTeam(m, "B", state.teams)).forEach((m) => {
    (m.scorers || []).forEach((s) => {
      const tid = s.team === "A" ? m.teamA : m.teamB;
      const key = `${s.player}|${tid}`;
      tally[key] = tally[key] || { player: s.player, teamId: tid, goals: 0 };
      tally[key].goals += Number(s.goals) || 0;
    });
  });
  const rows = Object.values(tally).sort((a, b) => b.goals - a.goals).slice(0, 15);
  if (!rows.length) {
    el.innerHTML = '<p class="muted">Nessun gol registrato…</p>';
    return;
  }
  el.innerHTML = `
    <table class="rank">
      <tr><th>#</th><th>Giocatore</th><th>Squadra</th><th>Gol</th></tr>
      ${rows.map((r, i) => `
        <tr><td>${i + 1}</td><td>${esc(r.player)}</td><td>${teamDotById(r.teamId)}${esc(teamName(r.teamId))}</td><td><b>${r.goals}</b></td></tr>`).join("")}
    </table>`;
}

// ---------- Fanta Splash ----------
function renderFanta() {
  const rankEl = document.getElementById("fantaRanking");
  const logEl = document.getElementById("fantaLog");
  if (!state.fanta.length) {
    rankEl.innerHTML = '<p class="muted">Nessun punto assegnato per ora…</p>';
    logEl.innerHTML = "";
    return;
  }
  const totals = {};
  state.fanta.forEach((f) => {
    const team = teamById(f.teamId);
    if (!team || !inTourney(team)) return;
    totals[f.teamId] = (totals[f.teamId] || 0) + (Number(f.points) || 0);
  });
  const rows = Object.entries(totals)
    .map(([teamId, pts]) => ({ teamId, pts }))
    .sort((a, b) => b.pts - a.pts);
  if (!rows.length) {
    rankEl.innerHTML = '<p class="muted">Nessun punto assegnato per ora…</p>';
    logEl.innerHTML = "";
    return;
  }
  rankEl.innerHTML = `
    <table class="rank">
      <tr><th>#</th><th>Squadra</th><th>Punti Fanta</th></tr>
      ${rows.map((r, i) => `
        <tr><td>${i + 1}</td><td>${teamDotById(r.teamId)}${esc(teamName(r.teamId))}</td><td><b>${r.pts}</b></td></tr>`).join("")}
    </table>`;
  const last = [...state.fanta]
    .filter((f) => { const t = teamById(f.teamId); return t && inTourney(t); })
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 6);
  logEl.innerHTML = `<h3>Ultimi punti assegnati</h3>` + last.map((f) => `
    <div class="fanta-entry">
      <span class="fanta-pts ${f.points < 0 ? "neg" : ""}">${f.points > 0 ? "+" : ""}${f.points}</span>
      <span>${teamDotById(f.teamId)}<b>${esc(teamName(f.teamId))}</b> · ${esc(f.reason)}</span>
    </div>`).join("");
}

// ---------- MVP ----------
function voteDocId(cat) { return `${state.uid}_${state.tourney}_${cat}`; }
function myVote(cat) {
  if (!state.uid) return null;
  return state.votes.find((v) => v.id === voteDocId(cat)) || null;
}

function renderMvp() {
  renderMvpCategory("m");
  renderMvpCategory("f");
}

function renderMvpCategory(cat) {
  const area = document.getElementById(cat === "m" ? "mvpAreaM" : "mvpAreaF");
  const mine = myVote(cat);
  const teams = state.teams.filter(inTourney).sort((a, b) => a.name.localeCompare(b.name));
  const anyPlayers = teams.some((t) => normPlayers(t).some((p) => p.gender === cat));

  if (mine && !area.dataset.editing) {
    area.innerHTML = `
      <div class="mvp-voted">✅ Il tuo voto: <b>${esc(mine.player)}</b> <span class="muted">(${esc(mine.teamName)})</span>
        <button class="btn-ghost mvp-change">✏️ Cambia voto</button></div>`;
    area.querySelector(".mvp-change").addEventListener("click", () => {
      area.dataset.editing = "1";
      renderMvpCategory(cat);
    });
  } else if (!anyPlayers) {
    area.innerHTML = '<p class="muted">La votazione si aprirà quando saranno pubblicate le squadre.</p>';
  } else {
    area.innerHTML = `
      <div class="mvp-form">
        <select class="mvpTeam"><option value="">Squadra…</option>
          ${teams.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}
        </select>
        <select class="mvpPlayer" disabled><option value="">${cat === "f" ? "Giocatrice…" : "Giocatore…"}</option></select>
        <button class="btn btn-primary mvpVote" disabled>⭐ Vota</button>
        ${mine ? '<button class="btn-ghost mvpCancel">Annulla</button>' : ""}
      </div>`;
    const selTeam = area.querySelector(".mvpTeam");
    const selPlayer = area.querySelector(".mvpPlayer");
    const btn = area.querySelector(".mvpVote");
    selTeam.addEventListener("change", () => {
      const t = teamById(selTeam.value);
      const players = t ? normPlayers(t).filter((p) => p.gender === cat) : [];
      selPlayer.innerHTML = `<option value="">${cat === "f" ? "Giocatrice…" : "Giocatore…"}</option>` +
        players.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
      selPlayer.disabled = !players.length;
      btn.disabled = true;
    });
    selPlayer.addEventListener("change", () => (btn.disabled = !selPlayer.value));
    btn.addEventListener("click", () => submitVote(cat, selTeam.value, selPlayer.value, area));
    const cancel = area.querySelector(".mvpCancel");
    if (cancel) cancel.addEventListener("click", () => {
      delete area.dataset.editing;
      renderMvpCategory(cat);
    });
  }
  renderMvpRanking(cat);
}

async function submitVote(cat, teamId, player, area) {
  if (!teamId || !player) return;
  if (!state.uid) return toast("⏳ Connessione in corso, riprova tra un attimo");
  const t = teamById(teamId);
  const vote = {
    player,
    teamId,
    teamName: t ? t.name : "?",
    tournament: state.tourney,
    category: cat,
    uid: state.uid,
    ts: Date.now(),
  };
  try {
    await db.collection("votes").doc(voteDocId(cat)).set(vote);
  } catch (e) {
    console.error(e);
    toast("❌ Errore nell'invio del voto, riprova");
    return;
  }
  delete area.dataset.editing;
  toast("⭐ Grazie per il tuo voto!");
  renderMvpCategory(cat);
}

function renderMvpRanking(cat) {
  const el = document.getElementById(cat === "m" ? "mvpRankingM" : "mvpRankingF");
  const tally = {};
  state.votes.filter((v) => v.tournament === state.tourney && (v.category || "m") === cat).forEach((v) => {
    const key = `${v.player}|${v.teamName}`;
    tally[key] = tally[key] || { player: v.player, teamName: v.teamName, n: 0 };
    tally[key].n++;
  });
  const rows = Object.values(tally).sort((a, b) => b.n - a.n).slice(0, 5);
  if (!rows.length) {
    el.innerHTML = '<p class="muted">Nessun voto per ora…</p>';
    return;
  }
  const max = rows[0].n;
  el.innerHTML = rows.map((r) => `
    <div class="mvp-bar">
      <span class="lbl">${esc(r.player)} <span class="muted">(${esc(r.teamName)})</span></span>
      <span class="bar" style="width:${Math.max(8, (r.n / max) * 55)}%"></span>
      <span class="n">${r.n}</span>
    </div>`).join("");
}

// ---------- Galleria ----------
function cloudinaryReady() {
  return SITE_CONFIG.cloudinaryCloudName && SITE_CONFIG.cloudinaryCloudName !== "REPLACE_ME";
}

function setupUpload() {
  const input = document.getElementById("phFile");
  if (!cloudinaryReady()) {
    document.querySelector(".upload-row").hidden = true;
    return;
  }
  input.addEventListener("change", async () => {
    const files = [...input.files];
    input.value = "";
    const team = document.getElementById("phTeam").value.trim();
    if (!team) return toast("Scrivi prima il nome della tua squadra!");
    for (const file of files) await uploadFile(file, team);
  });
}

async function uploadFile(file, team) {
  const statusEl = document.getElementById("uploadStatus");
  const isVideo = file.type.startsWith("video");
  const maxMB = isVideo ? 100 : 10;
  if (file.size > maxMB * 1024 * 1024) {
    toast(`❌ ${file.name}: max ${maxMB}MB`);
    return;
  }
  const row = document.createElement("p");
  row.className = "muted";
  row.textContent = `⏳ Caricamento ${file.name}…`;
  statusEl.appendChild(row);

  try {
    let url, type = isVideo ? "video" : "image";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", SITE_CONFIG.cloudinaryUploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${SITE_CONFIG.cloudinaryCloudName}/auto/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload fallito");
    const data = await res.json();
    url = data.secure_url;
    type = data.resource_type === "video" ? "video" : "image";
    await db.collection("photos").add({ url, type, team, approved: false, uid: state.uid || "", ts: Date.now() });
    row.textContent = `✅ ${file.name} inviato! Sarà visibile dopo l'approvazione dello staff.`;
  } catch (e) {
    console.error(e);
    row.textContent = `❌ Errore nel caricamento di ${file.name}, riprova`;
  }
}

// Miniatura Cloudinary (inserisce trasformazione nell'URL)
function thumbUrl(p) {
  if (!p.url.includes("/upload/")) return p.url;
  const t = p.type === "video" ? "w_400,c_fill,q_auto,so_0" : "w_400,c_fill,q_auto";
  let u = p.url.replace("/upload/", `/upload/${t}/`);
  if (p.type === "video") u = u.replace(/\.\w+$/, ".jpg"); // poster frame
  return u;
}

function renderGallery() {
  const el = document.getElementById("gallery");
  const items = state.photos.filter((p) => p.approved).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (!items.length) {
    el.innerHTML = '<p class="muted">Nessun contenuto per ora… carica tu la prima foto!</p>';
    return;
  }
  el.innerHTML = items.map((p, i) => `
    <figure class="gallery-item" data-i="${i}">
      <img src="${esc(thumbUrl(p))}" alt="Foto di ${esc(p.team || "")}" loading="lazy">
      ${p.type === "video" ? '<span class="play-badge">▶</span>' : ""}
      <figcaption>${esc(p.team || "")}</figcaption>
    </figure>`).join("");
  el.querySelectorAll(".gallery-item").forEach((fig) => {
    fig.addEventListener("click", () => openLightbox(items[Number(fig.dataset.i)]));
  });
}

function openLightbox(p) {
  const box = document.getElementById("lightboxContent");
  box.innerHTML = p.type === "video"
    ? `<video src="${esc(p.url)}" controls autoplay playsinline></video>`
    : `<img src="${esc(p.url)}" alt="Foto di ${esc(p.team || "")}">`;
  openModal("modalLightbox");
  document.getElementById("modalLightbox").addEventListener("click", () => {
    const v = box.querySelector("video");
    if (v) v.pause();
  }, { once: true });
}

// ---------- Bollicine decorative ----------
function spawnBubbles() {
  const box = document.querySelector(".hero-bubbles");
  if (!box) return;
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("i");
    const size = 10 + Math.random() * 40;
    b.style.width = b.style.height = size + "px";
    b.style.left = Math.random() * 100 + "%";
    b.style.animationDuration = 7 + Math.random() * 10 + "s";
    b.style.animationDelay = -Math.random() * 10 + "s";
    box.appendChild(b);
  }
}
