/* ===== Splash SMDN – logica pubblica ===== */

// ---------- Stato globale ----------
const state = {
  teams: [],
  matches: [],
  votes: [],
  tourney: "calcetto", // torneo selezionato
  demo: false,         // true se Firebase non è configurato
};

let db = null;   // Firestore
let auth = null; // Firebase Auth

// ---------- Inizializzazione ----------
(function init() {
  state.demo = !FIREBASE_CONFIG || FIREBASE_CONFIG.projectId === "REPLACE_ME";

  setupStaticLinks();
  setupTabs();
  setupModals();
  spawnBubbles();

  if (state.demo) {
    console.warn("MODALITÀ DEMO: Firebase non configurato, uso dati di esempio (vedi README.md)");
    state.teams = [...SAMPLE_DATA.teams];
    state.matches = [...SAMPLE_DATA.matches];
    state.votes = [...SAMPLE_DATA.votes];
    renderAll();
  } else {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    auth = firebase.auth();
    subscribeData();
  }
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
    state.votes = snap.docs.map((d) => d.data());
    renderMvp();
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

// ---------- Modali ----------
function setupModals() {
  document.getElementById("btnRegolamento").addEventListener("click", (e) => {
    e.preventDefault();
    openModal("modalRegolamento");
  });
  document.getElementById("btnAdmin").addEventListener("click", () => openModal("modalAdmin"));
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.hasAttribute("data-close")) m.hidden = true;
    });
  });
}
function openModal(id) { document.getElementById(id).hidden = false; }

// ---------- Utility ----------
function teamById(id) { return state.teams.find((t) => t.id === id); }
function teamName(id) { const t = teamById(id); return t ? `${t.emoji || "🏳️"} ${t.name}` : "?"; }
function inTourney(t) { return t.tournament === state.tourney || t.tournament === "entrambi"; }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.hidden = true), 3000);
}

// ---------- Render ----------
function renderAll() {
  renderNextMatches();
  renderTeams();
  renderMatches();
  renderStandings();
  renderScorers();
  renderMvp();
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
      <span>${esc(teamName(m.teamA))} <b>vs</b> ${esc(teamName(m.teamB))}</span>
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
    <div class="team-card">
      <h3><span class="emoji">${esc(t.emoji || "🏳️")}</span> ${esc(t.name)}
        ${t.tournament === "entrambi" ? '<span class="team-badge">⚽+🏐</span>' : ""}</h3>
      <ul>${(t.players || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
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
          <span class="team a">${esc(teamName(m.teamA))}</span>
          <span class="score ${m.played ? "" : "pending"}">${m.played ? `${m.scoreA} – ${m.scoreB}` : "vs"}</span>
          <span class="team b">${esc(teamName(m.teamB))}</span>
          ${m.label ? `<span class="match-label">${esc(m.label)}</span>` : ""}
          ${m.played && scorersTxt ? `<span class="match-scorers">⚽ ${scorersTxt}</span>` : ""}
        </div>`;
      }).join("")}
    </div>`).join("");
}

function renderStandings() {
  const el = document.getElementById("standings");
  const played = currentMatches().filter((m) => m.played);
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
        <tr><td>${i + 1}</td><td>${esc(teamName(r.id))}</td><td><b>${r.pts}</b></td>
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
  state.matches.filter((m) => m.tournament === "calcetto" && m.played).forEach((m) => {
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
        <tr><td>${i + 1}</td><td>${esc(r.player)}</td><td>${esc(teamName(r.teamId))}</td><td><b>${r.goals}</b></td></tr>`).join("")}
    </table>`;
}

// ---------- MVP ----------
function votedKey() { return `smdn_mvp_voted_${state.tourney}`; }

function renderMvp() {
  const area = document.getElementById("mvpArea");
  const already = localStorage.getItem(votedKey());
  if (already) {
    area.innerHTML = `<div class="mvp-voted">✅ Hai già votato per questo torneo: <b>${esc(already)}</b>. Grazie!</div>`;
  } else {
    const teams = state.teams.filter(inTourney).sort((a, b) => a.name.localeCompare(b.name));
    if (!teams.length) {
      area.innerHTML = '<p class="muted">La votazione si aprirà quando saranno pubblicate le squadre.</p>';
    } else {
      area.innerHTML = `
        <div class="mvp-form">
          <select id="mvpTeam"><option value="">Squadra…</option>
            ${teams.map((t) => `<option value="${esc(t.id)}">${esc(t.emoji || "")} ${esc(t.name)}</option>`).join("")}
          </select>
          <select id="mvpPlayer" disabled><option value="">Giocatore…</option></select>
          <button id="btnVote" class="btn btn-primary" disabled>⭐ Vota</button>
        </div>`;
      const selTeam = document.getElementById("mvpTeam");
      const selPlayer = document.getElementById("mvpPlayer");
      const btn = document.getElementById("btnVote");
      selTeam.addEventListener("change", () => {
        const t = teamById(selTeam.value);
        selPlayer.innerHTML = '<option value="">Giocatore…</option>' +
          ((t && t.players) || []).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
        selPlayer.disabled = !t;
        btn.disabled = true;
      });
      selPlayer.addEventListener("change", () => (btn.disabled = !selPlayer.value));
      btn.addEventListener("click", () => submitVote(selTeam.value, selPlayer.value));
    }
  }
  renderMvpRanking();
}

async function submitVote(teamId, player) {
  if (!teamId || !player) return;
  const t = teamById(teamId);
  const vote = {
    player,
    teamName: t ? t.name : "?",
    tournament: state.tourney,
    ts: Date.now(),
  };
  if (state.demo) {
    state.votes.push(vote);
  } else {
    try {
      await db.collection("votes").add(vote);
    } catch (e) {
      console.error(e);
      toast("❌ Errore nell'invio del voto, riprova");
      return;
    }
  }
  localStorage.setItem(votedKey(), `${player} (${vote.teamName})`);
  toast("⭐ Grazie per il tuo voto!");
  renderMvp();
}

function renderMvpRanking() {
  const el = document.getElementById("mvpRanking");
  const tally = {};
  state.votes.filter((v) => v.tournament === state.tourney).forEach((v) => {
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

// ---------- Bollicine decorative ----------
function spawnBubbles() {
  const box = document.querySelector(".hero-bubbles");
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
