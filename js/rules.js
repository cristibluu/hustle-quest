// Pure game rules — no DOM, unit-tested.

export const STATS = [
  { id: 'mind',   name: 'Mind',   icon: '🧠', color: '#7cc4ff' },
  { id: 'body',   name: 'Body',   icon: '💪', color: '#ff7a59' },
  { id: 'soul',   name: 'Soul',   icon: '🕊️', color: '#c89bff' },
  { id: 'hustle', name: 'Hustle', icon: '📞', color: '#ffd23f' },
  { id: 'craft',  name: 'Craft',  icon: '🛠️', color: '#5fe0a8' },
  { id: 'wealth', name: 'Wealth', icon: '💰', color: '#f5b942' },
];

export const RANKS = [
  { name: 'Broke',    min: 0,     title: 'Starving Squire' },
  { name: 'Hustler',  min: 500,   title: 'Street Hustler' },
  { name: 'Closer',   min: 2000,  title: 'Deal Closer' },
  { name: 'Operator', min: 5000,  title: 'Agency Operator' },
  { name: 'Boss',     min: 15000, title: 'Business Boss' },
  { name: 'Wealthy',  min: 50000, title: 'Wealthy Lord' },
];

export function outreachTarget(activeClients) {
  const c = Math.max(0, Math.floor(Number(activeClients) || 0));
  if (c >= 4) return { amount: 100, per: 'week' };
  return { amount: (4 - c) * 100, per: 'day' };
}

export const xpNeed = n => Math.round(100 * Math.pow(n, 1.5));

export function levelFromXp(xp) {
  let level = 1, rest = Math.max(0, xp || 0);
  while (rest >= xpNeed(level)) { rest -= xpNeed(level); level++; }
  return { level, into: rest, need: xpNeed(level) };
}

export function rankFromRevenue(rev) {
  const r = Math.max(0, Number(rev) || 0);
  let index = 0;
  RANKS.forEach((k, i) => { if (r >= k.min) index = i; });
  const next = RANKS[index + 1] || null;
  return { index, name: RANKS[index].name, title: RANKS[index].title, next };
}

export function rollReward(baseXp, combo = 0, rand = Math.random) {
  const crit = rand() < 0.1;
  const mult = 1 + Math.min(Math.max(combo, 0), 10) * 0.1;
  const xp = Math.round(baseXp * mult * (crit ? 2 : 1));
  return { xp, gold: Math.ceil(xp / 5), crit };
}

// ---- dates (local, YYYY-MM-DD) ----
export function dayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function streak(dates, today) {
  const set = new Set(dates);
  if (!set.size) return { current: 0, best: 0 };
  // current: count back from today (or yesterday if today not yet done)
  let cur = 0;
  let k = set.has(today) ? today : addDays(today, -1);
  while (set.has(k)) { cur++; k = addDays(k, -1); }
  // best
  const sorted = [...set].sort();
  let best = 0, run = 0, prev = null;
  for (const s of sorted) {
    run = prev && addDays(prev, 1) === s ? run + 1 : 1;
    best = Math.max(best, run);
    prev = s;
  }
  return { current: cur, best };
}

export function consistency(dates, today, days = 14) {
  const set = new Set(dates);
  let hit = 0;
  for (let i = 0; i < days; i++) if (set.has(addDays(today, -i))) hit++;
  return Math.round((hit / days) * 100);
}
