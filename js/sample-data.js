// ===== Dati di esempio, usati solo in MODALITÀ DEMO (Firebase non configurato) =====
const SAMPLE_DATA = {
  teams: [
    { id: "t1", name: "Gli Scivolosi", tournament: "calcetto", emoji: "🛝", players: ["Marco B.", "Luca R.", "Giulia T.", "Andrea P.", "Sara M.", "Paolo V."] },
    { id: "t2", name: "Saponetta FC", tournament: "calcetto", emoji: "🧼", players: ["Davide C.", "Elena F.", "Matteo G.", "Chiara L.", "Simone D."] },
    { id: "t3", name: "I Tuffatori", tournament: "volley", emoji: "🤿", players: ["Anna V.", "Francesca R.", "Luca M.", "Giorgio S.", "Elisa B.", "Marco T."] },
    { id: "t4", name: "Onda Anomala", tournament: "entrambi", emoji: "🌊", players: ["Pietro Z.", "Martina C.", "Alessia N.", "Fabio Q.", "Laura D.", "Nicola E."] },
  ],
  matches: [
    { id: "m1", tournament: "calcetto", day: "GIO 30/07", time: "17:30", teamA: "t1", teamB: "t2", label: "Gironi", played: true, scoreA: 3, scoreB: 2, scorers: [ { team: "A", player: "Marco B.", goals: 2 }, { team: "A", player: "Giulia T.", goals: 1 }, { team: "B", player: "Davide C.", goals: 2 } ] },
    { id: "m2", tournament: "calcetto", day: "GIO 30/07", time: "18:15", teamA: "t2", teamB: "t4", label: "Gironi", played: false, scoreA: 0, scoreB: 0, scorers: [] },
    { id: "m3", tournament: "volley", day: "SAB 01/08", time: "15:30", teamA: "t3", teamB: "t4", label: "Gironi", played: false, scoreA: 0, scoreB: 0, scorers: [] },
  ],
  votes: [
    { player: "Marco B.", teamName: "Gli Scivolosi", tournament: "calcetto" },
    { player: "Marco B.", teamName: "Gli Scivolosi", tournament: "calcetto" },
    { player: "Anna V.", teamName: "I Tuffatori", tournament: "volley" },
  ],
};
