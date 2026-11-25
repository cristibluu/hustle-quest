// Feedback effects: floats, toasts, confetti, sound, vibration.
const $ = s => document.querySelector(s);
let prefs = { sound: true, vibrate: true };
export const setFxPrefs = p => { prefs = { ...prefs, ...p }; };

export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function floatText(text, x, y, cls = '') {
  const el = document.createElement('div');
  el.className = 'float ' + cls; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

export function floatReward(r, x = innerWidth / 2, y = innerHeight / 2) {
  if (r.crit) floatText('CRIT!', x, y - 34, 'crit');
  floatText(`+${r.xp} XP`, x, y);
  if (r.gold) setTimeout(() => floatText(`+${r.gold} 🪙`, x + 30, y + 10, 'g'), 120);
}

// ---- sound (tiny chiptune via WebAudio) ----
let ctx;
function tone(freq, start, dur, type = 'square', vol = 0.06) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.02);
}
export function beep(kind = 'coin') {
  if (!prefs.sound) return;
  try {
    if (kind === 'coin') { tone(988, 0, .08); tone(1319, .07, .18); }
    else if (kind === 'crit') { tone(660, 0, .06); tone(990, .05, .06); tone(1320, .1, .2); }
    else if (kind === 'level') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .09, .22, 'square', .07));
    else if (kind === 'boss') [196, 247, 294, 392, 494, 587, 784].forEach((f, i) => tone(f, i * .08, .3, 'sawtooth', .05));
    else if (kind === 'tick') tone(440, 0, .04, 'triangle', .05);
    else if (kind === 'bad') { tone(220, 0, .15, 'sawtooth'); tone(160, .12, .25, 'sawtooth'); }
  } catch { /* audio blocked */ }
}
export function buzz(pattern = 15) { if (prefs.vibrate && navigator.vibrate) navigator.vibrate(pattern); }

// ---- confetti ----
// One shared particle loop; stops and clears itself when every particle has fallen off screen.
let parts = [], running = false;
export function confetti(n = 140) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'), g = c.getContext('2d');
  if (c.width !== innerWidth || c.height !== innerHeight) { c.width = innerWidth; c.height = innerHeight; }
  const cols = ['#ffc83d', '#46d6c4', '#ef4a4a', '#7fd4ff', '#c89bff', '#5fe0a8'];
  for (let i = 0; i < n; i++) parts.push({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .45,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4, s: 4 + Math.random() * 5,
    c: cols[Math.random() * cols.length | 0], born: performance.now(),
  });
  if (running) return;
  running = true;
  (function step(now) {
    g.clearRect(0, 0, c.width, c.height);
    parts = parts.filter(p => p.y < c.height + 20 && now - p.born < 4000);
    parts.forEach(p => { p.vy += .45; p.x += p.vx; p.y += p.vy; p.vx *= .99; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s); });
    if (parts.length) requestAnimationFrame(step); else { g.clearRect(0, 0, c.width, c.height); running = false; }
  })(performance.now());
}

export function bigMoment(title, sub, emoji = '⭐') {
  const el = document.createElement('div');
  el.className = 'levelup';
  el.innerHTML = `<div style="font-size:64px"></div><h1></h1><p></p><p class="dim" style="margin-top:24px">Tap to continue</p>`;
  el.children[0].textContent = emoji; el.children[1].textContent = title; el.children[2].textContent = sub;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  confetti(); buzz([40, 60, 40, 60, 120]);
  setTimeout(() => el.remove(), 5000);
}
