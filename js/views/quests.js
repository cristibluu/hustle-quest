import { S, R, $, $$, esc, award, openSheet, closeSheet, today, persist, render, fx, pt, renderHud, uid, dayCounters, outreachProgress, activeClients, go, weekStart } from '../app.js';

// weekly outreach (4+ clients) is claimed once per week, everything else once per day
const isClaimed = (q, cl) => q.claimKey ? !!S.quests.daily[q.claimKey] : !!cl[q.id];
import { blocksFor, currentBlock, nextBlock } from '../blocks.js';

const LEADS_TARGET = 20;
const DIFF = { easy: 20, medium: 50, hard: 120, epic: 300 };

export function dailyQuests() {
  const t = today(), c = dayCounters(t), op = outreachProgress();
  const habitsDone = S.habits.filter(h => (h.log[t] || 0) >= h.target).length;
  const q = [
    { id: 'out', icon: '🎯', name: `Outreach: ${op.amount} ${op.per === 'day' ? 'today' : 'this week'}`, sub: `(4 − ${activeClients()} clients) rule`, have: op.done, need: op.amount, xp: 150, stat: 'hustle', go: 'hunt' },
    { id: 'leads', icon: '🗂️', name: `Gather ${LEADS_TARGET} new leads`, sub: 'Evenings + weekends', have: c.leads, need: LEADS_TARGET, xp: 60, stat: 'hustle', go: 'hunt' },
  ];
  if (activeClients() > 0) q.push({ id: 'fulfil', icon: '🛠️', name: '4 hours of client fulfillment', sub: '4–8am is ideal', have: c.fulfil, need: 4, xp: 100, stat: 'craft', fulfil: true });
  q.push({ id: 'habits', icon: '🔥', name: 'Complete 3 habits', sub: 'Mind · body · soul', have: habitsDone, need: 3, xp: 60, stat: 'soul', go: 'habits' });
  q[0].claimKey = op.per === 'week' ? 'out@' + weekStart() : null;
  q.push({ id: 'checkin', icon: '🌙', name: 'End-of-day check-in', sub: 'Where are we at today?', have: S.checkins[checkinDay()] ? 1 : 0, need: 1, xp: 0, stat: 'mind', checkin: true });
  return q;
}

export default function quests(root) {
  const t = today(), now = new Date();
  const blocks = blocksFor(now, activeClients());
  const cur = currentBlock(blocks, now), nxt = nextBlock(blocks, now);
  const claimed = S.quests.daily[t] || {};
  const dq = dailyQuests();
  const allClaimed = dq.every(q => isClaimed(q, claimed));
  const stages = ['Bootcamp', 'Proving Ground', 'Killer Case Study'];
  const stageIdx = stages.findIndex(s => S.quests.main.some(q => q.stage === s && !q.done));
  const curStage = stageIdx < 0 ? 'Complete' : stages[stageIdx];

  root.innerHTML = `
    ${!S.chests[t] ? `<button class="now-banner press" id="chest" style="width:100%;margin-bottom:12px;text-align:left"><span class="big">🎁</span><div class="grow"><b class="pix">Daily chest ready</b><div class="dim" style="font-size:13px">Tap to open</div></div></button>` : ''}
    <div class="now-banner">
      <span class="big">${cur ? cur.icon : '⏳'}</span>
      <div class="grow">
        <div class="dim" style="font-size:12px">${cur ? `Now until ${cur.e}` : nxt ? `Next at ${nxt.s}` : 'Day is done'}</div>
        <b class="pix" style="font-size:17px">${cur ? esc(cur.name) : nxt ? esc(nxt.name) : 'Rest. Tomorrow we hunt.'}</b>
      </div>
      ${cur && ['call', 'inperson', 'warm', 'leads'].includes(cur.kind) ? `<button class="btn small primary" id="gohunt">Go</button>` : ''}
    </div>

    <div class="sec-h"><div><h2>Daily quests</h2><p>${allClaimed ? 'Perfect day secured 💎' : 'Finish all five for a Perfect Day bonus'}</p></div></div>
    <div id="dq">${dq.map(q => {
      const done = q.have >= q.need, cl = isClaimed(q, claimed);
      return `<div class="q ${cl ? 'done' : ''}" data-q="${q.id}">
        <span class="qi">${q.icon}</span>
        <div class="grow"><div class="qt">${esc(q.name)}</div><div class="qs">${q.have}/${q.need} · ${esc(q.sub)}</div><div class="mini"><i style="width:${Math.min(100, (q.have / q.need) * 100)}%"></i></div></div>
        ${q.fulfil && !done ? `<button class="btn small" data-fulfil>+1h</button>` : ''}
        ${q.checkin && !done ? `<button class="btn small primary" data-checkin>Check in</button>` : ''}
        ${done && !cl && !q.checkin ? `<button class="btn small primary" data-claim="${q.id}">Claim</button>` : ''}
        ${cl || (q.checkin && done) ? `<span class="check on">✓</span>` : (!done && q.go ? `<button class="btn small ghost" data-go="${q.go}">Go</button>` : '')}
      </div>`;
    }).join('')}</div>

    <div class="sec-h"><div><h2>Today's battle plan</h2><p>Time blocks from the workshop</p></div></div>
    ${blocks.map(b => `<div class="q ${cur === b ? 'now' : ''}" style="border-left-color:${cur === b ? 'var(--gold)' : 'var(--line)'}">
      <span class="qi">${b.icon}</span><div class="grow"><div class="qt">${esc(b.name)}</div><div class="qs">${b.s} – ${b.e}</div></div></div>`).join('')}

    <div class="sec-h"><div><h2>Side quests</h2><p>One-off tasks you set yourself</p></div><button class="icon-btn" id="addq" aria-label="Add side quest">＋</button></div>
    <div id="side">${S.quests.custom.filter(q => !q.done || q.doneOn === t).map(q => `
      <div class="q ${q.done ? 'done' : ''}"><span class="qi">${esc(q.icon || '⚔️')}</span>
        <div class="grow"><div class="qt">${esc(q.name)}</div><div class="qs">${esc(q.diff)} · ${R.STATS.find(s => s.id === q.stat)?.name}</div></div>
        <span class="reward">+${DIFF[q.diff] || 20} XP</span>
        <button class="check ${q.done ? 'on' : ''}" data-side="${q.id}" aria-label="Complete">${q.done ? '✓' : ''}</button></div>`).join('') || `<div class="empty">No side quests. Add one: "Write cold email script", "Film a reel"…</div>`}</div>

    <div class="sec-h"><div><h2>Main quest line</h2><p>Current stage: <b class="gold">${curStage}</b></p></div></div>
    ${stages.map(stg => `
      <h3 style="margin:14px 2px 8px" class="${stg === curStage ? 'gold' : 'dim'}">${stg}</h3>
      ${S.quests.main.filter(q => q.stage === stg).map(q => `
        <div class="q ${q.boss ? 'boss' : ''} ${q.done ? 'done' : ''}"><span class="qi">${q.boss ? '👹' : '📜'}</span>
          <div class="grow"><div class="qt">${q.boss ? 'BOSS: ' : ''}${esc(q.name)}</div></div>
          <span class="reward">+${q.xp}</span>
          <button class="check ${q.done ? 'on' : ''}" data-main="${q.id}" aria-label="Complete">${q.done ? '✓' : ''}</button></div>`).join('')}`).join('')}
  `;

  $('#chest')?.addEventListener('click', openChest);
  $('#gohunt')?.addEventListener('click', () => go('hunt'));
  $$('[data-go]', root).forEach(b => b.onclick = () => go(b.dataset.go));
  $$('[data-claim]', root).forEach(b => b.onclick = e => {
    const d = today(), q = dailyQuests().find(x => x.id === b.dataset.claim);
    if (!q || q.have < q.need || isClaimed(q, S.quests.daily[d] || {})) return render();
    S.quests.daily[d] = { ...(S.quests.daily[d] || {}), [q.id]: true };
    if (q.claimKey) S.quests.daily[q.claimKey] = true;
    award({ stat: q.stat, xp: q.xp, type: 'daily', meta: q.id, at: pt(e), gold: 15 });
    perfectDayCheck(); render();
  });
  $$('[data-fulfil]', root).forEach(b => b.onclick = e => {
    dayCounters(today()).fulfil++;
    award({ stat: 'craft', xp: 25, type: 'fulfil', at: pt(e) });
    render();
  });
  $$('[data-checkin]', root).forEach(b => b.onclick = checkin);
  $('#addq').onclick = addSide;
  $$('[data-side]', root).forEach(b => b.onclick = e => {
    const q = S.quests.custom.find(x => x.id === b.dataset.side);
    if (q.done) return;
    q.done = true; q.doneOn = today();
    award({ stat: q.stat, xp: DIFF[q.diff] || 20, type: 'side', meta: q.name, at: pt(e) });
    render();
  });
  $$('[data-main]', root).forEach(b => b.onclick = e => {
    const q = S.quests.main.find(x => x.id === b.dataset.main);
    if (q.done) { if (confirm('Mark this quest as not done? Its XP stays.')) { q.done = false; persist(); render(); } return; }
    q.done = true;
    if (q.awarded) { persist(); return render(); }
    q.awarded = true;
    award({ stat: q.stage === 'Bootcamp' ? 'craft' : 'hustle', xp: q.xp, type: 'main', meta: q.id, at: pt(e), gems: q.boss ? 5 : 1 });
    if (q.boss) { fx.beep('boss'); setTimeout(() => fx.bigMoment('BOSS DEFEATED', `${q.name} · +5 💎`, '👹'), 400); }
    const stg = q.stage;
    if (S.quests.main.filter(x => x.stage === stg).every(x => x.done)) setTimeout(() => fx.bigMoment('STAGE CLEARED', `${stg} complete`, '🏰'), q.boss ? 2500 : 400);
    render();
  });
}

function perfectDayCheck() {
  const t = today(), cl = S.quests.daily[t] || {};
  const dq = dailyQuests();
  if (!cl.perfect && dq.every(q => isClaimed(q, cl) || (q.checkin && q.have))) {
    cl.perfect = true; S.quests.daily[t] = cl;
    award({ stat: 'soul', xp: 100, type: 'perfect', gems: 2, noCombo: true });
    setTimeout(() => fx.bigMoment('PERFECT DAY', '+100 XP · +2 💎', '🌟'), 500);
  }
}

function openChest() {
  const t = today();
  if (S.chests[t]) return;
  openSheet(`<div style="text-align:center;padding:20px 0"><div class="chest" id="ch">🎁</div><p class="pix" id="cht">Tap the chest</p></div>`, sh => {
    $('#ch', sh).onclick = () => {
      if (S.chests[t]) return;
      S.chests[t] = true;
      const roll = Math.random();
      const gold = 20 + Math.floor(Math.random() * 60) + (roll > .9 ? 150 : 0);
      const gems = roll > .75 ? 1 + (roll > .95 ? 2 : 0) : 0;
      S.gold += gold; S.gems += gems; persist(); renderHud();
      $('#ch', sh).style.animation = 'none'; $('#ch', sh).textContent = roll > .9 ? '💰' : '✨';
      $('#cht', sh).innerHTML = `${roll > .9 ? 'JACKPOT! ' : ''}+${gold} 🪙 ${gems ? `+${gems} 💎` : ''}`;
      fx.beep(roll > .9 ? 'level' : 'crit'); fx.confetti(roll > .9 ? 200 : 60); fx.buzz([30, 40, 60]);
      setTimeout(() => { closeSheet(); render(); }, 1600);
    };
  });
}

function addSide() {
  openSheet(`
    <h2>New side quest</h2>
    <label>Quest</label><input id="sq-n" placeholder="e.g. Write cold email script">
    <label>Stat it trains</label><select id="sq-s">${R.STATS.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}</select>
    <label>Difficulty</label><select id="sq-d">${Object.entries(DIFF).map(([k, v]) => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${k} (+${v} XP)</option>`).join('')}</select>
    <button class="btn primary block" id="sq-go" style="margin-top:16px">Add quest</button>`, sh => {
    $('#sq-go', sh).onclick = () => {
      const name = $('#sq-n', sh).value.trim(); if (!name) return fx.toast('Name the quest first.');
      S.quests.custom.unshift({ id: uid(), name, stat: $('#sq-s', sh).value, diff: $('#sq-d', sh).value, done: false, created: today() });
      persist(); closeSheet(); render();
    };
  });
}

// a check-in after midnight (before 4am) still belongs to the day that just ended
export const checkinDay = () => new Date().getHours() < 4 ? R.addDays(today(), -1) : today();
export function checkin() {
  const t = checkinDay(), c = dayCounters(t), op = outreachProgress();
  openSheet(`
    <h2>🌙 Check-in</h2>
    <p class="dim">Today: ${op.done}/${op.amount} outreach · ${c.leads} leads · ${c.booked} calls booked</p>
    <label>Wins today</label><textarea id="ci-w" rows="2"></textarea>
    <label>What went wrong / lesson</label><textarea id="ci-l" rows="2" data-nofocus="1"></textarea>
    <label>Tomorrow's top 3</label><textarea id="ci-t" rows="3" data-nofocus="1"></textarea>
    <label>Rate your day</label>
    <div class="opts" style="grid-template-columns:repeat(5,1fr)" id="ci-r">${[1, 2, 3, 4, 5].map(n => `<button class="btn" data-r="${n}">${'⭐'.repeat(1)}${n}</button>`).join('')}</div>
    <button class="btn primary block" id="ci-go" style="margin-top:16px">Save check-in</button>`, sh => {
    let rating = 3;
    sh.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { rating = +b.dataset.r; sh.querySelectorAll('[data-r]').forEach(x => x.style.borderColor = +x.dataset.r === rating ? 'var(--gold)' : ''); });
    $('#ci-go', sh).onclick = e => {
      S.checkins[t] = { wins: $('#ci-w', sh).value, lessons: $('#ci-l', sh).value, tomorrow: $('#ci-t', sh).value, rating };
      if (S.checkins[t].tomorrow.trim()) {
        const tm = R.addDays(t, 1);
        S.checkins[t].tomorrow.split('\n').map(s => s.replace(/^\s*[-\d.)]+\s*/, '').trim()).filter(Boolean).slice(0, 3)
          .forEach(name => S.quests.custom.push({ id: uid(), name, stat: 'hustle', diff: 'medium', done: false, created: tm, icon: '🎯' }));
      }
      S.hp = Math.min(10, S.hp + 2);
      S.quests.daily[t] = { ...(S.quests.daily[t] || {}), checkin: true };
      closeSheet();
      award({ stat: 'mind', xp: 60, type: 'checkin', at: pt(e), gems: 1, noCombo: true });
      perfectDayCheck(); render();
    };
  });
}
