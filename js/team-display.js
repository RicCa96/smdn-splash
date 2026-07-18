/* ===== Splash SMDN – rappresentazione squadre (colore) ===== */

// Colore neutro usato quando una squadra non ha (ancora) un colore valido.
const DEFAULT_TEAM_COLOR = "#94a3b8";

// Ritorna il colore della squadra come esadecimale a 6 cifre.
// Qualsiasi valore non valido (mancante, formato errato, tentativi di
// injection nello style inline) ricade sul colore di default.
function teamColor(team) {
  const c = team && team.color;
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_TEAM_COLOR;
}

// Pallino colorato da mostrare accanto al nome squadra.
function teamDot(team) {
  return `<span class="team-dot" style="background:${teamColor(team)}"></span>`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_TEAM_COLOR, teamColor, teamDot };
}
