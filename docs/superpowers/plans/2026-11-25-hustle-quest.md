# Hustle Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installable, offline, pixel-art RPG PWA that runs the workshop's outreach system plus mind/body/soul habits, with XP, gold, ranks, streaks and stats.

**Architecture:** No build step. Static files served from GitHub Pages. ES modules: pure game rules (`rules.js`, unit-tested with `node --test`), a state store persisted to localStorage, view modules rendering into one `<main>` with a bottom tab bar. Service worker caches the app shell.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Canvas 2D, Web Audio, Vibration API, Service Worker, Node 24 test runner.

**Spec:** `docs/2026-11-25-hustle-quest-design.md`

## Global Constraints
- Mobile-first, 360–430px wide primary; tap targets ≥ 44px; dark theme.
- All data local (`localStorage` key `hq.v1`); export/import JSON backup.
- Outreach target: clients < 4 → `(4 − clients) × 100` per day; clients ≥ 4 → `100` per week.
- Time blocks: client work 04:00–08:00; cold calls + in-person 09:00–17:00 (Mon–Fri); in-person weekends; warm outreach, lead gathering, cold email prep 19:00–22:00.
- Romania/EU: all outreach channels enabled (call, email, DM, in-person, warm).
- Currency default `€`, editable.

## Review Focus
1. Fresh install / empty or corrupt localStorage → app loads with defaults, never a blank screen. (Task 2 test `load() with garbage returns defaults`.)
2. Day rollover at midnight while app open or reopened next day → daily counters reset, streak updated once, not twice. (Task 1 test `streak handles gaps and same-day repeats`.)
3. Import of an older/partial backup → merged over defaults. (Task 2 test `migrate fills missing keys`.)
4. Clients count goes 3→4 → target switches from daily 100 to weekly 100. (Task 1 test.)
5. Offline launch from home screen → shell loads from service worker. (Task 6 manual check.)

---

### Task 1: Game rules (pure, tested)
**Files:** Create `js/rules.js`, `tests/rules.test.mjs`, `package.json` (`"type":"module"`, `"test":"node --test tests/"`)

**Produces:**
- `outreachTarget(activeClients:number) -> {amount:number, per:'day'|'week'}`
- `levelFromXp(xp) -> {level, into, need}`; need for level n = `round(100 * n^1.5)`
- `RANKS` = Broke(0) Hustler(500) Closer(2000) Operator(5000) Boss(15000) Wealthy(50000) by lifetime revenue; `rankFromRevenue(rev) -> {index, name, next}`
- `rollReward(baseXp, combo, rand=Math.random) -> {xp, gold, crit}`; crit 10% ×2; combo multiplier `1 + min(combo,10)*0.1`; gold = `ceil(xp/5)`
- `streak(dates:string[] 'YYYY-MM-DD', today) -> {current, best}`
- `consistency(dates, today, days=14) -> 0..100` (% of last 14 days active)
- `STATS` = mind, body, soul, hustle, craft, wealth

- [ ] Tests: `outreachTarget(0)` → {400,'day'}; `(3)` → {100,'day'}; `(4)` and `(6)` → {100,'week'}; `levelFromXp(0).level===1`; `rankFromRevenue(2000).name==='Closer'`; `rollReward(10,0,()=>0.05).crit===true` and xp 20; `streak(['2026-11-23','2026-11-24','2026-11-24'],'2026-11-25')` → current 2 (yesterday counts until today ends); gap resets; `consistency` of 7 distinct days in 14 → 50.
- [ ] Run `npm test` → fail; implement; run → pass.

### Task 2: State store
**Files:** Create `js/state.js`, `tests/state.test.mjs`
**Produces:** `defaults()`, `migrate(obj)`, `load(storage)`, `save(state, storage)`, `exportJson(state)`, `importJson(text)`; state shape: `{profile:{name,currency,stage}, xp, gold, gems, combo, log:[{t,type,stat,xp,gold,meta}], counters:{date, call, email, dm, inperson, warm, leads}, leads:[], clients:[], habits:[], quests:{main:[...]}, shop:[], achievements:{}, checkins:{}, revenue}`
- [ ] Tests: garbage → defaults; migrate fills missing keys keeping existing; roundtrip export/import.
- [ ] Implement; `npm test` passes.

### Task 3: Shell, theme, router, effects
**Files:** `index.html`, `css/app.css`, `js/app.js`, `js/fx.js`, `js/sprite.js`
- Top HUD (avatar, level, gold, gems, XP bar) + bottom tabs: Hero, Quests, Hunt (outreach), Habits, Stats; Settings via HUD menu.
- `fx.js`: `toast(text)`, `floatReward({xp,gold,crit}, x,y)`, `levelUp(level)`, `confetti()`, `beep(kind)`, `buzz(ms)`.
- `sprite.js`: `drawHero(canvas, rankIndex, frame)` pixel hero with gear by rank (rags → suit+gold chain+crown), idle bob animation.
- `app.js`: `award(type, stat, baseXp, meta)` central function → rollReward, log, level/rank checks, achievement checks, save, re-render HUD.
- [ ] Verify in browser at 390×844: tabs switch, award shows float + level-up.

### Task 4: Views
**Files:** `js/views/hero.js, quests.js, hunt.js, habits.js, stats.js, settings.js`
- Hero: sprite, rank ladder Broke→Wealthy with progress, radar (6 stats, consistency), stage, revenue input (logging a payment awards Wealth XP).
- Quests: daily quests (outreach target, time-block quests for current hour highlighted, fulfillment 4h per active client, gather leads, end-of-day check-in), main quest line checklist from doc, bosses, daily chest, custom quests.
- Hunt: big +1 buttons (call, email, DM, in-person, warm, lead) with progress to target; lead list with Call (tel:) → on `visibilitychange` return, outcome sheet (no answer / not interested / callback / booked → books discovery call); clients list (signed date, launch deadline, KCS 8-question builder, price helper, upsell flag).
- Habits: default habits (meditate, read 10 pages, workout, walk, water, journal/prayer, skill learning 30 min) mapped to stats; streak flames; add/edit.
- Stats: today/week totals, 7-day bar chart (canvas), 12-week heatmap, best streaks, achievements grid, shop (spend gold on user-defined rewards).
- Settings: name, currency, active clients, export/import, reset, notification permission, calendar time blocks .ics download.
- [ ] Verify each flow in browser at mobile size; no console errors.

### Task 5: Reminders
- In-app: when open, notify at block starts via `Notification`/SW `showNotification`.
- `.ics` generator in settings (recurring blocks with VALARM) as fallback.
- Google Calendar: after user confirms, create recurring events via connector.

### Task 6: PWA + deploy
**Files:** `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`
- [ ] Lighthouse-style check: manifest valid, SW registered, offline reload works.
- [ ] git init, push to new GitHub repo, enable Pages; give user install steps (Chrome → ⋮ → Add to Home screen / Install app).
