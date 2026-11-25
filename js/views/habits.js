import { S, R, $, $$, esc, award, openSheet, closeSheet, today, persist, render, fx, pt, uid, weekStart } from '../app.js';

const step = h => h.step || (h.target <= 8 ? 1 : h.target >= 1000 ? 1000 : Math.max(5, Math.round(h.target / 3 / 5) * 5));
const doneDates = h => Object.keys(h.log).filter(d => h.log[d] >= h.target);
const color = stat => R.STATS.find(s => s.id === stat)?.color || '#ffc83d';

export default function habits(root) {
  const t = today(), ws = weekStart(t);
  const days = Array.from({ length: 7 }, (_, i) => R.addDays(ws, i));
  const pctOn = d => S.habits.length ? Math.round(S.habits.filter(h => (h.log[d] || 0) >= h.target).length / S.habits.length * 100) : 0;
  const groups = R.STATS.filter(s => S.habits.some(h => h.stat === s.id));

  root.innerHTML = `
    <div class="card week">${days.map((d, i) => `<div class="${d === t ? 'today' : ''}"><div class="d">${'MTWTFSS'[i]}</div><div class="c" style="--p:${pctOn(d)}"><span>${+d.slice(8)}</span></div></div>`).join('')}</div>
    <div class="sec-h"><div><h2>Habits</h2><p>Train mind, body and soul daily</p></div><button class="icon-btn" id="addh" aria-label="Add habit">＋</button></div>
    ${groups.map(g => `
      <h3 style="margin:14px 2px 8px;color:${g.color}">${g.icon} ${g.name}</h3>
      ${S.habits.filter(h => h.stat === g.id).map(h => {
        const v = h.log[t] || 0, full = v >= h.target, st = R.streak(doneDates(h), t);
        return `<div class="habit ${full ? 'full' : ''}" style="--c:${color(h.stat)}">
          <span class="hi">${esc(h.icon)}</span>
          <div class="grow" data-edit="${h.id}">
            <div style="font-weight:500">${esc(h.name)}</div>
            <div class="row" style="gap:8px;font-size:12px"><span class="dim">${v.toLocaleString('en')}/${h.target.toLocaleString('en')} ${esc(h.unit)}</span>${st.current ? `<span class="flame">🔥${st.current}</span>` : ''}</div>
            <div class="mini" style="height:5px;background:#0f0c22;border-radius:3px;margin-top:5px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, v / h.target * 100)}%;background:${color(h.stat)}"></i></div>
          </div>
          <button class="plus" data-plus="${h.id}" aria-label="Add ${step(h)} ${esc(h.unit)}">${full ? '✓' : '+'}</button>
        </div>`;
      }).join('')}`).join('') || '<div class="empty">No habits yet. Add one.</div>'}
    <p class="dim" style="font-size:12px;margin-top:14px">Tap ＋ to add progress · tap a habit name to edit it or log an exact amount.</p>`;

  $('#addh').onclick = () => editHabit();
  $$('[data-edit]', root).forEach(d => d.onclick = () => editHabit(S.habits.find(h => h.id === d.dataset.edit)));
  $$('[data-plus]', root).forEach(b => b.onclick = e => {
    const h = S.habits.find(x => x.id === b.dataset.plus);
    if ((h.log[today()] || 0) >= h.target) { fx.beep('tick'); return; }
    addProgress(h, step(h), e);
  });
}

function addProgress(h, n, e) {
  const t = today(), before = h.log[t] || 0;
  h.log[t] = Math.max(0, before + n);
  h.awarded = h.awarded || {};
  if (before < h.target && h.log[t] >= h.target && !h.awarded[t]) {
    h.awarded[t] = true;
    const st = R.streak(doneDates(h), t).current;
    const bonus = st >= 30 ? 3 : st >= 7 ? 2 : 1;
    award({ stat: h.stat, xp: h.xp * bonus, type: 'habit', meta: h.id, at: pt(e) });
    if ([7, 21, 30, 66, 100].includes(st)) setTimeout(() => fx.bigMoment(`${st}-DAY STREAK`, `${h.name} · XP ×${bonus}`, '🔥'), 400);
  } else { fx.beep('tick'); fx.buzz(8); persist(); }
  render();
}

function editHabit(h) {
  const isNew = !h;
  h = h || { id: uid(), name: '', icon: '⭐', stat: 'mind', target: 1, unit: 'times', xp: 15, log: {} };
  const t = today();
  openSheet(`
    <h2>${isNew ? 'New habit' : esc(h.name)}</h2>
    ${isNew ? '' : `<label>Today's amount (${esc(h.unit)})</label><div class="row"><input id="h-today" type="number" inputmode="decimal" value="${h.log[t] || 0}" data-nofocus="1"><button class="btn" id="h-set">Set</button></div>`}
    <label>Name</label><input id="h-n" value="${esc(h.name)}" placeholder="e.g. Cold shower" ${isNew ? '' : 'data-nofocus="1"'}>
    <div class="opts">
      <div><label>Emoji</label><input id="h-i" value="${esc(h.icon)}" maxlength="4" data-nofocus="1"></div>
      <div><label>Stat</label><select id="h-s">${R.STATS.map(s => `<option value="${s.id}" ${s.id === h.stat ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('')}</select></div>
      <div><label>Daily target</label><input id="h-t" type="number" inputmode="decimal" value="${h.target}" data-nofocus="1"></div>
      <div><label>Unit</label><input id="h-u" value="${esc(h.unit)}" data-nofocus="1"></div>
    </div>
    <label>Difficulty</label><select id="h-x">${[[10, 'Easy'], [15, 'Normal'], [25, 'Hard'], [40, 'Brutal']].map(([v, l]) => `<option value="${v}" ${v === h.xp ? 'selected' : ''}>${l} (+${v} XP)</option>`).join('')}</select>
    <div class="opts" style="margin-top:16px">${isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn bad" id="h-del">Delete</button>'}<button class="btn primary" id="h-go">Save</button></div>`, sh => {
    $('#h-set', sh) && ($('#h-set', sh).onclick = e => { const v = parseFloat($('#h-today', sh).value) || 0; closeSheet(); addProgress(h, v - (h.log[t] || 0), e); });
    $('#h-go', sh).onclick = () => {
      const name = $('#h-n', sh).value.trim(); if (!name) return fx.toast('Name the habit first.');
      Object.assign(h, { name, icon: $('#h-i', sh).value.trim() || '⭐', stat: $('#h-s', sh).value, target: Math.max(1, parseFloat($('#h-t', sh).value) || 1), unit: $('#h-u', sh).value.trim() || 'times', xp: +$('#h-x', sh).value });
      delete h.step;
      if (isNew) S.habits.push(h);
      persist(); closeSheet(); render();
    };
    $('#h-del', sh) && ($('#h-del', sh).onclick = () => { if (confirm(`Delete "${h.name}" and its history?`)) { S.habits = S.habits.filter(x => x.id !== h.id); persist(); closeSheet(); render(); } });
  });
}
