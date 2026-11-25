import { S, R, $, $$, esc, money, award, unaward, openSheet, closeSheet, today, persist, render, fx, pt, renderHud, uid, dayCounters, outreachProgress, activeClients, weekStart } from '../app.js';
import { KCS_QUESTIONS } from '../state.js';
import { logPayment } from './hero.js';

export const ACTIONS = [
  { k: 'call', icon: '📞', label: 'Cold call', xp: 5 },
  { k: 'inperson', icon: '🚪', label: 'Walk-in', xp: 10 },
  { k: 'email', icon: '📧', label: 'Cold email', xp: 2 },
  { k: 'dm', icon: '💬', label: 'DM', xp: 2 },
  { k: 'warm', icon: '🤝', label: 'Warm msg', xp: 4 },
  { k: 'leads', icon: '🗂️', label: 'Lead found', xp: 2 },
];
const OUTCOMES = [
  { k: 'none', icon: '📵', label: 'No answer', xp: 3, status: 'new' },
  { k: 'no', icon: '🙅', label: 'Not interested', xp: 6, status: 'dead' },
  { k: 'callback', icon: '🔁', label: 'Call back', xp: 10, status: 'callback' },
  { k: 'booked', icon: '📅', label: 'Booked a call!', xp: 100, status: 'booked' },
];

let seg = 'out';
export default function hunt(root) {
  root.innerHTML = `
    <div class="seg" style="margin-bottom:14px">
      <button data-seg="out" class="${seg === 'out' ? 'on' : ''}">Outreach</button>
      <button data-seg="leads" class="${seg === 'leads' ? 'on' : ''}">Leads (${S.leads.filter(l => l.status !== 'dead').length})</button>
      <button data-seg="clients" class="${seg === 'clients' ? 'on' : ''}">Clients (${activeClients()})</button>
    </div><div id="seg"></div>`;
  $$('[data-seg]', root).forEach(b => b.onclick = () => { seg = b.dataset.seg; render(); });
  ({ out: outreach, leads, clients })[seg]($('#seg', root));
}

// ---------------- outreach ----------------
function outreach(el) {
  const c = dayCounters(), op = outreachProgress();
  const p = Math.min(1, op.done / op.amount), C = 2 * Math.PI * 50;
  el.innerHTML = `
    <div class="card target">
      <div class="ring"><svg width="118" height="118" viewBox="0 0 118 118"><circle cx="59" cy="59" r="50" stroke="#0f0c22" stroke-width="12" fill="none"/>
        <circle cx="59" cy="59" r="50" stroke="${p >= 1 ? '#5fe0a8' : '#ffc83d'}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" style="transition:stroke-dashoffset .5s"/></svg>
        <div class="rv"><b>${op.done}</b><small>of ${op.amount}/${op.per}</small></div></div>
      <div class="grow">
        <h3>${p >= 1 ? 'Target smashed 💥' : `${op.amount - op.done} to go`}</h3>
        <p class="dim" style="font-size:13px;margin:4px 0 0">${activeClients()} active client${activeClients() === 1 ? '' : 's'} → ${op.amount} outreaches per ${op.per}. ${activeClients() < 4 ? 'Every client you sign lowers it by 100.' : 'You have 4+ clients: maintenance mode.'}</p>
      </div>
    </div>
    <div class="sec-h"><div><h2>Log it</h2><p>Tap each time. Fast taps build a combo.</p></div></div>
    <div class="taps">${ACTIONS.map(a => `
      <button class="tap" data-a="${a.k}"><span class="te">${a.icon}</span><span class="tn">${c[a.k]}</span><span class="tl">${a.label}</span>${c[a.k] ? `<span class="undo" data-undo="${a.k}" role="button" aria-label="Undo">↺</span>` : ''}</button>`).join('')}
    </div>
    <div class="opts" style="margin-top:10px">
      <button class="btn" id="plus10">⚡ +10 batch</button>
      <button class="btn primary" id="book">📅 Booked a call</button>
    </div>
    <p class="dim" style="font-size:12px;margin-top:14px">Tip: call from the Leads tab — the app logs the dial and asks how it went when you come back.</p>`;

  $$('[data-a]', el).forEach(b => b.onclick = e => {
    if (e.target.dataset.undo) {
      const k = e.target.dataset.undo, cc = dayCounters();
      if (cc[k] > 0) { cc[k]--; unaward(k); persist(); fx.beep('tick'); render(); }
      return;
    }
    hit(b.dataset.a, 1, e);
  });
  $('#plus10', el).onclick = () => openSheet(`<h2>Log a batch</h2><p class="dim">Sent a batch of emails or DMs? Log them all at once.</p>
    <div class="opts">${ACTIONS.map(a => `<button class="btn" data-b="${a.k}">${a.icon} +10 ${a.label}</button>`).join('')}</div>`, sh =>
    $$('[data-b]', sh).forEach(b => b.onclick = e => { closeSheet(); hit(b.dataset.b, 10, e); }));
  $('#book', el).onclick = e => bookCall(null, e);
}

function hit(k, n, e) {
  const before = outreachProgress();
  dayCounters()[k] += n;
  const a = ACTIONS.find(x => x.k === k);
  award({ stat: 'hustle', xp: a.xp * n, type: k, n, at: pt(e) });
  const after = outreachProgress();
  const tk = 'target@' + (after.per === 'week' ? weekStart() : today());
  if (before.done < before.amount && after.done >= after.amount && !S.quests.daily[tk]) {
    S.quests.daily[tk] = true;
    award({ stat: 'hustle', xp: 200, type: 'target', gems: 2, noCombo: true });
    fx.beep('boss'); setTimeout(() => fx.bigMoment('TARGET SMASHED', `${after.amount} outreaches · +2 💎`, '💥'), 500);
  }
  render();
}

// ---------------- discovery calls ----------------
const gcalDate = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
export function bookCall(lead, e) {
  const tm = new Date(Date.now() + 86400000); tm.setHours(10, 0, 0, 0);
  const local = new Date(tm.getTime() - tm.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  openSheet(`
    <h2>📅 Discovery call booked</h2>
    <label>With</label><input id="bk-n" value="${esc(lead?.name || '')}" placeholder="Business / person" ${lead ? 'data-nofocus="1"' : ''}>
    <label>When</label><input id="bk-t" type="datetime-local" value="${local}">
    <label>Length</label><select id="bk-l"><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select>
    <p class="dim" style="font-size:13px">After saving, Google Calendar opens so your phone reminds you before the call.</p>
    <button class="btn primary block" id="bk-go">Save + add to calendar</button>`, sh => {
    $('#bk-go', sh).onclick = ev => {
      const name = $('#bk-n', sh).value.trim() || 'Prospect';
      const start = new Date($('#bk-t', sh).value || tm), end = new Date(start.getTime() + +$('#bk-l', sh).value * 60000);
      dayCounters().booked++;
      if (lead) { lead.status = 'booked'; lead.callAt = start.getTime(); }
      closeSheet();
      award({ stat: 'hustle', xp: 100, type: 'booked', at: pt(ev) || pt(e), gems: 1 });
      fx.beep('level'); fx.confetti(80);
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Discovery call · ' + name)}&dates=${gcalDate(start)}/${gcalDate(end)}&details=${encodeURIComponent('Booked via Hustle Quest' + (lead?.phone ? '\nPhone: ' + lead.phone : ''))}`;
      window.open(url, '_blank');
      render();
    };
  });
}

// ---------------- leads ----------------
let leadFilter = 'open';
function leads(el) {
  const order = { callback: 0, new: 1, booked: 2, dead: 3 };
  const list = S.leads.filter(l => leadFilter === 'all' || (leadFilter === 'open' ? !['dead', 'booked'].includes(l.status) : l.status === leadFilter))
    .sort((a, b) => order[a.status] - order[b.status] || (a.last || 0) - (b.last || 0));
  el.innerHTML = `
    <div class="row" style="gap:8px">
      <select id="lf" style="flex:1">${[['open', 'To call'], ['callback', 'Call backs'], ['booked', 'Booked'], ['dead', 'Not interested'], ['all', 'All']].map(([k, v]) => `<option value="${k}" ${k === leadFilter ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <button class="btn primary" id="addl">＋ Lead</button>
    </div>
    <div style="margin-top:12px">${list.map(l => `
      <div class="lead">
        <div class="grow" data-edit="${l.id}">
          <div class="row" style="gap:6px"><b>${esc(l.name)}</b><span class="tag ${esc(l.status)}">${l.status === 'new' ? `${l.attempts || 0} tries` : l.status}</span></div>
          <div class="dim" style="font-size:12px">${esc(l.niche || '')} ${l.phone ? '· ' + esc(l.phone) : ''}</div>
          ${l.note ? `<div style="font-size:12px;margin-top:2px">${esc(l.note)}</div>` : ''}
        </div>
        ${l.phone ? `<a class="call-btn" href="tel:${esc(l.phone.replace(/[^\d+]/g, ''))}" data-call="${l.id}" aria-label="Call ${esc(l.name)}">📞</a>` : `<button class="call-btn" style="background:var(--panel2);color:var(--text)" data-log="${l.id}" aria-label="Log result">✓</button>`}
      </div>`).join('') || `<div class="empty">No leads here. Gather 20 tonight: Google Maps → local businesses → add them with their phone number.</div>`}</div>`;
  $('#lf', el).onchange = e => { leadFilter = e.target.value; render(); };
  $('#addl', el).onclick = () => editLead();
  $$('[data-edit]', el).forEach(d => d.onclick = () => editLead(S.leads.find(l => l.id === d.dataset.edit)));
  $$('[data-call]', el).forEach(a => a.onclick = () => { S.pendingCall = { leadId: a.dataset.call, t: Date.now() }; persist(); });
  $$('[data-log]', el).forEach(b => b.onclick = () => { S.pendingCall = { leadId: b.dataset.log, t: 0 }; askCallOutcome(); });
}

function editLead(l) {
  const isNew = !l;
  l = l || { id: uid(), name: '', phone: '', niche: '', note: '', status: 'new', attempts: 0 };
  openSheet(`
    <h2>${isNew ? 'New lead' : 'Edit lead'}</h2>
    <label>Business</label><input id="l-n" value="${esc(l.name)}" placeholder="e.g. Pizzeria Roma Galați">
    <label>Phone</label><input id="l-p" type="tel" value="${esc(l.phone)}" placeholder="+40 7xx xxx xxx" data-nofocus="1">
    <label>Niche / city</label><input id="l-c" value="${esc(l.niche)}" placeholder="Restaurant · Brăila" data-nofocus="1">
    <label>Notes</label><textarea id="l-o" rows="2" data-nofocus="1">${esc(l.note)}</textarea>
    <label>Status</label><select id="l-s">${['new', 'callback', 'booked', 'dead'].map(s => `<option ${s === l.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <div class="opts" style="margin-top:16px">${isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn bad" id="l-del">Delete</button>'}<button class="btn primary" id="l-go">Save</button></div>`, sh => {
    $('#l-go', sh).onclick = e => {
      const name = $('#l-n', sh).value.trim(); if (!name) return fx.toast('Add the business name.');
      Object.assign(l, { name, phone: $('#l-p', sh).value.trim(), niche: $('#l-c', sh).value.trim(), note: $('#l-o', sh).value.trim(), status: $('#l-s', sh).value });
      if (isNew) { S.leads.unshift(l); dayCounters().leads++; closeSheet(); award({ stat: 'hustle', xp: 2, type: 'leads', at: pt(e) }); }
      else { persist(); closeSheet(); }
      render();
    };
    $('#l-del', sh) && ($('#l-del', sh).onclick = () => { if (confirm('Delete this lead?')) { S.leads = S.leads.filter(x => x.id !== l.id); persist(); closeSheet(); render(); } });
  });
}

export function askCallOutcome() {
  const pc = S.pendingCall; if (!pc) return;
  const l = S.leads.find(x => x.id === pc.leadId);
  S.pendingCall = null; persist();
  if (!l) return;
  openSheet(`
    <h2>How did it go?</h2>
    <p class="dim">${esc(l.name)}</p>
    <div class="opts">${OUTCOMES.map(o => `<button class="btn" data-o="${o.k}" style="min-height:64px;flex-direction:column;gap:2px"><span style="font-size:22px">${o.icon}</span>${o.label}</button>`).join('')}</div>
    <label>Note (optional)</label><input id="oc-n" data-nofocus="1" placeholder="Owner back Friday 10am">
    <button class="btn ghost block" data-close style="margin-top:8px">Didn't call</button>`, sh => {
    $$('[data-o]', sh).forEach(b => b.onclick = e => {
      const o = OUTCOMES.find(x => x.k === b.dataset.o);
      const note = $('#oc-n', sh).value.trim();
      l.attempts = (l.attempts || 0) + 1; l.last = Date.now(); if (note) l.note = note;
      if (o.k !== 'booked') l.status = o.status;
      dayCounters().call++;
      closeSheet();
      award({ stat: 'hustle', xp: o.k === 'booked' ? 5 : o.xp, type: 'call', at: pt(e) });
      if (o.k === 'booked') bookCall(l, e); else render();
    });
  });
}

// ---------------- clients ----------------
function clients(el) {
  const now = Date.now();
  const list = S.clients.slice().sort((a, b) => (b.active - a.active) || (b.signed - a.signed));
  el.innerHTML = `
    <div class="row between"><p class="dim" style="margin:0;font-size:13px">Launch within 7 days. 4h/day fulfillment.</p><button class="btn primary" id="addc">＋ Client</button></div>
    <div style="margin-top:12px">${list.map(c => {
      const deadline = c.signed + 7 * 86400000, left = Math.ceil((deadline - now) / 86400000);
      const kcsN = (c.kcs || []).filter(Boolean).length;
      return `<div class="card" style="margin-bottom:10px;${c.active ? '' : 'opacity:.6'}">
        <div class="row between"><h3>${esc(c.name)}</h3><span class="pix gold">${money(c.value || 0)}</span></div>
        <div class="dim" style="font-size:12px;margin-top:2px">${c.active ? 'Active' : 'Finished'} · signed ${new Date(c.signed).toLocaleDateString('en-GB')}</div>
        ${c.active && !c.launched ? `<div class="q ${left < 0 ? 'boss' : ''}" style="margin-top:10px"><span class="qi">🚀</span><div class="grow"><div class="qt">Launch ${left >= 0 ? `in ${left} day${left === 1 ? '' : 's'}` : `${-left} days LATE`}</div><div class="qs">Workshop rule: launch within one week</div></div><button class="btn small primary" data-launch="${c.id}">Launched</button></div>` : ''}
        <div class="q" style="margin-top:8px"><span class="qi">🏆</span><div class="grow"><div class="qt">Killer case study</div><div class="mini"><i style="width:${kcsN / 8 * 100}%"></i></div><div class="qs">${kcsN}/8 answered${kcsN === 8 ? ' · upsell them now!' : ''}</div></div><button class="btn small" data-kcs="${c.id}">Map</button></div>
        <div class="opts" style="margin-top:8px"><button class="btn small" data-pay="${c.id}">💶 Payment</button><button class="btn small" data-end="${c.id}">${c.active ? '🏁 End project' : '↩️ Reactivate'}</button></div>
      </div>`;
    }).join('') || `<div class="empty">No clients yet. Your first one is a boss fight 👹 — every 100 dials gets you closer.</div>`}</div>
    <div class="sec-h"><div><h2>Project math</h2><p>What to charge the next client</p></div></div>
    <div class="card" id="pm"></div>`;
  $('#addc', el).onclick = addClient;
  $$('[data-launch]', el).forEach(b => b.onclick = e => {
    const c = S.clients.find(x => x.id === b.dataset.launch); c.launched = Date.now();
    const onTime = c.launched <= c.signed + 7 * 86400000;
    award({ stat: 'craft', xp: onTime ? 300 : 120, type: 'launch', at: pt(e), gems: onTime ? 2 : 0 });
    const q = S.quests.main.find(x => x.id === 'pg6'); if (q && !q.done && onTime) { q.done = true; q.awarded = true; }
    if (onTime) setTimeout(() => fx.bigMoment('LAUNCHED ON TIME', `${c.name} is live · +2 💎`, '🚀'), 400);
    render();
  });
  $$('[data-kcs]', el).forEach(b => b.onclick = () => kcs(S.clients.find(x => x.id === b.dataset.kcs)));
  $$('[data-pay]', el).forEach(b => b.onclick = () => { logPayment(); setTimeout(() => { const s = $('#p-cl'); if (s) s.value = b.dataset.pay; }, 50); });
  $$('[data-end]', el).forEach(b => b.onclick = () => { const c = S.clients.find(x => x.id === b.dataset.end); c.active = !c.active; persist(); render(); });
  projectMath($('#pm', el));
}

function addClient() {
  openSheet(`
    <h2>🤝 New client</h2>
    <label>Client name</label><input id="c-n" placeholder="Business name">
    <label>Deal value (${esc(S.profile.currency.trim())})</label><input id="c-v" type="number" inputmode="decimal" placeholder="e.g. 1000" data-nofocus="1">
    <p class="dim" style="font-size:13px">Your daily outreach target drops by 100. Launch countdown starts now: 7 days.</p>
    <button class="btn primary block" id="c-go">Sign client</button>`, sh => {
    $('#c-go', sh).onclick = e => {
      const name = $('#c-n', sh).value.trim(); if (!name) return fx.toast('Add the client name.');
      const first = S.clients.length === 0;
      S.clients.unshift({ id: uid(), name, value: parseFloat($('#c-v', sh).value) || 0, signed: Date.now(), active: true, launched: null, kcs: Array(8).fill('') });
      closeSheet();
      award({ stat: 'hustle', xp: 400, type: 'client', at: pt(e), gems: 3, noCombo: true });
      if (first) { const q = S.quests.main.find(x => x.id === 'pg5'); if (q) { q.done = true; q.awarded = true; } }
      if (activeClients() >= 4) { const q = S.quests.main.find(x => x.id === 'kc5'); if (q) { q.done = true; q.awarded = true; } }
      persist(); fx.beep('boss');
      setTimeout(() => fx.bigMoment(first ? 'FIRST CLIENT!' : 'CLIENT SIGNED', `${name} · +3 💎 · launch within 7 days`, first ? '👹' : '🤝'), 400);
      render();
    };
  });
}

function kcs(c) {
  c.kcs = c.kcs || Array(8).fill('');
  openSheet(`
    <h2>🏆 KCS: ${esc(c.name)}</h2>
    <p class="dim" style="font-size:13px">Answer all 8 and you have a killer case study to sell with.</p>
    ${KCS_QUESTIONS.map((q, i) => `<label>${i + 1}. ${esc(q)}</label><textarea data-k="${i}" rows="2" data-nofocus="1">${esc(c.kcs[i])}</textarea>`).join('')}
    <button class="btn primary block" id="k-go" style="margin-top:16px">Save</button>`, sh => {
    $('#k-go', sh).onclick = e => {
      const before = c.kcs.filter(Boolean).length;
      $$('[data-k]', sh).forEach(t => c.kcs[+t.dataset.k] = t.value.trim());
      const after = c.kcs.filter(Boolean).length;
      closeSheet();
      if (after > before) award({ stat: 'craft', xp: (after - before) * 20, type: 'kcs', at: pt(e) });
      if (after === 8 && before < 8) {
        const q = S.quests.main.find(x => x.id === 'kc1'); if (q && !q.done) { q.done = true; q.awarded = true; }
        persist(); setTimeout(() => fx.bigMoment('KCS MAPPED', 'Upsell this client now, then start KCS outreach.', '🏆'), 400);
      }
      persist(); render();
    };
  });
}

function projectMath(el) {
  const p = S.pricing;
  const draw = () => {
    const base = p.hours * p.rate;
    const price = Math.round(base / (1 - Math.min(90, p.margin) / 100));
    $('#pm-out', el).innerHTML = `Charge at least <b class="gold pix" style="font-size:20px">${money(price)}</b><br><span class="dim" style="font-size:12px">${p.hours}h × ${money(p.rate)}/h = ${money(base)} of your time + ${p.margin}% margin${+p.adSpend ? ` · client's ad budget ${money(+p.adSpend)} on top` : ''}</span>`;
  };
  el.innerHTML = `
    <div class="opts">
      <div><label>Hours the KCS project took</label><input type="number" inputmode="decimal" data-p="hours" value="${p.hours}"></div>
      <div><label>Your hourly rate (${esc(S.profile.currency.trim())})</label><input type="number" inputmode="decimal" data-p="rate" value="${p.rate}"></div>
      <div><label>Client ad spend</label><input type="number" inputmode="decimal" data-p="adSpend" value="${p.adSpend}"></div>
      <div><label>Profit margin %</label><input type="number" inputmode="decimal" data-p="margin" value="${p.margin}"></div>
    </div>
    <p id="pm-out" style="margin:12px 0 0"></p>`;
  $$('[data-p]', el).forEach(i => i.oninput = () => { p[i.dataset.p] = Math.max(0, parseFloat(i.value) || 0); persist(); draw(); });
  draw();
}
