// ===== Dati di esempio, usati solo in MODALITÀ DEMO (Firebase non configurato) =====
const SAMPLE_DATA = {
  teams: [
    { id: "t1", name: "Gli Scivolosi", tournament: "calcetto", emoji: "🛝", players: [
      { name: "Marco B.", gender: "m" }, { name: "Luca R.", gender: "m" }, { name: "Giulia T.", gender: "f" },
      { name: "Andrea P.", gender: "m" }, { name: "Sara M.", gender: "f" }, { name: "Paolo V.", gender: "m" }] },
    { id: "t2", name: "Saponetta FC", tournament: "calcetto", emoji: "🧼", players: [
      { name: "Davide C.", gender: "m" }, { name: "Elena F.", gender: "f" }, { name: "Matteo G.", gender: "m" },
      { name: "Chiara L.", gender: "f" }, { name: "Simone D.", gender: "m" }] },
    { id: "t3", name: "I Tuffatori", tournament: "volley", emoji: "🤿", players: [
      { name: "Anna V.", gender: "f" }, { name: "Francesca R.", gender: "f" }, { name: "Luca M.", gender: "m" },
      { name: "Giorgio S.", gender: "m" }, { name: "Elisa B.", gender: "f" }, { name: "Marco T.", gender: "m" }] },
    { id: "t4", name: "Onda Anomala", tournament: "entrambi", emoji: "🌊", players: [
      { name: "Pietro Z.", gender: "m" }, { name: "Martina C.", gender: "f" }, { name: "Alessia N.", gender: "f" },
      { name: "Fabio Q.", gender: "m" }, { name: "Laura D.", gender: "f" }, { name: "Nicola E.", gender: "m" }] },
  ],
  matches: [
    { id: "m1", tournament: "calcetto", day: "GIO 30/07", time: "17:30", teamA: "t1", teamB: "t2", label: "Gironi", played: true, scoreA: 3, scoreB: 2, scorers: [ { team: "A", player: "Marco B.", goals: 2 }, { team: "A", player: "Giulia T.", goals: 1 }, { team: "B", player: "Davide C.", goals: 2 } ] },
    { id: "m2", tournament: "calcetto", day: "GIO 30/07", time: "18:15", teamA: "t2", teamB: "t4", label: "Gironi", played: false, scoreA: 0, scoreB: 0, scorers: [] },
    { id: "m3", tournament: "volley", day: "SAB 01/08", time: "15:30", teamA: "t3", teamB: "t4", label: "Gironi", played: false, scoreA: 0, scoreB: 0, scorers: [] },
  ],
  votes: [
    { id: "v1_calcetto_m", player: "Marco B.", teamId: "t1", teamName: "Gli Scivolosi", tournament: "calcetto", category: "m" },
    { id: "v2_calcetto_m", player: "Marco B.", teamId: "t1", teamName: "Gli Scivolosi", tournament: "calcetto", category: "m" },
    { id: "v3_calcetto_f", player: "Giulia T.", teamId: "t1", teamName: "Gli Scivolosi", tournament: "calcetto", category: "f" },
    { id: "v4_volley_f", player: "Anna V.", teamId: "t3", teamName: "I Tuffatori", tournament: "volley", category: "f" },
  ],
  fanta: [
    { id: "f1", teamId: "t4", reason: "Partecipa a entrambi i tornei", points: 50, ts: 1 },
    { id: "f2", teamId: "t1", reason: "Story Instagram foto di squadra", points: 80, ts: 2 },
    { id: "f3", teamId: "t2", reason: "Iscrizione entro 7 luglio", points: 50, ts: 3 },
  ],
  photos: [
    { id: "p1", url: "https://picsum.photos/seed/splash1/800/600", type: "image", team: "Gli Scivolosi", approved: true, ts: 1 },
    { id: "p2", url: "https://picsum.photos/seed/splash2/800/600", type: "image", team: "Onda Anomala", approved: true, ts: 2 },
    { id: "p3", url: "https://picsum.photos/seed/splash3/800/600", type: "image", team: "I Tuffatori", approved: false, ts: 3 },
  ],
};
