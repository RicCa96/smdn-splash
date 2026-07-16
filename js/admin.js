/* ===== Splash SMDN – pannello admin ===== */

const admin = {
  logged: false,
  scorers: [],
  selMatchId: null,
  photos: [],        // tutte le foto (anche non approvate), solo per admin
  photosUnsub: null,
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
  admin.logged = false;
  if (admin.photosUnsub) { admin.photosUnsub(); admin.photosUnsub = null; }
  document.getElementById("adminPanel").hidden = true;
  document.getElementById("adminLogin").hidden = false;
  if (!state.demo && auth) await auth.signOut(); // onAuthStateChanged farà login anonimo
});

function showAdminPanel() {
  document.getElementById("adminLogin").hidden = true;
  document.getElementById("adminPanel").hidden = false;
  subscribeAdminPhotos();
  renderAdmin();
}

// Se già autenticato come admin (refresh pagina)
if (!state.demo && auth) {
  auth.onAuthStateChanged((u) => {
    if (u && !u.isAnonymous) { admin.logged = true; showAdminPanel(); }
  });
}

function subscribeAdminPhotos() {
  if (state.demo) {
    admin.photos = state.photos;
    return;
  }
  if (admin.photosUnsub) return;
  admin.photosUnsub = db.collection("photos").onSnapshot((snap) => {
    admin.photos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminPhotos();
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
// "Nome (F)" -> {name: "Nome", gender: "f"}
function parsePlayers(text) {
  return text.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
    const f = /\((f|F)\)\s*$/.test(line);
    return { name: line.replace(/\((f|F)\)\s*$/, "").trim(), gender: f ? "f" : "m" };
  });
}

document.getElementById("btnAddTeam").addEventListener("click", async () => {
  const name = document.getElementById("tName").value.trim();
  if (!name) return toast("Inserisci il nome della squadra");
  const team = {
    name,
    tournament: document.getElementById("tTourney").value,
    emoji: document.getElementById("tEmoji").value.trim() || "🏳️",
    players: parsePlayers(document.getElementById("tPlayers").value),
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

// ---------- Fanta ----------
document.getElementById("fReason").addEventListener("change", () => {
  const sel = document.getElementById("fReason");
  document.getElementById("fReasonCustom").hidden = sel.value !== "_altro";
  // precompila i punti se il motivo li contiene, es. "(+50)"
  const m = sel.value.match(/\(\+?(-?\d+)\)/);
  if (m) document.getElementById("fPoints").value = m[1];
});

document.getElementById("btnAddFanta").addEventListener("click", async () => {
  const teamId = document.getElementById("fTeam").value;
  const selReason = document.getElementById("fReason").value;
  const reason = selReason === "_altro"
    ? document.getElementById("fReasonCustom").value.trim()
    : selReason.replace(/\s*\(\+?-?\d+\)\s*$/, "");
  const points = Number(document.getElementById("fPoints").value);
  if (!teamId) return toast("Seleziona la squadra");
  if (!reason) return toast("Indica il motivo");
  if (!points) return toast("Indica i punti");
  try {
    await dbAdd("fanta", { teamId, reason, points, ts: Date.now() });
    document.getElementById("fPoints").value = "";
    document.getElementById("fReasonCustom").value = "";
    toast("✅ Punti fanta assegnati");
  } catch (e) { console.error(e); toast("❌ Errore nel salvataggio"); }
});

async function adminDeleteFanta(id) {
  if (!confirm("Rimuovere questa voce fanta?")) return;
  try { await dbDelete("fanta", id); toast("🗑️ Voce rimossa"); }
  catch (e) { console.error(e); toast("❌ Errore"); }
}

// ---------- Foto ----------
async function adminApprovePhoto(id) {
  try { await adminUpdatePhoto(id, { approved: true }); toast("✅ Pubblicata"); }
  catch (e) { console.error(e); toast("❌ Errore"); }
}
async function adminUpdatePhoto(id, data) {
  if (state.demo) {
    const p = admin.photos.find((x) => x.id === id);
    if (p) Object.assign(p, data);
    renderAdminPhotos(); renderGallery();
    return;
  }
  await db.collection("photos").doc(id).update(data);
}
async function adminDeletePhoto(id) {
  if (!confirm("Eliminare questo contenuto?")) return;
  try {
    if (state.demo) {
      admin.photos = admin.photos.filter((x) => x.id !== id);
      state.photos = state.photos.filter((x) => x.id !== id);
      renderAdminPhotos(); renderGallery();
    } else {
      await db.collection("photos").doc(id).delete();
    }
    toast("🗑️ Contenuto eliminato");
  } catch (e) { console.error(e); toast("❌ Errore"); }
}

// ---------- Cancellazione squadra a cascata ----------
async function adminDeleteTeam(id) {
  const t = teamById(id);
  if (!confirm(`Eliminare la squadra "${t ? t.name : "?"}"?\nVerranno rimossi anche i voti MVP dei suoi giocatori e i suoi punti fanta.`)) return;
  try {
    if (state.demo) {
      state.teams = state.teams.filter((x) => x.id !== id);
      state.votes = state.votes.filter((v) => v.teamId !== id);
      state.fanta = state.fanta.filter((f) => f.teamId !== id);
      renderAll();
    } else {
      const batch = db.batch();
      batch.delete(db.collection("teams").doc(id));
      const votes = await db.collection("votes").where("teamId", "==", id).get();
      votes.forEach((d) => batch.delete(d.ref));
      const fanta = await db.collection("fanta").where("teamId", "==", id).get();
      fanta.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    toast("🗑️ Squadra eliminata (con voti e punti fanta)");
  } catch (e) { console.error(e); toast("❌ Errore"); }
}

async function adminDeleteMatch(id) {
  if (!confirm("Eliminare questa partita?")) return;
  try { await dbDelete("matches", id); toast("🗑️ Partita eliminata"); }
  catch (e) { console.error(e); toast("❌ Errore"); }
}

// ---------- Render pannello ----------
function renderAdmin() {
  if (!admin.logged) return;
  renderAdminTeams();
  renderAdminMatches();
  renderAdminFanta();
  renderAdminPhotos();
  fillMatchTeamSelects();
  fillFantaTeamSelect();
  fillResultSelect();
}

function renderAdminTeams() {
  const el = document.getElementById("adminTeamsList");
  const icon = { calcetto: "⚽", volley: "🏐", entrambi: "⚽🏐" };
  el.innerHTML = [...state.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `
      <div class="admin-item">
        <span>${esc(t.emoji || "🏳️")}</span>
        <span class="grow"><b>${esc(t.name)}</b> ${icon[t.tournament] || ""} · ${normPlayers(t).length} giocatori</span>
        <button title="Elimina" onclick="adminDeleteTeam('${t.id}')">🗑️</button>
      </div>`).join("") || '<p class="muted">Nessuna squadra.</p>';
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

function renderAdminFanta() {
  const el = document.getElementById("adminFantaList");
  const entries = [...state.fanta].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  el.innerHTML = entries.map((f) => `
    <div class="admin-item">
      <span class="fanta-pts ${f.points < 0 ? "neg" : ""}">${f.points > 0 ? "+" : ""}${f.points}</span>
      <span class="grow"><b>${esc(teamName(f.teamId))}</b> · ${esc(f.reason)}</span>
      <button title="Rimuovi" onclick="adminDeleteFanta('${f.id}')">🗑️</button>
    </div>`).join("") || '<p class="muted">Nessun punto assegnato.</p>';
}

function renderAdminPhotos() {
  if (!admin.logged) return;
  const pend = document.getElementById("adminPhotosPending");
  const appr = document.getElementById("adminPhotosApproved");
  const item = (p, actions) => `
    <div class="admin-item">
      <img class="admin-thumb" src="${esc(thumbUrl(p))}" alt="">
      <span class="grow">${esc(p.team || "?")} ${p.type === "video" ? "🎬" : "📷"}</span>
      ${actions}
    </div>`;
  const pending = admin.photos.filter((p) => !p.approved);
  const approved = admin.photos.filter((p) => p.approved);
  pend.innerHTML = pending.map((p) => item(p,
    `<button title="Approva" onclick="adminApprovePhoto('${p.id}')">✅</button>
     <button title="Elimina" onclick="adminDeletePhoto('${p.id}')">🗑️</button>`)).join("")
    || '<p class="muted">Nessun contenuto in attesa.</p>';
  appr.innerHTML = approved.map((p) => item(p,
    `<button title="Elimina" onclick="adminDeletePhoto('${p.id}')">🗑️</button>`)).join("")
    || '<p class="muted">Nessun contenuto pubblicato.</p>';
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

function fillFantaTeamSelect() {
  const sel = document.getElementById("fTeam");
  const prev = sel.value;
  sel.innerHTML = '<option value="">Squadra…</option>' + [...state.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `<option value="${esc(t.id)}">${esc(t.emoji || "")} ${esc(t.name)}</option>`).join("");
  if (prev && state.teams.some((t) => t.id === prev)) sel.value = prev;
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
    normPlayers(t).map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
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
