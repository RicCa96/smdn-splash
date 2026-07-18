# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static site (HTML/CSS/vanilla JS, no build step, no framework, no bundler) for the "Splash SMDN 2026" event — soap-soccer and volleyball tournaments of the Sagra della Madonna della Neve, Vezzano sul Crostolo. All UI copy and comments are in Italian. Firebase (Firestore + Auth, free Spark plan) provides real-time data and admin login. Firebase Hosting + GitHub Pages serve it. No demo/offline mode: the site always reads and writes live Firestore.

## Commands

- **Run locally:** `python3 -m http.server` then open `http://localhost:8000`. A static server is required (not `file://`) because scripts load Firebase and read config.
- **Test:** `node --test js/` (Node's built-in runner). Only `js/team-display.js` is unit-tested — it's the one module with a `module.exports` guard so it loads under Node. Run one file: `node --test js/team-display.test.js`.
- **Deploy:** push to `main`. PRs get a Firebase Hosting preview via `.github/workflows/firebase-hosting-pull-request.yml`. Data (teams, matches, votes) is edited live from the admin panel, never via code.

## Architecture

Everything is loaded by `index.html` (single page, all modals inline) via ordered `<script>` tags — **load order matters, there are no imports/exports**. Firebase compat SDKs (v10.12.2) load from gstatic CDN first, then local scripts in this order: `config.js` → `firebase-config.js` → `team-display.js` → `app.js` → `admin.js`. All symbols are globals shared across files.

- **`js/config.js`** (`SITE_CONFIG`): event links (Instagram, WhatsApp, Google Form), tournament days, and Cloudinary credentials. Edit here to change event settings without touching logic. If `cloudinaryCloudName`/`cloudinaryUploadPreset` stay `REPLACE_ME`, the photo-upload box hides and only the WhatsApp link shows.
- **`js/firebase-config.js`** (`FIREBASE_CONFIG`): Firebase project keys. **Public by design** — security lives in Firestore rules, not in hiding this key.
- **`js/team-display.js`**: pure helpers for team color rendering (`teamColor`, `teamDot`, `teamCardStyle`). `teamColor` validates against `/^#[0-9a-fA-F]{6}$/` and falls back to `DEFAULT_TEAM_COLOR` — this is a **security boundary**: the value is interpolated raw into inline `style` attributes, so the regex is what blocks style/script injection. The test file asserts injection payloads are rejected; keep that invariant if you touch this.
- **`js/app.js`**: public logic. A single global `state` object holds `teams`, `matches`, `votes`, `fanta`, `photos`, plus `tourney` (current tab: `"calcetto"` or `"splash"`) and `uid`. `subscribeData()` wires Firestore `onSnapshot` listeners that overwrite the relevant `state` slice and call `renderAll()`/specific renderers — **the UI is a pure function of `state`; never mutate the DOM as the source of truth, mutate Firestore and let the snapshot re-render.** Standings (3/1/0 pts) and scorer rankings are computed client-side from `matches`.
- **`js/admin.js`**: admin panel (🔐), gated behind Firebase Email/Password auth. All writes go through `dbAdd`/`dbUpdate`/`dbDelete` wrappers on Firestore collections. Deleting a team must also cascade-delete its MVP votes and fanta points (see `adminDeleteTeam`).

### Auth model

Two identities via Firebase Auth: **anonymous** (auto sign-in on load — identifies a device for MVP voting and photo uploads, one vote per device per category) and **admin** (Email/Password, unlocks the admin panel). `auth.onAuthStateChanged` drives both. MVP vote doc id is deterministic — `` `${uid}_${tourney}_${cat}` `` — so a device's vote is upsert-able/changeable, not duplicated.

### Firestore collections

`teams`, `matches`, `votes` (MVP), `fanta`, `photos` (`approved: true` filter on the public gallery). Photos are uploaded to **Cloudinary** (unsigned preset) and only appear publicly after admin approval.

### Tournament scoping

Teams/matches carry a `tournament` field: `"calcetto"`, `"splash"`, or `"entrambi"` (both). `inTourney()` filters by the active tab. Scorers ranking exists only for calcetto. Player gender is marked with `(F)` suffix in the admin team textarea and drives the separate "best female player" MVP vote.

## Gotchas

- `firestore.rules` is referenced by `README.md` and the security model but **is not committed** to the repo — the live rules exist only in the Firebase console. If you change read/write assumptions, the rules must be updated there manually (and re-published after every edit).
- No linter, formatter, or CI test step is configured — the only automated check is the Firebase preview deploy on PRs. Run `node --test js/` yourself before committing changes to `team-display.js`.
