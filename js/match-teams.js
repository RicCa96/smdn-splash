/* ===== Splash SMDN – squadre di una partita (reali o custom) ===== */

// Una partita memorizza ogni lato in due campi:
//  - `teamA`/`teamB`: id documento della squadra reale (stringa vuota se custom);
//  - `teamAName`/`teamBName`: nome libero usato per i lati "custom"
//    (es. "Vincente Girone A"), quando la squadra non è ancora nota.

// Mappa un testo digitato/selezionato al lato da salvare.
// - input vuoto o solo spazi -> lato non definito: { teamId:"", teamName:"" };
// - se combacia (case-insensitive, senza spazi ai lati) col nome di una
//   squadra reale -> { teamId: found.id, teamName:"" } (in caso di nomi
//   duplicati vince la prima trovata);
// - altrimenti lato custom -> { teamId:"", teamName: <input ripulito> }.
function resolveMatchSide(input, teams) {
  const name = (input || "").trim();
  if (!name) return { teamId: "", teamName: "" };
  const list = Array.isArray(teams) ? teams : [];
  const target = name.toLowerCase();
  const found = list.find(
    (t) => t && typeof t.name === "string" && t.name.trim().toLowerCase() === target
  );
  if (found) return { teamId: found.id, teamName: "" };
  return { teamId: "", teamName: name };
}

// Nome da mostrare per un lato della partita. `side` è "A" oppure "B".
// Se l'id punta a una squadra reale ne ritorna il nome; altrimenti usa il
// nome custom del lato; se manca anche quello ritorna "?".
function matchSideName(m, side, teams) {
  const match = m || {};
  const id = match["team" + side];
  const list = Array.isArray(teams) ? teams : [];
  const found = id ? list.find((t) => t && t.id === id) : undefined;
  if (found) return found.name;
  return match["team" + side + "Name"] || "?";
}

// Vero solo se il lato indicato punta all'id di una squadra reale esistente.
function matchSideHasRealTeam(m, side, teams) {
  const match = m || {};
  const id = match["team" + side];
  if (!id) return false;
  const list = Array.isArray(teams) ? teams : [];
  return list.some((t) => t && t.id === id);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { resolveMatchSide, matchSideName, matchSideHasRealTeam };
}
