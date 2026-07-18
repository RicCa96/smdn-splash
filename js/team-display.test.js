const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_TEAM_COLOR, teamColor, teamDot } = require("./team-display.js");

test("teamColor returns the team's color when it is a valid hex", () => {
  assert.equal(teamColor({ color: "#3366cc" }), "#3366cc");
});

test("teamColor falls back to default when color is missing", () => {
  assert.equal(teamColor({ name: "No Color FC" }), DEFAULT_TEAM_COLOR);
});

test("teamColor falls back to default when color is not a 6-digit hex", () => {
  assert.equal(teamColor({ color: "red" }), DEFAULT_TEAM_COLOR);
  assert.equal(teamColor({ color: "#fff" }), DEFAULT_TEAM_COLOR);
});

test("teamColor rejects style-injection payloads and uses default", () => {
  assert.equal(
    teamColor({ color: '#000;"></span><script>alert(1)</script>' }),
    DEFAULT_TEAM_COLOR
  );
});

test("teamDot wraps a swatch span carrying the team color", () => {
  assert.equal(
    teamDot({ color: "#3366cc" }),
    '<span class="team-dot" style="background:#3366cc"></span>'
  );
});

test("teamDot uses the default color for a missing color, never raw input", () => {
  const html = teamDot({ color: "javascript:evil" });
  assert.equal(html, `<span class="team-dot" style="background:${DEFAULT_TEAM_COLOR}"></span>`);
  assert.ok(!html.includes("evil"));
});
