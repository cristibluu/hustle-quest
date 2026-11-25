import { S, R, $, $$, esc, money, openSheet, closeSheet, today, persist, render, fx, uid, outreachOn, activeDates, ACHIEVEMENTS, OUTREACH, renderHud, weekStart } from '../app.js';

export default function stats(root) {
  const t = today();
  const last7 = Array.from({ length: 7 }, (_, i) => R.addDays(t, i - 6));
  const ws = weekStart(t);
  const wk = Array.from({ length: 7 }, (_, i) => R.addDays(ws, i));
  const weekXp = wk.reduce((a, d) => a + (S.days[d]?.xp || 0), 0);
  const weekOut = wk.reduce((a, d) => a + outreachOn(d), 0);
  const st = R.streak(activeDates(), t);
  const ost = R.streak(Object.keys(S.counters).filter(d => outreachOn(d) > 0), t);
  const cst = R.streak(Object.keys(S.checkins), t);
  const life = k => Object.values(S.counters).reduce((a, c) => a + (c[k] || 0), 0);
  const max7 = Math.max(10, ...last7.map(outreachOn));
  const booked = life('booked'), calls = life('call');

  // 15-week heatmap, columns = weeks starting Monday
  const hs = R.addDays(ws, -14 * 7);
  const heat = Array.from({ length: 15 * 7 }, (_, i) => R.addDays(hs, i));
  const maxXp = Math.max(50, ...heat.map(d => S.days[d]?.xp || 0));
  const lvl = x => x <= 0 ? 0 : Math.ceil((x / maxXp) * 4);
  const heatCol = ['var(--bg2)', '#2f5c57', '#3c8f85', '#46c4b3', '#7dfbe9'];

  root.innerHTML = `
    <div class="kpis">
      <div class="kpi"><b>${weekXp.toLocaleString('en')}</b><span>XP this week</span></div>
      <div class="kpi"><b>${weekOut}</b><span>outreach this week</span></div>
      <div class="kpi"><b>🔥${st.current}</b><span>active streak</span></div>
    </div>

    <div class="sec-h"><div><h2>Outreach, last 7 days</h2></div></div>
    <div class="card"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end;height:150px">
      ${last7.map(d => { const v = outreachOn(d); return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px"><span class="pix" style="font-size:12px">${v || ''}</span><div style="width:100%;border-radius:6px 6px 2px 2px;background:${d === t ? 'var(--gold)' : 'var(--xp)'};height:${Math.max(3, v / max7 * 110)}px"></div><span class="dim" style="font-size:11px">${'SMTWTFS'[new Date(d + 'T12:00').getDay()]}</span></div>`; }).join('')}
    </div></div>

    <div class="sec-h"><div><h2>Consistency map</h2><p>15 weeks · brighter = more XP that day</p></div></div>
    <div class="card"><div class="heat">${heat.map(d => `<i title="${d}" style="background:${d > t ? 'transparent' : heatCol[lvl(S.days[d]?.xp || 0)]}${d === t ? ';outline:2px solid var(--gold)' : ''}"></i>`).join('')}</div></div>

    <div class="sec-h"><div><h2>Streaks</h2></div></div>
    <div class="kpis">
      <div class="kpi"><b>${ost.current}<small class="dim">/${ost.best}</small></b><span>outreach days</span></div>
      <div class="kpi"><b>${cst.current}<small class="dim">/${cst.best}</small></b><span>check-ins</span></div>
      <div class="kpi"><b>${st.best}</b><span>best active</span></div>
    </div>

    <div class="sec-h"><div><h2>Lifetime</h2></div></div>
    <div class="kpis">
      <div class="kpi"><b>${calls}</b><span>📞 calls</span></div>
      <div class="kpi"><b>${life('inperson')}</b><span>🚪 walk-ins</span></div>
      <div class="kpi"><b>${life('email') + life('dm')}</b><span>📧 emails + DMs</span></div>
      <div class="kpi"><b>${life('warm')}</b><span>🤝 warm</span></div>
      <div class="kpi"><b>${booked}</b><span>📅 booked</span></div>
      <div class="kpi"><b>${calls ? (booked / calls * 100).toFixed(1) : 0}%</b><span>call → booked</span></div>
      <div class="kpi"><b>${S.clients.length}</b><span>🤝 clients</span></div>
      <div class="kpi"><b>${money(S.revenue)}</b><span>💶 earned</span></div>
      <div class="kpi"><b>${life('leads')}</b><span>🗂️ leads</span></div>
    </div>

    <div class="sec-h"><div><h2>Achievements</h2><p>${Object.keys(S.achievements).length}/${ACHIEVEMENTS.length} unlocked · +2 💎 each</p></div></div>
    <div class="ach">${ACHIEVEMENTS.map(a => `<div class="${S.achievements[a.id] ? 'got' : ''}"><b>${a.icon}</b>${esc(a.name)}</div>`).join('')}</div>

    <div class="sec-h"><div><h2>Reward shop</h2><p>Spend gold on real-life treats you set</p></div><button class="icon-btn" id="adds" aria-label="Add reward">＋</button></div>
    ${S.shop.map(s => `<div class="shop-i"><span style="font-size:26px">${s.icon}</span><div class="grow"><b>${esc(s.name)}</b><div class="dim" style="font-size:12px">${S.bought.filter(b => b.id === s.id).length}× claimed</div></div>
      <button class="btn small ${S.gold >= s.cost ? 'primary' : ''}" data-buy="${s.id}" ${S.gold >= s.cost ? '' : 'disabled'}>🪙 ${s.cost}</button>
      <button class="btn small ghost" data-dels="${s.id}" aria-label="Remove reward">✕</button></div>`).join('')}

    ${Object.keys(S.checkins).length ? `<div class="sec-h"><div><h2>Journal</h2><p>Your end-of-day check-ins</p></div></div>
    ${Object.entries(S.checkins).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).map(([d, c]) => `<div class="card flat" style="margin-bottom:8px"><div class="row between"><b>${d}</b><span>${'⭐'.repeat(c.rating || 0)}</span></div>${c.wins ? `<p style="margin:6px 0 0;font-size:13px">🏆 ${esc(c.wins)}</p>` : ''}${c.lessons ? `<p style="margin:4px 0 0;font-size:13px" class="dim">📝 ${esc(c.lessons)}</p>` : ''}</div>`).join('')}` : ''}
  `;

  $$('[data-buy]', root).forEach(b => b.onclick = () => {
    const s = S.shop.find(x => x.id === b.dataset.buy);
    if (S.gold < s.cost) return;
    S.gold -= s.cost; S.bought.push({ id: s.id, t: Date.now() });
    persist(); renderHud(); fx.beep('level'); fx.confetti(60);
    fx.bigMoment('REWARD CLAIMED', `${s.icon} ${s.name} — enjoy it, you earned it.`, '🎁');
    render();
  });
  $$('[data-dels]', root).forEach(b => b.onclick = () => { if (confirm('Remove this reward?')) { S.shop = S.shop.filter(x => x.id !== b.dataset.dels); persist(); render(); } });
  $('#adds').onclick = () => openSheet(`
    <h2>New reward</h2>
    <label>Reward</label><input id="r-n" placeholder="e.g. New sneakers">
    <div class="opts"><div><label>Emoji</label><input id="r-i" value="🎁" data-nofocus="1"></div><div><label>Gold cost</label><input id="r-c" type="number" inputmode="numeric" value="500" data-nofocus="1"></div></div>
    <button class="btn primary block" id="r-go" style="margin-top:16px">Add to shop</button>`, sh => {
    $('#r-go', sh).onclick = () => {
      const name = $('#r-n', sh).value.trim(); if (!name) return fx.toast('Name the reward.');
      S.shop.push({ id: uid(), name, icon: $('#r-i', sh).value.trim() || '🎁', cost: Math.max(1, parseInt($('#r-c', sh).value) || 100) });
      persist(); closeSheet(); render();
    };
  });
}
