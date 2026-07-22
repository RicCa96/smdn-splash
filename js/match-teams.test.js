const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveMatchSide, matchSideName, matchSideHasRealTeam } = require("./match-teams.js");

const TEAMS = [
  { id: "t1", name: "Real Madonna", tournament: "calcetto", color: "#3366cc", players: [] },
  { id: "t2", name: "Volley Neve", tournament: "splash", color: "#cc3366", players: [] },
];

// ---- resolveMatchSide -------------------------------------------------------

test("resolveMatchSide: empty input maps to both fields empty", () => {
  assert.deepEqual(resolveMatchSide("", TEAMS), { teamId: "", teamName: "" });
});

test("resolveMatchSide: whitespace-only input maps to both fields empty", () => {
  assert.deepEqual(resolveMatchSide("   ", TEAMS), { teamId: "", teamName: "" });
});

test("resolveMatchSide: exact name match sets teamId and empties teamName", () => {
  assert.deepEqual(resolveMatchSide("Real Madonna", TEAMS), { teamId: "t1", teamName: "" });
});

test("resolveMatchSide: match is case-insensitive and trims surrounding whitespace", () => {
  assert.deepEqual(resolveMatchSide("  real madonna  ", TEAMS), { teamId: "t1", teamName: "" });
});

test("resolveMatchSide: unknown name becomes a custom side (trimmed teamName)", () => {
  assert.deepEqual(resolveMatchSide("  Vincente Girone A  ", TEAMS), {
    teamId: "",
    teamName: "Vincente Girone A",
  });
});

test("resolveMatchSide: on a name collision the first matching team wins", () => {
  const dup = [
    { id: "a", name: "Doppione" },
    { id: "b", name: "Doppione" },
  ];
  assert.deepEqual(resolveMatchSide("doppione", dup), { teamId: "a", teamName: "" });
});

test("resolveMatchSide: null teams is treated as empty (input becomes custom)", () => {
  assert.deepEqual(resolveMatchSide("Qualcosa", null), { teamId: "", teamName: "Qualcosa" });
});

test("resolveMatchSide: undefined teams is treated as empty", () => {
  assert.deepEqual(resolveMatchSide("Qualcosa", undefined), { teamId: "", teamName: "Qualcosa" });
});

// ---- matchSideName ----------------------------------------------------------

test("matchSideName: a real team id resolves to that team's name", () => {
  assert.equal(matchSideName({ teamA: "t1" }, "A", TEAMS), "Real Madonna");
});

test("matchSideName: a custom side (empty id + teamAName) returns the custom name", () => {
  assert.equal(
    matchSideName({ teamA: "", teamAName: "Vincente Girone A" }, "A", TEAMS),
    "Vincente Girone A"
  );
});

test("matchSideName: neither real team nor custom name returns '?'", () => {
  assert.equal(matchSideName({ teamA: "" }, "A", TEAMS), "?");
  assert.equal(matchSideName({}, "A", TEAMS), "?");
});

test("matchSideName: unknown id falls back to the custom name when present", () => {
  assert.equal(
    matchSideName({ teamA: "ghost", teamAName: "Placeholder" }, "A", TEAMS),
    "Placeholder"
  );
});

test("matchSideName: works for side B too", () => {
  assert.equal(matchSideName({ teamB: "t2" }, "B", TEAMS), "Volley Neve");
  assert.equal(
    matchSideName({ teamB: "", teamBName: "Perdente Girone B" }, "B", TEAMS),
    "Perdente Girone B"
  );
});

test("matchSideName: null teams and missing match are handled safely", () => {
  assert.equal(matchSideName({ teamA: "t1" }, "A", null), "?");
  assert.equal(matchSideName(null, "A", TEAMS), "?");
});

// ---- matchSideHasRealTeam ---------------------------------------------------

test("matchSideHasRealTeam: true when the id matches an existing team", () => {
  assert.equal(matchSideHasRealTeam({ teamA: "t1" }, "A", TEAMS), true);
  assert.equal(matchSideHasRealTeam({ teamB: "t2" }, "B", TEAMS), true);
});

test("matchSideHasRealTeam: false for a custom side (empty id)", () => {
  assert.equal(
    matchSideHasRealTeam({ teamA: "", teamAName: "Vincente Girone A" }, "A", TEAMS),
    false
  );
});

test("matchSideHasRealTeam: false for an unknown id", () => {
  assert.equal(matchSideHasRealTeam({ teamA: "ghost" }, "A", TEAMS), false);
});

test("matchSideHasRealTeam: false when the field is missing or teams is null", () => {
  assert.equal(matchSideHasRealTeam({}, "A", TEAMS), false);
  assert.equal(matchSideHasRealTeam({ teamA: "t1" }, "A", null), false);
});
