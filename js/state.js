// State store: defaults, migration, persistence, backup.
export const KEY = 'hq.v1';

const uid = () => Math.random().toString(36).slice(2, 10);
export { uid };

export const MAIN_QUESTS = [
  // Stage 1 — Bootcamp
  { id: 'bc1', stage: 'Bootcamp', name: 'Finish the Bootcamp', xp: 300 },
  { id: 'bc2', stage: 'Bootcamp', name: 'Watch 2026 Project Walkthrough #1', xp: 60 },
  { id: 'bc3', stage: 'Bootcamp', name: 'Watch 2026 Project Walkthrough #2', xp: 60 },
  { id: 'bc4', stage: 'Bootcamp', name: 'Watch 2026 Project Walkthrough #3', xp: 60 },
  // Stage 2 — Proving Ground
  { id: 'pg1', stage: 'Proving Ground', name: 'Begin Warm Outreach', xp: 100 },
  { id: 'pg2', stage: 'Proving Ground', name: 'Begin In-Person Outreach', xp: 120 },
  { id: 'pg3', stage: 'Proving Ground', name: 'Create qualification criteria (best fit + hard requirements)', xp: 100 },
  { id: 'pg4', stage: 'Proving Ground', name: 'Define your best target client', xp: 80 },
  { id: 'pg5', stage: 'Proving Ground', name: 'Land your FIRST client', xp: 500, boss: true },
  { id: 'pg6', stage: 'Proving Ground', name: 'Launch first client within 7 days', xp: 300 },
  // Stage 3 — Killer Case Study
  { id: 'kc1', stage: 'Killer Case Study', name: 'Map your KCS (8 questions)', xp: 200 },
  { id: 'kc2', stage: 'Killer Case Study', name: 'Run project math → set your new price', xp: 150 },
  { id: 'kc3', stage: 'Killer Case Study', name: 'Upsell your KCS client', xp: 300 },
  { id: 'kc4', stage: 'Killer Case Study', name: 'Begin KCS outreach', xp: 200 },
  { id: 'kc5', stage: 'Killer Case Study', name: 'Reach 4 active clients', xp: 1000, boss: true },
];

export const KCS_QUESTIONS = [
  'What kind of company did you work with?',
  'The painful state they were in before you worked with them',
  'The specific mistakes they were making',
  'The specific solution and funnel you ran for them',
  'The tangible, specific results you got them',
  'The time frame',
  'Their ad spend for the project',
  'The amount they paid you',
];

export const DEFAULT_HABITS = [
  { name: 'Meditate', icon: '🧘', stat: 'soul', target: 10, unit: 'min', xp: 15 },
  { name: 'Pray / Gratitude', icon: '🙏', stat: 'soul', target: 1, unit: 'times', xp: 10 },
  { name: 'Workout', icon: '🏋️', stat: 'body', target: 45, unit: 'min', xp: 25 },
  { name: 'Walk', icon: '🚶', stat: 'body', target: 8000, unit: 'steps', xp: 15 },
  { name: 'Drink water', icon: '💧', stat: 'body', target: 8, unit: 'cups', xp: 10 },
  { name: 'Read', icon: '📖', stat: 'mind', target: 10, unit: 'pages', xp: 15 },
  { name: 'Journal', icon: '✍️', stat: 'mind', target: 1, unit: 'times', xp: 10 },
  { name: 'Skill learning', icon: '🎓', stat: 'craft', target: 30, unit: 'min', xp: 25 },
  { name: 'No phone first hour', icon: '📵', stat: 'mind', target: 1, unit: 'times', xp: 15 },
];

export const DEFAULT_SHOP = [
  { name: 'Favourite meal out', icon: '🍕', cost: 300 },
  { name: '1 hour gaming guilt-free', icon: '🎮', cost: 150 },
  { name: 'Movie night', icon: '🎬', cost: 200 },
  { name: 'New clothes item', icon: '👕', cost: 800 },
  { name: 'Lazy morning', icon: '😴', cost: 400 },
];

export function defaults() {
  return {
    v: 1,
    profile: { name: 'Hero', currency: '€', activeClients: 0, sound: true, vibrate: true, onboarded: false },
    xp: 0, gold: 0, gems: 0, revenue: 0, hp: 10, lastDay: null,
    days: {},            // 'YYYY-MM-DD' -> {xp, mind, body, soul, hustle, craft, wealth}
    payments: [],        // {t, amount, client}
    pendingCall: null,   // {leadId, t}
    combo: { n: 0, at: 0 },
    log: [],             // {t, type, stat, xp, gold, n, meta}
    counters: {},        // {'YYYY-MM-DD': {call, email, dm, inperson, warm, leads, booked, fulfil}}
    leads: [],           // {id, name, phone, note, status, attempts, last}
    clients: [],         // {id, name, signed, value, active, launched, kcs:[8], fulfilDays:{}}
    habits: DEFAULT_HABITS.map(h => ({ id: uid(), ...h, log: {} })),
    quests: { main: MAIN_QUESTS.map(q => ({ ...q, done: false })), custom: [], daily: {} },
    shop: DEFAULT_SHOP.map(s => ({ id: uid(), ...s })),
    bought: [],
    achievements: {},    // id -> date
    checkins: {},        // date -> {wins, lessons, tomorrow, rating}
    chests: {},          // date -> true
    pricing: { hours: 40, rate: 25, adSpend: 0, margin: 30 },
  };
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function deepFill(base, data) {
  if (!isObj(data)) return base;
  const out = { ...base };
  for (const k of Object.keys(data)) {
    out[k] = isObj(base[k]) && isObj(data[k]) ? deepFill(base[k], data[k]) : data[k];
  }
  return out;
}

export function migrate(obj) {
  const s = deepFill(defaults(), obj);
  // add any new main quests introduced in later versions
  const have = new Set((s.quests.main || []).map(q => q.id));
  MAIN_QUESTS.forEach(q => { if (!have.has(q.id)) s.quests.main.push({ ...q, done: false }); });
  return s;
}

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(KEY);
    if (!raw) return defaults();
    return migrate(JSON.parse(raw));
  } catch { return defaults(); }
}

export function save(state, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export const exportJson = s => JSON.stringify({ app: 'hustle-quest', at: new Date().toISOString(), state: s }, null, 1);

export function importJson(text) {
  const o = JSON.parse(text);
  const st = o && o.state ? o.state : o;
  if (!isObj(st)) throw new Error('Not a Hustle Quest backup');
  return migrate(st);
}
