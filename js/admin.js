/* ===== Splash SMDN – pannello admin ===== */

const admin = {
  logged: false,
  scorers: [],
  selMatchId: null,
  photos: [],        // tutte le foto (anche non approvate), solo per admin
  photosUnsub: null,
  editTeamId: null,  // id squadra in modifica (null = nuova)
  editMatchId: null, // id partita in modifica
  editFantaId: null, // id voce fanta in modifica
  flashId: null,     // id riga da evidenziare dopo il salvataggio
  resultFilter: "pending", // filtro lista risultati: "pending" | "all"
};

// Evidenzia (e scorre verso) la riga appena aggiunta/modificata
function applyFlash(containerId) {
  if (!admin.flashId) return;
  const row = document.querySelector(`#${containerId} [data-id="${admin.flashId}"]`);
  if (row) {
    row.classList.add("flash");
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    admin.flashId = null;
  }
}

// ---------- Helper: stato "in salvataggio" sui pulsanti ----------
// Disabilita il pulsante e mostra un'etichetta di attesa mentre l'operazione è in corso.
// Evita doppi invii (P0.4).
async function withBusy(btn, busyLabel, fn) {
  if (btn.disabled) return; // già in corso
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = busyLabel;
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

// ---------- Login / logout ----------
document.getElementById("btnLogin").addEventListener("click", (e) => {
  const btn = e.currentTarget;
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
  withBusy(btn, "⏳ Accesso…", async () => {
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      admin.logged = true;
      showAdminPanel();
    } catch (err) {
      // distingue credenziali errate da problemi di connessione
      const net = err && (err.code === "auth/network-request-failed" || err.code === "auth/too-many-requests");
      errEl.textContent = net ? "⚠️ Problema di connessione, riprova" : "❌ Credenziali errate";
      errEl.hidden = false;
    }
  });
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  admin.logged = false;
  if (admin.photosUnsub) { admin.photosUnsub(); admin.photosUnsub = null; }
  hideAdminApp();
  document.getElementById("modalAdmin").hidden = true;
  if (!state.demo && auth) await auth.signOut(); // onAuthStateChanged farà login anonimo
});

// "Vedi sito": nasconde il pannello ma resta loggati (rientri col 🔐)
document.getElementById("btnViewSite").addEventListener("click", () => {
  hideAdminApp();
  location.hash = "#top";
});

function showAdminPanel() {
  document.getElementById("modalAdmin").hidden = true;
  document.getElementById("adminApp").hidden = false;
  document.body.style.overflow = "hidden";
  if (location.hash !== "#admin") location.hash = "#admin";
  subscribeAdminPhotos();
  renderAdmin();
}

function hideAdminApp() {
  document.getElementById("adminApp").hidden = true;
  document.body.style.overflow = "";
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

// ---------- Navigazione sezioni ----------
document.querySelectorAll(".aapp-navitem").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".aapp-navitem").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.querySelectorAll(".aapp-pane").forEach((p) => (p.hidden = true));
    document.getElementById("apane-" + btn.dataset.atab).hidden = false;
  });
});

// ---------- Persistenza ----------
async function dbAdd(coll, data) {
  if (state.demo) {
    data.id = "demo_" + Math.random().toString(36).slice(2, 8);
    state[coll].push(data);
    renderAll();
    return data.id;
  }
  const ref = await db.collection(coll).add(data);
  return ref.id;
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

document.getElementById("btnAddTeam").addEventListener("click", (e) => {
  const name = document.getElementById("tName").value.trim();
  if (!name) return toast("Inserisci il nome della squadra");
  const team = {
    name,
    tournament: document.getElementById("tTourney").value,
    emoji: document.getElementById("tEmoji").value.trim() || "🏳️",
    players: parsePlayers(document.getElementById("tPlayers").value),
  };
  const editing = admin.editTeamId;
  withBusy(e.currentTarget, "⏳ Salvataggio…", async () => {
    try {
      if (editing) {
        await dbUpdate("teams", editing, team);
        admin.flashId = editing;
        toast("✅ Squadra aggiornata");
      } else {
        admin.flashId = await dbAdd("teams", team);
        toast("✅ Squadra salvata");
      }
      resetTeamForm();
    } catch (err) { console.error(err); toast("❌ Errore nel salvataggio"); }
  });
});

function startEditTeam(id) {
  const t = teamById(id);
  if (!t) return;
  admin.editTeamId = id;
  document.getElementById("tName").value = t.name || "";
  document.getElementById("tTourney").value = t.tournament || "calcetto";
  document.getElementById("tEmoji").value = t.emoji && t.emoji !== "🏳️" ? t.emoji : "";
  document.getElementById("tPlayers").value =
    normPlayers(t).map((p) => p.name + (p.gender === "f" ? " (F)" : "")).join("\n");
  renderPlayersPreview();
  document.getElementById("teamFormTitle").textContent = "✏️ Modifica squadra";
  document.getElementById("btnAddTeam").textContent = "💾 Salva modifiche";
  document.getElementById("btnCancelTeam").hidden = false;
  document.getElementById("tName").scrollIntoView({ block: "nearest", behavior: "smooth" });
  document.getElementById("tName").focus();
}

function resetTeamForm() {
  admin.editTeamId = null;
  document.getElementById("tName").value = "";
  document.getElementById("tEmoji").value = "";
  document.getElementById("tPlayers").value = "";
  document.getElementById("tTourney").value = "calcetto";
  renderPlayersPreview();
  document.getElementById("teamFormTitle").textContent = "➕ Nuova squadra";
  document.getElementById("btnAddTeam").textContent = "✅ Salva squadra";
  document.getElementById("btnCancelTeam").hidden = true;
}

document.getElementById("btnCancelTeam").addEventListener("click", resetTeamForm);

// ---------- Partite ----------
document.getElementById("btnAddMatch").addEventListener("click", (e) => {
  const teamA = document.getElementById("mTeamA").value;
  const teamB = document.getElementById("mTeamB").value;
  if (!teamA || !teamB) return toast("Seleziona le due squadre");
  if (teamA === teamB) return toast("Le squadre devono essere diverse");
  const base = {
    tournament: document.getElementById("mTourney").value,
    teamA, teamB,
    day: document.getElementById("mDay").value,
    time: document.getElementById("mTime").value || "17:00",
    label: document.getElementById("mLabel").value.trim(),
  };
  const editing = admin.editMatchId;
  withBusy(e.currentTarget, "⏳ Salvataggio…", async () => {
    try {
      if (editing) {
        // non tocca risultato/marcatori già inseriti
        await dbUpdate("matches", editing, base);
        admin.flashId = editing;
        toast("✅ Partita aggiornata");
      } else {
        admin.flashId = await dbAdd("matches", { ...base, played: false, scoreA: 0, scoreB: 0, scorers: [] });
        toast("✅ Partita aggiunta");
      }
      resetMatchForm();
    } catch (err) { console.error(err); toast("❌ Errore nel salvataggio"); }
  });
});

function startEditMatch(id) {
  const m = state.matches.find((x) => x.id === id);
  if (!m) return;
  admin.editMatchId = id;
  document.getElementById("mTourney").value = m.tournament || "calcetto";
  fillMatchTeamSelects(); // ricostruisce le opzioni in base al torneo
  document.getElementById("mTeamA").value = m.teamA || "";
  document.getElementById("mTeamB").value = m.teamB || "";
  document.getElementById("mDay").value = m.day || "GIO 30/07";
  document.getElementById("mTime").value = m.time || "17:00";
  document.getElementById("mLabel").value = m.label || "";
  document.getElementById("matchFormTitle").textContent = "✏️ Modifica partita";
  document.getElementById("btnAddMatch").textContent = "💾 Salva modifiche";
  document.getElementById("btnCancelMatch").hidden = false;
  document.getElementById("mTourney").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function resetMatchForm() {
  admin.editMatchId = null;
  document.getElementById("mLabel").value = "";
  document.getElementById("mTeamA").value = "";
  document.getElementById("mTeamB").value = "";
  document.getElementById("matchFormTitle").textContent = "➕ Nuova partita";
  document.getElementById("btnAddMatch").textContent = "✅ Aggiungi partita";
  document.getElementById("btnCancelMatch").hidden = true;
}

document.getElementById("btnCancelMatch").addEventListener("click", resetMatchForm);
document.getElementById("mTourney").addEventListener("change", () => {
  // cambiare torneo azzera la selezione squadre (le opzioni cambiano)
  fillMatchTeamSelects();
});

// ---------- Anteprima giocatori (P1.1) ----------
function renderPlayersPreview() {
  const box = document.getElementById("tPlayersPreview");
  const players = parsePlayers(document.getElementById("tPlayers").value);
  if (!players.length) { box.innerHTML = ""; return; }
  box.innerHTML = players.map((p, i) => `
    <span class="player-chip ${p.gender === "f" ? "f" : ""}">
      ${esc(p.name)}
      <button type="button" class="gtoggle" title="Cambia M/F" aria-label="Cambia genere di ${esc(p.name)}" onclick="togglePlayerGender(${i})">${p.gender === "f" ? "♀" : "♂"}</button>
    </span>`).join("");
}
// Inverte il marcatore (F) sulla riga i-esima non vuota della textarea
function togglePlayerGender(i) {
  const ta = document.getElementById("tPlayers");
  const lines = ta.value.split("\n");
  let count = -1;
  for (let r = 0; r < lines.length; r++) {
    if (!lines[r].trim()) continue;
    if (++count === i) {
      const isF = /\((f|F)\)\s*$/.test(lines[r]);
      const base = lines[r].replace(/\s*\((f|F)\)\s*$/, "").replace(/\s+$/, "");
      lines[r] = isF ? base : base + " (F)";
      break;
    }
  }
  ta.value = lines.join("\n");
  renderPlayersPreview();
}
document.getElementById("tPlayers").addEventListener("input", renderPlayersPreview);

// ---------- Risultati (P1.2: lista invece del menu a tendina) ----------
function renderResultList() {
  const el = document.getElementById("resultMatchList");
  let ms = [...state.matches].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  if (admin.resultFilter === "pending") ms = ms.filter((m) => !m.played);
  if (!ms.length) {
    el.innerHTML = `<p class="muted">${admin.resultFilter === "pending" ? "Nessuna partita da giocare. 🎉" : "Nessuna partita inserita."}</p>`;
    return;
  }
  const byDay = {};
  ms.forEach((m) => (byDay[m.day] = byDay[m.day] || []).push(m));
  el.innerHTML = Object.keys(byDay).sort().map((day) => `
    <div class="result-daygroup">
      <h4>📆 ${esc(day)}</h4>
      ${byDay[day].map((m) => `
        <button type="button" class="result-row ${m.id === admin.selMatchId ? "active" : ""}" onclick="selectResultMatch('${m.id}')">
          <span class="r-when">${esc(m.time)}</span>
          <span class="r-teams">${esc(teamName(m.teamA))} vs ${esc(teamName(m.teamB))}</span>
          <span class="result-badge ${m.played ? "done" : "pending"}">${m.played ? `${m.scoreA}–${m.scoreB}` : "da giocare"}</span>
        </button>`).join("")}
    </div>`).join("");
}
function selectResultMatch(id) {
  admin.selMatchId = id;
  loadResultEditor();
  renderResultList();
}
document.querySelectorAll(".rfilter").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".rfilter").forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
  b.classList.add("active"); b.setAttribute("aria-pressed", "true");
  admin.resultFilter = b.dataset.rfilter;
  renderResultList();
}));

document.getElementById("rScorerTeam").addEventListener("change", fillScorerPlayers);

document.getElementById("btnAddScorer").addEventListener("click", () => {
  const player = document.getElementById("rScorerPlayer").value;
  const goals = Number(document.getElementById("rScorerGoals").value) || 1;
  const team = document.getElementById("rScorerTeam").value;
  if (!player) return toast("Seleziona il marcatore");
  admin.scorers.push({ team, player, goals });
  renderScorerList();
});

document.getElementById("btnSaveResult").addEventListener("click", (e) => {
  if (!admin.selMatchId) return;
  const data = {
    scoreA: Number(document.getElementById("rScoreA").value) || 0,
    scoreB: Number(document.getElementById("rScoreB").value) || 0,
    played: document.getElementById("rPlayed").checked,
    scorers: admin.scorers,
  };
  withBusy(e.currentTarget, "⏳ Salvataggio…", async () => {
    try {
      await dbUpdate("matches", admin.selMatchId, data);
      toast("✅ Risultato salvato");
    } catch (err) { console.error(err); toast("❌ Errore nel salvataggio"); }
  });
});

// ---------- Fanta ----------
document.getElementById("fReason").addEventListener("change", () => {
  const sel = document.getElementById("fReason");
  document.getElementById("fReasonCustomField").hidden = sel.value !== "_altro";
  // precompila i punti se il motivo li contiene, es. "(+50)"
  const m = sel.value.match(/\(\+?(-?\d+)\)/);
  if (m) document.getElementById("fPoints").value = m[1];
});

document.getElementById("btnAddFanta").addEventListener("click", (e) => {
  const teamId = document.getElementById("fTeam").value;
  const selReason = document.getElementById("fReason").value;
  const reason = selReason === "_altro"
    ? document.getElementById("fReasonCustom").value.trim()
    : selReason.replace(/\s*\(\+?-?\d+\)\s*$/, "");
  const points = Number(document.getElementById("fPoints").value);
  if (!teamId) return toast("Seleziona la squadra");
  if (!reason) return toast("Indica il motivo");
  if (!points) return toast("Indica i punti");
  const editing = admin.editFantaId;
  withBusy(e.currentTarget, "⏳ Salvataggio…", async () => {
    try {
      if (editing) {
        await dbUpdate("fanta", editing, { teamId, reason, points });
        admin.flashId = editing;
        toast("✅ Voce fanta aggiornata");
      } else {
        admin.flashId = await dbAdd("fanta", { teamId, reason, points, ts: Date.now() });
        toast("✅ Punti fanta assegnati");
      }
      resetFantaForm();
    } catch (err) { console.error(err); toast("❌ Errore nel salvataggio"); }
  });
});

function startEditFanta(id) {
  const f = state.fanta.find((x) => x.id === id);
  if (!f) return;
  admin.editFantaId = id;
  document.getElementById("fTeam").value = f.teamId || "";
  // usa il motivo libero per riflettere fedelmente il testo salvato
  document.getElementById("fReason").value = "_altro";
  document.getElementById("fReasonCustomField").hidden = false;
  document.getElementById("fReasonCustom").value = f.reason || "";
  document.getElementById("fPoints").value = f.points;
  document.getElementById("fantaFormTitle").textContent = "✏️ Modifica voce fanta";
  document.getElementById("btnAddFanta").textContent = "💾 Salva modifiche";
  document.getElementById("btnCancelFanta").hidden = false;
  document.getElementById("fTeam").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function resetFantaForm() {
  admin.editFantaId = null;
  document.getElementById("fPoints").value = "";
  document.getElementById("fReasonCustom").value = "";
  document.getElementById("fReason").value = "";
  document.getElementById("fReasonCustomField").hidden = true;
  document.getElementById("fantaFormTitle").textContent = "➕ Assegna punti Fanta";
  document.getElementById("btnAddFanta").textContent = "✅ Assegna punti";
  document.getElementById("btnCancelFanta").hidden = true;
}

document.getElementById("btnCancelFanta").addEventListener("click", resetFantaForm);

async function adminDeleteFanta(id) {
  const f = state.fanta.find((x) => x.id === id);
  const pts = f ? (f.points > 0 ? "+" : "") + f.points : "";
  const okc = await confirmDialog({
    title: "Rimuovi voce fanta",
    bodyHtml: `Rimuovere <b>${esc(pts)}</b> da <b>${esc(teamName(f && f.teamId))}</b>${f ? ` (${esc(f.reason)})` : ""}?`,
    okLabel: "Rimuovi",
  });
  if (!okc) return;
  const backup = f ? { ...f } : null;
  try {
    await dbDelete("fanta", id);
    if (backup) {
      const { id: _drop, ...data } = backup;
      toastUndo("🗑️ Voce rimossa", async () => {
        try { admin.flashId = await dbAdd("fanta", data); toast("↩︎ Voce ripristinata"); }
        catch (e) { console.error(e); toast("❌ Ripristino fallito"); }
      });
    } else toast("🗑️ Voce rimossa");
  } catch (e) { console.error(e); toast("❌ Errore"); }
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
  const p = admin.photos.find((x) => x.id === id);
  const okc = await confirmDialog({
    title: "Elimina contenuto",
    bodyHtml: `Eliminare questo contenuto di <b>${esc((p && p.team) || "?")}</b>?`,
    okLabel: "Elimina",
  });
  if (!okc) return;
  const backup = p ? { ...p } : null;
  const doDelete = async () => {
    if (state.demo) {
      admin.photos = admin.photos.filter((x) => x.id !== id);
      state.photos = state.photos.filter((x) => x.id !== id);
      renderAdminPhotos(); renderGallery();
    } else {
      await db.collection("photos").doc(id).delete();
    }
  };
  const doRestore = async () => {
    const { id: _drop, ...data } = backup;
    if (state.demo) {
      data.id = "demo_" + Math.random().toString(36).slice(2, 8);
      admin.photos.push(data);
      if (data.approved) state.photos.push(data);
      renderAdminPhotos(); renderGallery();
    } else {
      await db.collection("photos").add(data);
    }
  };
  try {
    await doDelete();
    if (backup) {
      toastUndo("🗑️ Contenuto eliminato", async () => {
        try { await doRestore(); toast("↩︎ Contenuto ripristinato"); }
        catch (e) { console.error(e); toast("❌ Ripristino fallito"); }
      });
    } else toast("🗑️ Contenuto eliminato");
  } catch (e) { console.error(e); toast("❌ Errore"); }
}

// ---------- Cancellazione squadra a cascata ----------
async function adminDeleteTeam(id) {
  const t = teamById(id);
  const nVotes = state.votes.filter((v) => v.teamId === id).length;
  const nFanta = state.fanta.filter((f) => f.teamId === id).length;
  const plur = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const extra = (nVotes || nFanta)
    ? `<br>Verranno rimossi anche <b>${plur(nVotes, "voto MVP", "voti MVP")}</b> e <b>${plur(nFanta, "voce fanta", "voci fanta")}</b>.`
    : "";
  const okc = await confirmDialog({
    title: "Elimina squadra",
    bodyHtml: `Eliminare la squadra <b>${esc(t ? t.name : "?")}</b>?${extra}<br>L'operazione non è reversibile.`,
    okLabel: "Elimina",
  });
  if (!okc) return;
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
  const m = state.matches.find((x) => x.id === id);
  const okc = await confirmDialog({
    title: "Elimina partita",
    bodyHtml: `Eliminare la partita <b>${esc(teamName(m && m.teamA))} vs ${esc(teamName(m && m.teamB))}</b>?`
      + (m && m.played ? "<br>Il risultato inserito andrà perso." : ""),
    okLabel: "Elimina",
  });
  if (!okc) return;
  const backup = m ? { ...m } : null;
  try {
    await dbDelete("matches", id);
    if (backup) {
      const { id: _drop, ...data } = backup;
      toastUndo("🗑️ Partita eliminata", async () => {
        try { admin.flashId = await dbAdd("matches", data); toast("↩︎ Partita ripristinata"); }
        catch (e) { console.error(e); toast("❌ Ripristino fallito"); }
      });
    } else toast("🗑️ Partita eliminata");
  } catch (e) { console.error(e); toast("❌ Errore"); }
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
  renderResultList();
}

function renderAdminTeams() {
  const el = document.getElementById("adminTeamsList");
  const icon = { calcetto: "⚽", volley: "🏐", entrambi: "⚽🏐" };
  el.innerHTML = [...state.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `
      <div class="admin-item" data-id="${esc(t.id)}">
        <span>${esc(t.emoji || "🏳️")}</span>
        <span class="grow"><b>${esc(t.name)}</b> ${icon[t.tournament] || ""} · ${normPlayers(t).length} giocatori</span>
        <button title="Modifica" aria-label="Modifica ${esc(t.name)}" onclick="startEditTeam('${t.id}')">✏️</button>
        <button title="Elimina" aria-label="Elimina ${esc(t.name)}" onclick="adminDeleteTeam('${t.id}')">🗑️</button>
      </div>`).join("") || '<p class="muted">Nessuna squadra. Crea la prima qui a fianco.</p>';
  applyFlash("adminTeamsList");
}

function renderAdminMatches() {
  const el = document.getElementById("adminMatchesList");
  const ms = [...state.matches].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  el.innerHTML = ms.map((m) => `
    <div class="admin-item" data-id="${esc(m.id)}">
      <span>${m.tournament === "calcetto" ? "⚽" : "🏐"}</span>
      <span class="grow">${esc(m.day)} ${esc(m.time)} · ${esc(teamName(m.teamA))} vs ${esc(teamName(m.teamB))}
        ${m.played ? `<b>(${m.scoreA}–${m.scoreB})</b>` : ""}</span>
      <button title="Modifica" aria-label="Modifica partita" onclick="startEditMatch('${m.id}')">✏️</button>
      <button title="Elimina" aria-label="Elimina partita" onclick="adminDeleteMatch('${m.id}')">🗑️</button>
    </div>`).join("") || '<p class="muted">Nessuna partita. Aggiungine una qui a fianco.</p>';
  applyFlash("adminMatchesList");
}

function renderAdminFanta() {
  const el = document.getElementById("adminFantaList");
  const entries = [...state.fanta].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  el.innerHTML = entries.map((f) => `
    <div class="admin-item" data-id="${esc(f.id)}">
      <span class="fanta-pts ${f.points < 0 ? "neg" : ""}">${f.points > 0 ? "+" : ""}${f.points}</span>
      <span class="grow"><b>${esc(teamName(f.teamId))}</b> · ${esc(f.reason)}</span>
      <button title="Modifica" aria-label="Modifica voce fanta" onclick="startEditFanta('${f.id}')">✏️</button>
      <button title="Rimuovi" aria-label="Rimuovi voce fanta" onclick="adminDeleteFanta('${f.id}')">🗑️</button>
    </div>`).join("") || '<p class="muted">Nessun punto assegnato.</p>';
  applyFlash("adminFantaList");
}

function renderAdminPhotos() {
  if (!admin.logged) return;
  const pend = document.getElementById("adminPhotosPending");
  const appr = document.getElementById("adminPhotosApproved");
  const card = (p, actions) => `
    <div class="admin-photo" data-id="${esc(p.id)}">
      <div class="thumb" title="Ingrandisci" onclick="adminEnlargePhoto('${p.id}')">
        <img src="${esc(thumbUrl(p))}" alt="Contenuto di ${esc(p.team || "?")}" loading="lazy">
        ${p.type === "video" ? '<span class="play-badge">▶</span>' : ""}
      </div>
      <div class="ap-meta">
        <span class="grow">${esc(p.team || "?")} ${p.type === "video" ? "🎬" : "📷"}</span>
        <span class="ap-actions">${actions}</span>
      </div>
    </div>`;
  const pending = admin.photos.filter((p) => !p.approved);
  const approved = admin.photos.filter((p) => p.approved);
  document.getElementById("btnApproveAll").hidden = pending.length === 0;
  pend.innerHTML = pending.map((p) => card(p,
    `<button title="Approva" aria-label="Approva contenuto" onclick="adminApprovePhoto('${p.id}')">✅</button>
     <button title="Elimina" aria-label="Elimina contenuto" onclick="adminDeletePhoto('${p.id}')">🗑️</button>`)).join("")
    || '<p class="muted">Nessun contenuto in attesa.</p>';
  appr.innerHTML = approved.map((p) => card(p,
    `<button title="Elimina" aria-label="Elimina contenuto" onclick="adminDeletePhoto('${p.id}')">🗑️</button>`)).join("")
    || '<p class="muted">Nessun contenuto pubblicato.</p>';
  applyFlash("adminPhotosApproved");
}

function adminEnlargePhoto(id) {
  const p = admin.photos.find((x) => x.id === id);
  if (p) openLightbox(p);
}

async function adminApproveAll() {
  const pending = admin.photos.filter((p) => !p.approved);
  if (!pending.length) return;
  await withBusy(document.getElementById("btnApproveAll"), "⏳ Approvazione…", async () => {
    try {
      for (const p of pending) await adminUpdatePhoto(p.id, { approved: true });
      toast(`✅ ${pending.length} contenuti pubblicati`);
    } catch (e) { console.error(e); toast("❌ Errore nell'approvazione"); }
  });
}
document.getElementById("btnApproveAll").addEventListener("click", adminApproveAll);

function fillMatchTeamSelects() {
  const tourney = document.getElementById("mTourney").value;
  const selA = document.getElementById("mTeamA");
  const selB = document.getElementById("mTeamB");
  const prevA = selA.value, prevB = selB.value;
  const list = state.teams
    .filter((t) => t.tournament === tourney || t.tournament === "entrambi")
    .sort((a, b) => a.name.localeCompare(b.name));
  const opts = list
    .map((t) => `<option value="${esc(t.id)}">${esc(t.emoji || "")} ${esc(t.name)}</option>`)
    .join("");
  selA.innerHTML = '<option value="">Squadra 1…</option>' + opts;
  selB.innerHTML = '<option value="">Squadra 2…</option>' + opts;
  // preserva la selezione (non azzerare una modifica in corso su un aggiornamento dati)
  if (list.some((t) => t.id === prevA)) selA.value = prevA;
  if (list.some((t) => t.id === prevB)) selB.value = prevB;
}

function fillFantaTeamSelect() {
  const sel = document.getElementById("fTeam");
  const prev = sel.value;
  sel.innerHTML = '<option value="">Squadra…</option>' + [...state.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `<option value="${esc(t.id)}">${esc(t.emoji || "")} ${esc(t.name)}</option>`).join("");
  if (prev && state.teams.some((t) => t.id === prev)) sel.value = prev;
}

function loadResultEditor() {
  const box = document.getElementById("rEditor");
  const empty = document.getElementById("rEditorEmpty");
  const m = state.matches.find((x) => x.id === admin.selMatchId);
  if (!m) { box.hidden = true; empty.hidden = false; return; }
  empty.hidden = true;
  box.hidden = false;
  document.getElementById("rEditorTitle").textContent = `${teamName(m.teamA)} vs ${teamName(m.teamB)}`;
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
