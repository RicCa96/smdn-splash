/* ===== Splash SMDN – pannello admin ===== */

const admin = {
  logged: false,
  scorers: [],       // marcatori in modifica per la partita selezionata
  selMatchId: null,
};

// ---------- Login / logout ----------
document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const pass = document.getElementById("adminPass").value;
  const errEl = document.getElementById("adminLoginError");
  errEl.hidden = true;

  if (state.demo) {
    admin.logged = true;
    showAdminPanel();
    toast("⚠️ Modalità demo: le modifiche non vengono salvate");
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    admin.logged = true;
    showAdminPanel();
  } catch (e) {
    errEl.hidden = false;
  }
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  if (!state.demo && auth) await auth.signOut();
  admin.logged = false;
  document.getElementById("adminPanel").hidden = true;
  document.getElementById("adminLogin").hidden = false;
});

function showAdminPanel() {
  document.getElementById("adminLogin").hidden = true;
  document.getElementById("adminPanel").hidden = false;
  renderAdmin();
}

// Se già autenticato (refresh pagina)
if (!state.demo && auth) {
  auth.onAuthStateChanged((u) => {
    if (u) { admin.logged = true; showAdminPanel(); }
  });
}

// ---------- Tab admin ----------
document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-pane").forEach((p) => (p.hidden = true));
    document.getElementById("apane-" + btn.dataset.atab).hidden = false;
  });
});

// ---------- Persistenza ----------
async function dbAdd(coll, data) {
  if (state.demo) {
    data.id = "demo_" + Math.random().toString(36).slice(2, 8);
    state[coll].push(data);
    renderAll();
    return;
  }
  await db.collection(coll).add(data);
}
async function dbUpdate(coll, id, data) {
  if (state.demo) {
    const item = state[coll].find((x) => x.id === id);
    if (item) Object.assign(item, data);
    renderAll();
    return;
  }
  await db.collection(coll).doc(id).update(data);
}
async function dbDelete(coll, id) {
  if (state.demo) {
    state[coll] = state[coll].filter((x) => x.id !== id);
    renderAll();
    return;
  }
  await db.collection(coll).doc(id).delete();
}

// ---------- Squadre ----------
document.getElementById("btnAddTeam").addEventListener("click", async () => {
  const name = document.getElementById("tName").value.trim();
  if (!name) return toast("Inserisci il nome della squadra");
  const team = {
    name,
    tournament: document.getElementById("tTourney").value,
    emoji: document.getElementById("tEmoji").value.trim() || "🏳️",
    players: document.getElementById("tPlayers").value.split("\n").map((s) => s.trim()).filter(Boolean),
  };
  try {
    await dbAdd("teams", team);
    document.getElementById("tName").value = "";
    document.getElementById("tEmoji").value = "";
    document.getElementById("tPlayers").value = "";
    toast("✅ Squadra salvata");
  } catch (e) { console.error(e); toast("❌ Errore nel salvataggio"); }
});

// ---------- Partite ----------
document.getElementById("btnAddMatch").addEventListener("click", async () => {
  const teamA = document.getElementById("mTeamA").value;
  const teamB = document.getElementById("mTeamB").value;
  if (!teamA || !teamB) return toast("Seleziona le due squadre");
  if (teamA === teamB) return toast("Le squadre devono essere diverse");
  const match = {
    tournament: document.getElementById("mTourney").value,
    teamA, teamB,
    day: document.getElementById("mDay").value,
    time: document.getElementById("mTime").value || "17:00",
    label: document.getElementById("mLabel").value.trim(),
    played: false, scoreA: 0, scoreB: 0, scorers: [],
  };
  try {
    await dbAdd("matches", match);
    toast("✅ Partita aggiunta");
  } catch (e) { console.error(e); toast("❌ Errore nel salvataggio"); }
});

document.getElementById("mTourney").addEventListener("change", fillMatchTeamSelects);

// ---------- Risultati ----------
document.getElementById("rMatch").addEventListener("change", () => {
  admin.selMatchId = document.getElementById("rMatch").value || null;
  loadResultEditor();
});

document.getElementById("rScorerTeam").addEventListener("change", fillScorerPlayers);

document.getElementById("btnAddScorer").addEventListener("click", () => {
  const player = document.getElementById("rScorerPlayer").value;
  const goals = Number(document.getElementById("rScorerGoals").value) || 1;
  const team = document.getElementById("rScorerTeam").value;
  if (!player) return toast("Seleziona il marcatore");
  admin.scorers.push({ team, player, goals });
  renderScorerList();
});

document.getElementById("btnSaveResult").addEventListener("click", async () => {
  if (!admin.selMatchId) return;
  const data = {
    scoreA: Number(document.getElementById("rScoreA").value) || 0,
    scoreB: Number(document.getElementById("rScoreB").value) || 0,
    played: document.getElementById("rPlayed").checked,
    scorers: admin.scorers,
  };
  try {
    await dbUpdate("matches", admin.selMatchId, data);
    toast("✅ Risultato salvato");
  } catch (e) { console.error(e); toast("❌ Errore nel salvataggio"); }
});

// ---------- Render pannello ----------
function renderAdmin() {
  if (!admin.logged) return;
  renderAdminTeams();
  renderAdminMatches();
  fillMatchTeamSelects();
  fillResultSelect();
}

function renderAdminTeams() {
  const el = document.getElementById("adminTeamsList");
  const icon = { calcetto: "⚽", volley: "🏐", entrambi: "⚽🏐" };
  el.innerHTML = state.teams
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `
      <div class="admin-item">
        <span>${esc(t.emoji || "🏳️")}</span>
        <span class="grow"><b>${esc(t.name)}</b> ${icon[t.tournament] || ""} · ${(t.players || []).length} giocatori</span>
        <button title="Elimina" onclick="adminDeleteTeam('${t.id}')">🗑️</button>
      </div>`).join("") || '<p class="muted">Nessuna squadra.</p>';
}

async function adminDeleteTeam(id) {
  const t = teamById(id);
  if (!confirm(`Eliminare la squadra "${t ? t.name : "?"}"?`)) return;
  try { await dbDelete("teams", id); toast("🗑️ Squadra eliminata"); }
  catch (e) { console.error(e); toast("❌ Errore"); }
}

function renderAdminMatches() {
  const el = document.getElementById("adminMatchesList");
  const ms = [...state.matches].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  el.innerHTML = ms.map((m) => `
    <div class="admin-item">
      <span>${m.tournament === "calcetto" ? "⚽" : "🏐"}</span>
      <span class="grow">${esc(m.day)} ${esc(m.time)} · ${esc(teamName(m.teamA))} vs ${esc(teamName(m.teamB))}
        ${m.played ? `<b>(${m.scoreA}–${m.scoreB})</b>` : ""}</span>
      <button title="Elimina" onclick="adminDeleteMatch('${m.id}')">🗑️</button>
    </div>`).join("") || '<p class="muted">Nessuna partita.</p>';
}

async function adminDeleteMatch(id) {
  if (!confirm("Eliminare questa partita?")) return;
  try { await dbDelete("matches", id); toast("🗑️ Partita eliminata"); }
  catch (e) { console.error(e); toast("❌ Errore"); }
}

function fillMatchTeamSelects() {
  const tourney = document.getElementById("mTourney").value;
  const opts = state.teams
    .filter((t) => t.tournament === tourney || t.tournament === "entrambi")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `<option value="${esc(t.id)}">${esc(t.emoji || "")} ${esc(t.name)}</option>`)
    .join("");
  document.getElementById("mTeamA").innerHTML = '<option value="">Squadra 1…</option>' + opts;
  document.getElementById("mTeamB").innerHTML = '<option value="">Squadra 2…</option>' + opts;
}

function fillResultSelect() {
  const sel = document.getElementById("rMatch");
  const prev = sel.value;
  const ms = [...state.matches].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  sel.innerHTML = '<option value="">Seleziona partita…</option>' + ms.map((m) => `
    <option value="${esc(m.id)}">${m.tournament === "calcetto" ? "⚽" : "🏐"} ${esc(m.day)} ${esc(m.time)} – ${esc(teamName(m.teamA))} vs ${esc(teamName(m.teamB))}</option>`).join("");
  if (prev && ms.some((m) => m.id === prev)) sel.value = prev;
}

function loadResultEditor() {
  const box = document.getElementById("rEditor");
  const m = state.matches.find((x) => x.id === admin.selMatchId);
  if (!m) { box.hidden = true; return; }
  box.hidden = false;
  document.getElementById("rTeamAName").textContent = teamName(m.teamA);
  document.getElementById("rTeamBName").textContent = teamName(m.teamB);
  document.getElementById("rScoreA").value = m.scoreA || 0;
  document.getElementById("rScoreB").value = m.scoreB || 0;
  document.getElementById("rPlayed").checked = !!m.played;
  admin.scorers = (m.scorers || []).map((s) => ({ ...s }));

  const isCalcetto = m.tournament === "calcetto";
  document.getElementById("rScorersBox").hidden = !isCalcetto;
  if (isCalcetto) {
    const selT = document.getElementById("rScorerTeam");
    selT.options[0].text = teamName(m.teamA);
    selT.options[1].text = teamName(m.teamB);
    fillScorerPlayers();
    renderScorerList();
  }
}

function fillScorerPlayers() {
  const m = state.matches.find((x) => x.id === admin.selMatchId);
  if (!m) return;
  const side = document.getElementById("rScorerTeam").value;
  const t = teamById(side === "A" ? m.teamA : m.teamB);
  document.getElementById("rScorerPlayer").innerHTML =
    '<option value="">Marcatore…</option>' +
    ((t && t.players) || []).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
}

function renderScorerList() {
  const m = state.matches.find((x) => x.id === admin.selMatchId);
  const el = document.getElementById("rScorersList");
  el.innerHTML = admin.scorers.map((s, i) => `
    <div class="admin-item">
      <span class="grow">${esc(s.player)} (${esc(teamName(s.team === "A" ? m.teamA : m.teamB))}) ×${s.goals}</span>
      <button title="Rimuovi" onclick="adminRemoveScorer(${i})">🗑️</button>
    </div>`).join("") || '<p class="muted">Nessun marcatore inserito.</p>';
}

function adminRemoveScorer(i) {
  admin.scorers.splice(i, 1);
  renderScorerList();
}
