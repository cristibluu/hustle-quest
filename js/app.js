import * as R from './rules.js';
import { load, save, uid, exportJson, importJson, defaults } from './state.js';
import * as fx from './fx.js';
import { drawHero } from './sprite.js';
import { blocksFor, currentBlock, mins, buildIcs } from './blocks.js';
import heroView from './views/hero.js';
import questsView from './views/quests.js';
import huntView, { askCallOutcome } from './views/hunt.js';
import habitsView from './views/habits.js';
import statsView from './views/stats.js';

export const S = load();
export { R, fx, uid };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const today = () => R.dayKey();
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => `${esc(S.profile.currency)}${Math.round(n).toLocaleString('en')}`;
export function persist() { if (!save(S)) fx.toast('⚠️ Could not save — storage full? Export a backup.'); }

export const OUTREACH = ['call', 'email', 'dm', 'inperson', 'warm'];
export const activeClients = () => S.clients.filter(c => c.active).length;
export function dayCounters(d = today()) {
  if (!S.counters[d]) S.counters[d] = {};
  const c = S.counters[d];
  for (const k of [...OUTREACH, 'leads', 'booked', 'fulfil']) c[k] = c[k] || 0;
  return c;
}
const sumOut = c => c ? OUTREACH.reduce((a, k) => a + (c[k] || 0), 0) : 0;
export function weekStart(key = today()) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d); const off = (dt.getDay() + 6) % 7;
  return R.addDays(key, -off);
}
export function outreachProgress() {
  const t = R.outreachTarget(activeClients());
  if (t.per === 'day') return { ...t, done: sumOut(S.counters[today()]) };
  let done = 0; const ws = weekStart();
  for (let i = 0; i < 7; i++) done += sumOut(S.counters[R.addDays(ws, i)]);
  return { ...t, done };
}
export const outreachOn = d => sumOut(S.counters[d]);

export const statDates = stat => Object.keys(S.days).filter(d => (S.days[d][stat] || 0) > 0);
export const activeDates = () => Object.keys(S.days).filter(d => (S.days[d].xp || 0) > 0);
export const statXp = stat => Object.values(S.days).reduce((a, d) => a + (d[stat] || 0), 0);

// ---------------- rewards ----------------
export function award({ stat = 'hustle', xp = 10, type = 'misc', n = 1, meta = null, at = null, gold = 0, gems = 0, noCombo = false }) {
  const now = Date.now();
  if (!noCombo) {
    S.combo = now - (S.combo.at || 0) < 180000 ? { n: S.combo.n + 1, at: now } : { n: 1, at: now };
  }
  const r = R.rollReward(xp, noCombo ? 0 : S.combo.n - 1);
  r.gold += gold;
  const before = R.levelFromXp(S.xp).level;
  S.xp += r.xp; S.gold += r.gold; S.gems += gems;
  const d = today();
  S.days[d] = S.days[d] || { xp: 0 };
  S.days[d].xp += r.xp; S.days[d][stat] = (S.days[d][stat] || 0) + r.xp;
  S.log.push({ t: now, type, stat, xp: r.xp, gold: r.gold, n, meta });
  if (S.log.length > 6000) S.log.splice(0, S.log.length - 6000);
  const pos = at ? { x: at.x, y: at.y } : { x: innerWidth / 2, y: innerHeight / 2 };
  fx.floatReward(r, pos.x, pos.y);
  fx.beep(r.crit ? 'crit' : 'coin'); fx.buzz(r.crit ? [20, 40, 30] : 12);
  if (gems) setTimeout(() => fx.floatText(`+${gems} 💎`, pos.x - 30, pos.y + 20, 'g'), 200);
  const after = R.levelFromXp(S.xp).level;
  if (after > before) {
    S.gems += 1; S.hp = Math.min(10, S.hp + 3);
    setTimeout(() => { fx.beep('level'); fx.bigMoment(`LEVEL ${after}!`, '+1 💎 · HP restored', '⬆️'); }, 350);
  }
  checkAchievements();
  persist(); renderHud();
  return r;
}

// Reverse the most recent log entry of a type logged today.
export function unaward(type) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = S.log.length - 1; i >= 0; i--) {
    const e = S.log[i];
    if (e.t < start.getTime()) break;
    if (e.type === type) {
      S.xp = Math.max(0, S.xp - e.xp); S.gold = Math.max(0, S.gold - e.gold);
      const d = S.days[today()];
      if (d) { d.xp = Math.max(0, d.xp - e.xp); d[e.stat] = Math.max(0, (d[e.stat] || 0) - e.xp); }
      S.log.splice(i, 1); S.combo = { n: 0, at: 0 };
      persist(); renderHud(); return true;
    }
  }
  return false;
}

// ---------------- achievements ----------------
const lifetime = k => Object.values(S.counters).reduce((a, c) => a + (c[k] || 0), 0);
const lifeOut = () => OUTREACH.reduce((a, k) => a + lifetime(k), 0);
export const ACHIEVEMENTS = [
  { id: 'first_call', icon: '📞', name: 'First dial', test: () => lifetime('call') >= 1 },
  { id: 'calls100', icon: '☎️', name: '100 calls', test: () => lifetime('call') >= 100 },
  { id: 'calls1000', icon: '📡', name: '1,000 calls', test: () => lifetime('call') >= 1000 },
  { id: 'out1000', icon: '🚀', name: '1,000 outreaches', test: () => lifeOut() >= 1000 },
  { id: 'out10k', icon: '🌋', name: '10,000 outreaches', test: () => lifeOut() >= 10000 },
  { id: 'walkin', icon: '🚪', name: 'First walk-in', test: () => lifetime('inperson') >= 1 },
  { id: 'booked1', icon: '📅', name: 'First call booked', test: () => lifetime('booked') >= 1 },
  { id: 'booked10', icon: '🗓️', name: '10 calls booked', test: () => lifetime('booked') >= 10 },
  { id: 'client1', icon: '🤝', name: 'First client', test: () => S.clients.length >= 1 },
  { id: 'client4', icon: '👑', name: '4 active clients', test: () => activeClients() >= 4 },
  { id: 'kcs', icon: '🏆', name: 'Killer case study', test: () => S.clients.some(c => (c.kcs || []).filter(Boolean).length === 8) },
  { id: 'paid', icon: '💶', name: 'First money in', test: () => S.revenue > 0 },
  { id: 'streak7', icon: '🔥', name: '7-day streak', test: () => R.streak(activeDates(), today()).best >= 7 },
  { id: 'streak30', icon: '☄️', name: '30-day streak', test: () => R.streak(activeDates(), today()).best >= 30 },
  { id: 'lvl5', icon: '⭐', name: 'Level 5', test: () => R.levelFromXp(S.xp).level >= 5 },
  { id: 'lvl10', icon: '🌟', name: 'Level 10', test: () => R.levelFromXp(S.xp).level >= 10 },
  { id: 'checkin7', icon: '🌙', name: '7 check-ins', test: () => Object.keys(S.checkins).length >= 7 },
  { id: 'combo10', icon: '⚡', name: '10x combo', test: () => S.combo.n >= 10 },
  { id: 'shop', icon: '🎁', name: 'Treat yourself', test: () => S.bought.length >= 1 },
  { id: 'hustler', icon: '🧥', name: 'Rank: Hustler', test: () => R.rankFromRevenue(S.revenue).index >= 1 },
];
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!S.achievements[a.id] && a.test()) {
      S.achievements[a.id] = today(); S.gems += 2;
      setTimeout(() => { fx.toast(`${a.icon} Achievement: ${a.name}  +2 💎`); fx.beep('crit'); }, 600);
    }
  }
}

// ---------------- day rollover / HP ----------------
function rollover() {
  const t = today();
  if (S.lastDay && S.lastDay !== t) {
    let d = S.lastDay, lost = 0;
    while (d < t) {
      if (!(S.days[d] && S.days[d].xp > 0)) lost += 3;
      else if (outreachOn(d) === 0 && R.outreachTarget(activeClients()).per === 'day') lost += 1;
      d = R.addDays(d, 1);
    }
    if (lost) {
      S.hp -= lost;
      if (S.hp <= 0) {
        const fine = Math.ceil(S.gold * 0.1);
        S.gold -= fine; S.hp = 5;
        setTimeout(() => { fx.beep('bad'); fx.bigMoment('KNOCKED OUT', `You skipped days. Lost ${fine} 🪙. Get back in the fight.`, '💀'); }, 800);
      } else setTimeout(() => fx.toast(`💔 -${lost} HP for missed days. Don't let it hit 0.`), 900);
    }
  }
  S.lastDay = t; persist();
}

// ---------------- sheet ----------------
export function openSheet(html, mount) {
  const wrap = $('#sheet-wrap'), sh = $('#sheet');
  sh.innerHTML = html; wrap.hidden = false;
  $('.sheet-bg', wrap).onclick = closeSheet;
  $$('[data-close]', sh).forEach(b => b.onclick = closeSheet);
  mount && mount(sh);
  const f = sh.querySelector('input,textarea'); if (f && !f.dataset.nofocus) setTimeout(() => f.focus(), 250);
  return sh;
}
export function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; }
export const pt = ev => ev && ev.clientX ? { x: ev.clientX, y: ev.clientY } : null;

// ---------------- HUD ----------------
let heroFrame = 0;
export function renderHud() {
  const L = R.levelFromXp(S.xp), rk = R.rankFromRevenue(S.revenue);
  const combo = S.combo.n > 1 && Date.now() - S.combo.at < 180000 ? `<span class="combo">x${S.combo.n} COMBO</span>` : '';
  $('#hud').innerHTML = `
    <div class="hud-top">
      <canvas class="hud-av" id="hudav"></canvas>
      <div class="grow"><div class="hud-name">${esc(S.profile.name)}</div><div class="hud-lvl">Lv ${L.level} · ${rk.name}</div></div>
      <span class="pill gold">🪙 ${S.gold.toLocaleString('en')}</span>
      <span class="pill gem">💎 ${S.gems}</span>
      <button class="icon-btn" id="menu" aria-label="Settings">☰</button>
    </div>
    <div class="bars">
      <span class="bar-ic">❤️</span><div class="bar hp"><i style="width:${S.hp * 10}%"></i><b>${S.hp}/10</b></div>
      <span class="bar-ic">✨</span><div class="bar xp"><i style="width:${(L.into / L.need) * 100}%"></i><b>${L.into}/${L.need} XP</b></div>
    </div>
    <div class="row" style="margin-top:4px;min-height:4px">${combo}</div>`;
  const av = $('#hudav'); drawHero(av, rk.index, 0, 2);
  av.style.width = '44px'; av.style.height = '44px'; av.style.objectFit = 'contain';
  $('#menu').onclick = openSettings;
}

// ---------------- router ----------------
const VIEWS = { hero: heroView, quests: questsView, hunt: huntView, habits: habitsView, stats: statsView };
let tab = (location.hash.slice(1) in VIEWS) ? location.hash.slice(1) : 'quests';
export function go(t) { tab = t; history.replaceState(null, '', '#' + t); render(); $('#view').scrollTo?.(0, 0); scrollTo(0, 0); }
export function render() {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const root = $('#view'); root.innerHTML = '';
  VIEWS[tab](root);
}
$$('#tabs button').forEach(b => b.onclick = () => { fx.beep('tick'); go(b.dataset.tab); });
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h in VIEWS && h !== tab) go(h); });

// ---------------- settings ----------------
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function openSettings() {
  openSheet(`
    <h2>Settings</h2>
    <label>Hero name</label><input id="s-name" value="${esc(S.profile.name)}" data-nofocus="1">
    <label>Currency symbol</label><input id="s-cur" value="${esc(S.profile.currency)}" maxlength="4">
    <div class="opts" style="margin-top:12px">
      <button class="btn" id="s-sound">${S.profile.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
      <button class="btn" id="s-vib">${S.profile.vibrate ? '📳 Vibrate on' : '📴 Vibrate off'}</button>
    </div>
    <h3 style="margin-top:18px">Reminders</h3>
    <p class="dim" style="font-size:13px">Your phone's calendar gives the most reliable alerts. Download your time blocks and open the file to add them to Samsung or Google Calendar (5-minute alarms).</p>
    <div class="opts"><button class="btn" id="s-ics">📅 Download time blocks</button><button class="btn" id="s-notif">🔔 Allow in-app alerts</button></div>
    <h3 style="margin-top:18px">Backup</h3>
    <p class="dim" style="font-size:13px">Your progress lives on this phone. Export a backup every week so clearing Chrome can't wipe it.</p>
    <div class="opts"><button class="btn" id="s-exp">⬇️ Export backup</button><label class="btn" style="margin:0;color:var(--text);font-size:15px">⬆️ Import backup<input type="file" id="s-imp" accept=".json,application/json" hidden></label></div>
    <button class="btn block ghost bad" id="s-reset" style="margin-top:18px">Reset all progress</button>
    <button class="btn primary block" data-close style="margin-top:10px">Done</button>`, sh => {
    $('#s-name', sh).onchange = e => { S.profile.name = e.target.value.trim() || 'Hero'; persist(); renderHud(); };
    $('#s-cur', sh).onchange = e => { S.profile.currency = e.target.value.trim() || '€'; persist(); render(); };
    $('#s-sound', sh).onclick = e => { S.profile.sound = !S.profile.sound; fx.setFxPrefs({ sound: S.profile.sound }); e.target.textContent = S.profile.sound ? '🔊 Sound on' : '🔇 Sound off'; persist(); };
    $('#s-vib', sh).onclick = e => { S.profile.vibrate = !S.profile.vibrate; fx.setFxPrefs({ vibrate: S.profile.vibrate }); e.target.textContent = S.profile.vibrate ? '📳 Vibrate on' : '📴 Vibrate off'; persist(); };
    $('#s-ics', sh).onclick = () => download('hustle-quest-time-blocks.ics', buildIcs(activeClients()), 'text/calendar');
    $('#s-notif', sh).onclick = async () => {
      if (!('Notification' in window)) return fx.toast('Notifications not supported here.');
      const p = await Notification.requestPermission();
      fx.toast(p === 'granted' ? '🔔 Alerts on while the app is open or in the background.' : 'Alerts blocked — use the calendar file instead.');
      scheduleNotifs();
    };
    $('#s-exp', sh).onclick = () => download(`hustle-quest-backup-${today()}.json`, exportJson(S), 'application/json');
    $('#s-imp', sh).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      let ns;
      try { ns = importJson(await f.text()); } catch { e.target.value = ''; return fx.toast('❌ That file is not a Hustle Quest backup. Nothing was changed.'); }
      if (!confirm('Replace your current progress with this backup? Your current data is kept as a safety copy.')) { e.target.value = ''; return; }
      try { localStorage.setItem('hq.v1.preimport', JSON.stringify(S)); } catch { /* storage full */ }
      Object.keys(S).forEach(k => delete S[k]); Object.assign(S, ns); S.lastDay = today(); S.pendingCall = null;
      persist(); closeSheet(); renderHud(); render(); fx.toast('✅ Backup restored');
    };
    $('#s-reset', sh).onclick = () => {
      if (!confirm('Erase ALL progress on this phone? Export a backup first if unsure.')) return;
      Object.keys(S).forEach(k => delete S[k]); Object.assign(S, defaults()); S.lastDay = today(); persist(); closeSheet(); renderHud(); render();
    };
  });
}

// ---------------- notifications (while app alive) ----------------
let notifTimer;
export function scheduleNotifs() {
  clearTimeout(notifTimer);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), t = now.getHours() * 60 + now.getMinutes();
  const nb = blocksFor(now, activeClients()).find(b => mins(b.s) > t);
  if (!nb) return;
  const ms = (mins(nb.s) - t) * 60000 - now.getSeconds() * 1000;
  notifTimer = setTimeout(async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    const body = `${nb.s}–${nb.e} · tap to start the quest`;
    if (reg) reg.showNotification(`${nb.icon} ${nb.name}`, { body, icon: 'icons/icon-192.png', tag: 'block', vibrate: [100, 50, 100] });
    else new Notification(`${nb.icon} ${nb.name}`, { body });
    scheduleNotifs();
  }, Math.max(1000, ms));
}

// ---------------- onboarding ----------------
function onboard() {
  openSheet(`
    <h2>Welcome, adventurer</h2>
    <p class="dim">Every call, walk-in and habit earns XP and gold. Your rank climbs from <b class="gold">Broke</b> to <b class="gold">Wealthy</b> as real money comes in.</p>
    <label>What should we call you?</label><input id="ob-name" placeholder="Your name">
    <label>Currency</label><select id="ob-cur"><option>€</option><option value="RON ">RON</option><option>$</option><option>£</option></select>
    <button class="btn primary block" id="ob-go" style="margin-top:16px">Start my quest</button>`, sh => {
    $('#ob-go', sh).onclick = () => {
      S.profile.name = $('#ob-name', sh).value.trim() || 'Hero';
      S.profile.currency = $('#ob-cur', sh).value; S.profile.onboarded = true;
      S.gold += 50; persist(); closeSheet(); renderHud(); render();
      fx.bigMoment('QUEST STARTED', '+50 🪙 starter gold. Open today\'s chest in Quests.', '⚔️');
    };
  });
}

// ---------------- boot ----------------
fx.setFxPrefs({ sound: S.profile.sound, vibrate: S.profile.vibrate });
if (S.loadFailed) { delete S.loadFailed; setTimeout(() => fx.toast('⚠️ Saved data could not be read. A copy was kept; import a backup to restore.'), 800); }
rollover();
renderHud(); render();
if (!S.profile.onboarded) onboard();
scheduleNotifs();
setInterval(renderHud, 30000);
// a call may have killed the app; ask on next open (but forget calls older than 3h)
function checkPendingCall() {
  const pc = S.pendingCall; if (!pc) return;
  const age = Date.now() - pc.t;
  if (age > 3 * 3600000) { S.pendingCall = null; persist(); }
  else if (age > 2500) askCallOutcome();
}
checkPendingCall();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (S.lastDay !== today()) { rollover(); render(); }
  renderHud(); scheduleNotifs();
  checkPendingCall();
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
