import { S, R, $, esc, money, award, openSheet, closeSheet, statDates, statXp, activeDates, today, persist, render, fx, pt, renderHud, uid } from '../app.js';
import { drawHero } from '../sprite.js';

let anim;
export default function hero(root) {
  const rk = R.rankFromRevenue(S.revenue), L = R.levelFromXp(S.xp);
  const t = today();
  const st = R.streak(activeDates(), t);
  const next = rk.next;
  const pct = next ? ((S.revenue - R.RANKS[rk.index].min) / (next.min - R.RANKS[rk.index].min)) * 100 : 100;
  const stats = R.STATS.map(s => ({ ...s, c: R.consistency(statDates(s.id), t), lv: R.levelFromXp(statXp(s.id) * 2).level }));
  const overall = Math.round(stats.reduce((a, s) => a + s.c, 0) / stats.length);

  root.innerHTML = `
    <div class="stage" id="stage">
      <div class="stars">${Array.from({ length: 18 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 50}%;animation-delay:${Math.random() * 3}s"></i>`).join('')}</div>
      <span class="rank-badge">${rk.title}</span>
      <span class="lvl-badge">Lv ${L.level}</span>
      <canvas id="herocv"></canvas>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="row between"><h3>Broke → Wealthy</h3><span class="pix gold">${money(S.revenue)}</span></div>
      <div class="ladder">${R.RANKS.map((r, i) => `<div class="${i < rk.index ? 'got' : ''} ${i === rk.index ? 'cur' : ''}">${r.name}</div>`).join('')}</div>
      <div class="bar xp" style="margin-top:10px;height:14px"><i style="width:${Math.min(100, pct)}%;background:linear-gradient(#ffe08a,#e09a1c)"></i><b>${next ? `${money(next.min - S.revenue)} to ${next.name}` : 'Max rank reached'}</b></div>
      <button class="btn primary block" id="pay" style="margin-top:12px">💶 Log money in</button>
    </div>

    <div class="sec-h"><div><h2>Life stats</h2><p>Shape = how consistent you were over the last 14 days</p></div><span class="pix" style="font-size:22px">${overall}%</span></div>
    <div class="card">
      <div class="radar-wrap"><canvas id="radar" width="320" height="280" style="width:100%;max-width:320px"></canvas></div>
      ${stats.map(s => `<div class="statrow"><span>${s.icon}</span><span>${s.name} <small class="dim">Lv${s.lv}</small></span><div class="bar"><i style="width:${s.c}%;background:${s.color}"></i></div><span class="pix" style="text-align:right">${s.c}%</span></div>`).join('')}
    </div>

    <div class="kpis" style="margin-top:12px">
      <div class="kpi"><b>🔥${st.current}</b><span>day streak</span></div>
      <div class="kpi"><b>${st.best}</b><span>best streak</span></div>
      <div class="kpi"><b>${S.xp.toLocaleString('en')}</b><span>total XP</span></div>
    </div>`;

  const cv = $('#herocv');
  let f = 0;
  clearInterval(anim);
  const draw = () => { if (!document.body.contains(cv)) return clearInterval(anim); drawHero(cv, rk.index, f++, 8); cv.style.width = '168px'; cv.style.height = '224px'; };
  draw(); anim = setInterval(draw, 600);
  $('#stage').onclick = e => { fx.beep('tick'); fx.floatText(['Let\'s go!', 'Dial!', 'Money calls.', 'No days off', '100 a day!'][Math.random() * 5 | 0], e.clientX, e.clientY - 20, 'g'); };

  drawRadar($('#radar'), stats);
  $('#pay').onclick = logPayment;
}

function drawRadar(cv, stats) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 6, r = 96, n = stats.length;
  const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#3a3366'; g.lineWidth = 1;
  for (let k = 1; k <= 5; k++) {
    g.beginPath();
    for (let i = 0; i <= n; i++) { const a = ang(i % n), rr = (r * k) / 5; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.stroke();
  }
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r); g.stroke(); }
  g.beginPath();
  stats.forEach((s, i) => { const v = Math.max(4, s.c) / 100 * r; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(ang(i)) * v, cy + Math.sin(ang(i)) * v); });
  g.closePath(); g.fillStyle = 'rgba(239,74,74,.45)'; g.fill(); g.strokeStyle = '#ef4a4a'; g.lineWidth = 2; g.stroke();
  g.font = '600 13px Rubik, sans-serif'; g.fillStyle = '#f3e9d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  stats.forEach((s, i) => { const a = ang(i); g.fillText(s.name, cx + Math.cos(a) * (r + 24), cy + Math.sin(a) * (r + 16)); });
}

export function logPayment() {
  const opts = S.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  openSheet(`
    <h2>💶 Money in</h2>
    <p class="dim">Every euro moves your rank from Broke toward Wealthy.</p>
    <label>Amount (${esc(S.profile.currency.trim())})</label><input id="p-amt" type="number" inputmode="decimal" min="0" placeholder="e.g. 500">
    <label>From client</label><select id="p-cl"><option value="">— other —</option>${opts}</select>
    <button class="btn primary block" id="p-go" style="margin-top:16px">Collect</button>`, sh => {
    $('#p-go', sh).onclick = e => {
      const amt = parseFloat($('#p-amt', sh).value);
      if (!(amt > 0)) return fx.toast('Enter an amount above 0.');
      const before = R.rankFromRevenue(S.revenue).index;
      S.revenue += amt;
      S.payments.push({ id: uid(), t: Date.now(), amount: amt, client: $('#p-cl', sh).value || null });
      closeSheet();
      award({ stat: 'wealth', xp: Math.min(500, 20 + Math.round(amt / 10)), type: 'payment', meta: { amt }, at: pt(e), gold: Math.round(amt / 20) });
      const after = R.rankFromRevenue(S.revenue).index;
      if (after > before) { S.gems += 5; persist(); fx.beep('boss'); setTimeout(() => fx.bigMoment(`RANK UP: ${R.RANKS[after].name.toUpperCase()}`, `${R.RANKS[after].title} · new gear unlocked · +5 💎`, '👑'), 500); }
      renderHud(); render();
    };
  });
}
