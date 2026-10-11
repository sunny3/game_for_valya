'use strict';
// Дим Димыч хочет в туалет — страшилка-квест по задумке Вали.
// One canvas, logical 480x320, everything drawn and voiced in code.
(() => {
const W = 480, H = 320, S = 2;
const TOP = 44, DOOR_Y = (TOP + H - 10) / 2;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = W * S; cv.height = H * S;
const shade = document.createElement('canvas');
shade.width = W * S; shade.height = H * S;
const sctx = shade.getContext('2d');

const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.body.classList.add('touch-on');
function fit() {
  const portrait = innerHeight > innerWidth;
  // On a phone held upright the joystick and ✋ live under the picture, not over it.
  const availH = TOUCH && portrait ? innerHeight - 190 : innerHeight;
  const s = Math.min(innerWidth / W, availH / H);
  document.body.classList.toggle('portrait', TOUCH && portrait);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit);
fit();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- progress
const store = {
  get() { try { return +localStorage.getItem('valya_game_room') || 0; } catch (e) { return 0; } },
  set(v) { try { localStorage.setItem('valya_game_room', String(v)); } catch (e) { /* private mode */ } },
};

// ---------- audio
const muteEl = document.getElementById('mute');
const Snd = {
  ac: null, out: null, muted: false,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ac = new AC();
      this.out = this.ac.createGain();
      this.out.gain.value = this.muted ? 0 : 0.35;
      this.out.connect(this.ac.destination);
      this.drone();
    } catch (e) { this.ac = null; }
  },
  toggle() {
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 0.35;
    muteEl.textContent = this.muted ? '🔇' : '🔊';
  },
  env(g, t, a, d, v) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  },
  tone(f, dur, type = 'sine', v = 0.2, f2 = null, delay = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    this.env(g, t, 0.01, dur, v);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, freq, q, v, delay = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const n = Math.floor(this.ac.sampleRate * dur);
    const b = this.ac.createBuffer(1, n, this.ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ac.createBufferSource(); s.buffer = b;
    const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ac.createGain();
    this.env(g, t, dur * 0.3, dur * 0.7, v);
    s.connect(f).connect(g).connect(this.out);
    s.start(t);
  },
  drone() {
    const g = this.ac.createGain(); g.gain.value = 0.05; g.connect(this.out);
    [55, 55.6, 82.4].forEach(f => { const o = this.ac.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); });
  },
  step() { this.noise(0.06, 300, 1, 0.06); },
  cry() { for (let i = 0; i < 3; i++) this.tone(620 - i * 40, 0.45, 'triangle', 0.07, 420 - i * 40, i * 0.5); },
  whisper() { this.noise(0.5, 2600, 3, 0.25); this.noise(0.45, 1900, 3, 0.2, 0.55); },
  chime() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, null, i * 0.1)); },
  hurt() { this.tone(150, 0.25, 'square', 0.1, 60); },
  ahh() { this.tone(700, 0.6, 'sawtooth', 0.05, 480); },
  pad(i) { this.tone([330, 392, 440, 523][i], 0.25, 'sine', 0.16); },
  fire() { this.noise(0.3, 600, 0.8, 0.12); },
  blip() { this.tone(880, 0.06, 'square', 0.04); },
  laugh() { for (let i = 0; i < 4; i++) this.tone(500 + (i % 2) * 120, 0.12, 'triangle', 0.06, null, i * 0.13); },
  flush() { this.noise(1.8, 500, 0.5, 0.3); this.tone(300, 1.2, 'sine', 0.05, 90); },
};
muteEl.addEventListener('click', () => { Snd.init(); Snd.toggle(); });

// ---------- input
const keys = {}, pressed = {};
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', Space: 'act', Enter: 'act', KeyE: 'act', KeyM: 'mute' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); Snd.init();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
const take = k => { if (pressed[k]) { pressed[k] = false; return true; } return false; };
const joy = { x: 0, y: 0 };
function axis() {
  let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.x;
  let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.y;
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return { x, y };
}
let tap = null;
cv.addEventListener('pointerdown', e => {
  Snd.init();
  const r = cv.getBoundingClientRect();
  tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
});
const joyEl = document.getElementById('joy'), knob = document.getElementById('knob');
let joyId = null, jc = { x: 0, y: 0 };
function moveJoy(e) {
  const R = 45;
  let dx = e.clientX - jc.x, dy = e.clientY - jc.y;
  const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy.x = Math.abs(dx) > 8 ? dx / R : 0;
  joy.y = Math.abs(dy) > 8 ? dy / R : 0;
}
joyEl.addEventListener('pointerdown', e => {
  Snd.init(); joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId);
  const r = joyEl.getBoundingClientRect();
  jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  moveJoy(e);
});
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) moveJoy(e); });
const endJoy = e => { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
joyEl.addEventListener('pointerup', endJoy);
joyEl.addEventListener('pointercancel', endJoy);
document.getElementById('act').addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); pressed.act = true; });

// ---------- state
const G = { state: 'title', room: 0, hearts: 3, maxHearts: 3, flash: false, t: 0, enc: null, endT: 0 };
const P = { x: 36, y: DOOR_Y, dir: 1, walk: 0, inv: 0, moving: false, stepT: 0 };
let shakeT = 0, banner = { text: '', t: 0 };

// ---------- dialogue
const COLORS = { 'Дим Димыч': '#8fd3ff', 'Димон': '#ffcc33', 'Нолик': '#5aa8ff', 'Симка': '#ff9a3c',
  'Файер': '#ff5a5a', 'Кусачка': '#c98bff', 'Папа': '#86e08a', 'Мама': '#ff9ad0', 'Дедус': '#b9c4b0' };
const D = { queue: [], cur: null, shown: 0, choice: null, sel: 0, optRects: [] };
const dialogActive = () => !!(D.cur || D.choice);
function nextLine() {
  while (D.queue.length) {
    const it = D.queue.shift();
    if (it.fn) { it.fn(); if (D.cur || D.choice) return; continue; }
    D.cur = it; D.shown = 0; return;
  }
  D.cur = null;
}
function say(lines, cb) {
  D.queue.push(...lines.map(l => ({ who: l[0], text: l[1] })));
  if (cb) D.queue.push({ fn: cb });
  if (!D.cur && !D.choice) nextLine();
}
function choose(who, text, opts, cb) { D.cur = null; D.choice = { who, text, opts, cb }; D.sel = 0; }
function resetDialog() { D.queue = []; D.cur = null; D.choice = null; }
function updDialog(dt) {
  if (D.cur) {
    D.shown += dt * 50;
    if (take('act') || tap) {
      tap = null;
      if (D.shown < D.cur.text.length) D.shown = D.cur.text.length; else nextLine();
    }
  } else if (D.choice) {
    const n = D.choice.opts.length;
    if (take('up')) D.sel = (D.sel + n - 1) % n;
    if (take('down')) D.sel = (D.sel + 1) % n;
    let p = take('act') ? D.sel : -1;
    if (tap) {
      D.optRects.forEach((r, i) => { if (tap.y >= r.y && tap.y < r.y + r.h) p = i; });
      tap = null;
    }
    if (p >= 0) {
      const c = D.choice; D.choice = null;
      c.cb(p);
      if (!D.cur && !D.choice) nextLine();
    }
  }
}
function wrap(text, maxW) {
  const lines = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function drawDialog() {
  if (!dialogActive()) return;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  const it = D.cur || D.choice;
  const lines = wrap(it.text, W - 48);
  const optLines = D.choice ? D.choice.opts.map(o => wrap(o, W - 70)) : [];
  const nOpt = optLines.reduce((s, l) => s + l.length, 0);
  const h = 30 + 14 * lines.length + (D.choice ? 6 + 14 * nOpt : 0);
  const y = H - h - 6;
  ctx.fillStyle = 'rgba(14,10,30,.93)'; rr(8, y, W - 16, h, 8); ctx.fill();
  ctx.strokeStyle = '#8a7fd0'; ctx.lineWidth = 1.5; ctx.stroke();
  let ty = y + 14;
  if (it.who) {
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = COLORS[it.who] || '#ddd';
    ctx.fillText(it.who, 20, ty);
  }
  ty += 14;
  ctx.font = (it.who ? '' : 'italic ') + '11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#f4f0ff';
  let n = D.cur ? D.shown | 0 : 1e9;
  for (const l of lines) { ctx.fillText(l.slice(0, Math.max(0, n)), 22, ty); n -= l.length + 1; ty += 14; }
  if (D.cur && D.shown >= D.cur.text.length && (G.t * 2 | 0) % 2) { ctx.fillStyle = '#b6a8ff'; ctx.fillText('▼', W - 30, y + h - 8); }
  if (D.choice) {
    ty += 4; D.optRects = [];
    optLines.forEach((ol, i) => {
      const r = { y: ty - 11, h: 14 * ol.length };
      if (i === D.sel) { ctx.fillStyle = '#5b46c9aa'; rr(18, r.y, W - 36, r.h, 4); ctx.fill(); }
      ctx.fillStyle = i === D.sel ? '#fff' : '#cfc8ef';
      ol.forEach((l, j) => ctx.fillText((j ? '   ' : '▶ ') + l, 24, ty + j * 14));
      D.optRects.push(r); ty += r.h;
    });
  }
}

// ---------- drawing helpers
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function heart(x, y, s, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}
function tickBub(e, dt) { if (e.bub) { e.bub.t -= dt; if (e.bub.t <= 0) e.bub = null; } }
function drawBubble(e, dy = -30) {
  if (!e.bub) return;
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  const tw = ctx.measureText(e.bub.text).width;
  const bx = clamp(e.x - tw / 2 - 5, 4, W - tw - 14), by = e.y + dy - 12;
  ctx.globalAlpha = Math.min(1, e.bub.t * 3);
  ctx.fillStyle = '#f4f0ff'; rr(bx, by, tw + 10, 14, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(e.x - 3, by + 14); ctx.lineTo(e.x + 3, by + 14); ctx.lineTo(e.x, by + 19); ctx.fill();
  ctx.fillStyle = '#221a3a'; ctx.fillText(e.bub.text, bx + 5, by + 10);
  ctx.globalAlpha = 1;
}
function drawActHint(x, y) {
  const b = Math.sin(G.t * 6) * 2;
  ctx.fillStyle = '#ffcc33'; rr(x - 9, y - 9 + b, 18, 14, 4); ctx.fill();
  ctx.font = '9px sans-serif'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
  ctx.fillText('✋', x, y + 1 + b); ctx.textAlign = 'left';
}

// Fixie: round body, little legs and arms, kind-specific hair. Evil = glowing white eyes.
function drawFixie(x, y, o) {
  const t = G.t, ph = o.ph || 0, bob = Math.sin(t * 4 + ph) * 1.5, sc = o.s || 1;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ell(0, 15 * sc, 10 * sc, 3 * sc);
  if (o.shake) ctx.translate((Math.random() - 0.5) * o.shake, (Math.random() - 0.5) * o.shake);
  ctx.translate(0, bob); ctx.scale(sc, sc);
  const c = o.color;
  ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const aw = Math.sin(t * 6 + ph) * 3;
  ctx.beginPath();
  ctx.moveTo(-4, 8); ctx.lineTo(-5, 14); ctx.moveTo(4, 8); ctx.lineTo(5, 14);
  ctx.moveTo(-10, 1); ctx.lineTo(-15, 6 + aw); ctx.moveTo(10, 1); ctx.lineTo(15, 6 - aw);
  ctx.stroke();
  ctx.strokeStyle = o.hair || c; ctx.lineWidth = 2.5;
  if (o.kind === 'nolik') {
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-6, -20, -2, -24);
    ctx.moveTo(0, -10); ctx.quadraticCurveTo(3, -22, 7, -22); ctx.stroke();
  } else if (o.kind === 'simka') {
    ctx.fillStyle = o.hair; ell(-12, -7, 4, 5); ell(12, -7, 4, 5);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-2, -20, 3, -22); ctx.stroke();
  } else if (o.kind === 'fire') {
    const g = ctx.createLinearGradient(0, -26, 0, -8);
    g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#ff3b1f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, -6);
    for (let i = -2; i <= 2; i++) {
      ctx.lineTo(i * 4 - 2, -12);
      ctx.lineTo(i * 4, -18 - 5 * Math.abs(Math.sin(t * 10 + i)));
    }
    ctx.lineTo(9, -6); ctx.fill();
  } else if (o.kind === 'kusachka') {
    ctx.strokeStyle = '#9aa0b5'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-3, -10); ctx.quadraticCurveTo(-10, -20, -4, -26);
    ctx.moveTo(3, -10); ctx.quadraticCurveTo(10, -20, 4, -26); ctx.stroke();
  } else if (o.kind === 'dedus') {
    ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-4, -18, 1, -21); ctx.stroke();
  }
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ell(-4, -5, 4, 3);
  if (o.kind === 'dedus') { ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(0, 20, 8, 3); ctx.fill(); }
  if (o.evil) {
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff';
    ell(-4, -2, 3, 3.5); ell(4, -2, 3, 3.5); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.5; ctx.beginPath();
    if (o.kind === 'nolik' || o.kind === 'simka') { ctx.moveTo(-7, -6); ctx.lineTo(-2, -8); ctx.moveTo(7, -6); ctx.lineTo(2, -8); }
    else if (o.kind !== 'kusachka') { ctx.moveTo(-7, -8); ctx.lineTo(-1, -5); ctx.moveTo(7, -8); ctx.lineTo(1, -5); }
    else { ctx.moveTo(-7, -6); ctx.lineTo(-1, -6); ctx.moveTo(7, -6); ctx.lineTo(1, -6); }
    ctx.stroke();
    ctx.beginPath();
    if (o.kind === 'nolik') { ctx.arc(0, 8, 4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = '#9fd4ff'; ell(-5, 2 + (t * 18 % 9), 1.2, 1.8); ell(5, 2 + ((t * 18 + 4) % 9), 1.2, 1.8); }
    else if (o.kind === 'simka') { ctx.moveTo(-5, 5); for (let i = -4; i <= 5; i += 2) ctx.lineTo(i, 5 + (i % 4 ? 1.5 : -1.5)); ctx.stroke(); }
    else if (o.kind === 'fire') { ctx.fillStyle = '#fff'; ctx.fillRect(-5, 3, 10, 4); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, 5); for (let i = -4; i <= 5; i += 2) ctx.lineTo(i, i % 4 ? 3 : 7); ctx.stroke(); }
    else if (o.kind === 'kusachka') { ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-3, 5, 2, 2); ctx.fillRect(1, 5, 2, 2); }
    else if (o.kind === 'dedus') { ctx.arc(0, 6, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-2.5, 9); ctx.lineTo(-1, 3); ctx.moveTo(1, 3); ctx.lineTo(2.5, 9); ctx.lineTo(4, 3); ctx.fill(); }
  } else {
    ctx.fillStyle = '#fff'; ell(-4, -2, 3, 3.5); ell(4, -2, 3, 3.5);
    const lx = clamp((P.x - x) / 60, -1, 1);
    ctx.fillStyle = '#111'; ell(-4 + lx, -1.5, 1.5, 2); ell(4 + lx, -1.5, 1.5, 2);
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 3, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  ctx.restore();
}

// Human: o = {shirt, pants, hair, skin, s, dir, walk, dress, longHair, helmet, glasses, pyj, beard}
function drawHuman(x, y, o) {
  const s = o.s || 1;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ell(0, 13 * s, 8 * s, 2.5 * s);
  ctx.scale(s * (o.dir || 1), s);
  const w = o.walk ? Math.sin(o.walk) * 2.5 : 0;
  ctx.fillStyle = o.pants;
  ctx.fillRect(-4 + w * 0.4, 4, 3, 9); ctx.fillRect(1 - w * 0.4, 4, 3, 9);
  if (o.longHair) { ctx.fillStyle = o.hair; ctx.fillRect(-6, -12, 12, 11); }
  ctx.fillStyle = o.shirt;
  if (o.dress) { ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(8, 9); ctx.lineTo(-8, 9); ctx.fill(); }
  else { rr(-5, -5, 10, 11, 2); ctx.fill(); }
  ctx.fillRect(-7, -4, 2, 8 - w * 0.5); ctx.fillRect(5, -4, 2, 8 + w * 0.5);
  if (o.pyj) { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -3; i <= 3; i += 3) { ctx.moveTo(i, -4); ctx.lineTo(i, 5); } ctx.stroke(); }
  if (o.vest) { ctx.fillStyle = '#ff8a1f'; ctx.fillRect(-5, -5, 3, 11); ctx.fillRect(2, -5, 3, 11);
    ctx.fillStyle = '#e8ff5a'; ctx.fillRect(-5, 1, 10, 1.5); }
  ctx.fillStyle = o.skin || '#f2c6a0'; ctx.beginPath(); ctx.arc(0, -10, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, -11, 5.4, Math.PI, 0); ctx.fill();
  if (o.helmet) { ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(0, -12, 6, Math.PI, 0); ctx.fill(); ctx.fillRect(-7, -12.5, 14, 2); }
  ctx.fillStyle = '#222'; ctx.fillRect(-0.5, -10.5, 1.2, 1.6); ctx.fillRect(2.3, -10.5, 1.2, 1.6);
  if (o.glasses) { ctx.strokeStyle = '#222'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0.1, -9.8, 1.8, 0, 7); ctx.moveTo(4.7, -9.8); ctx.arc(2.9, -9.8, 1.8, 0, 7); ctx.stroke(); }
  if (o.beard) { ctx.fillStyle = o.hair; ctx.fillRect(-3, -7, 7, 2.5); }
  if (o.smile) { ctx.strokeStyle = '#7a3b2a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(1.4, -7.8, 1.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.restore();
}
const LOOK = {
  dim: { shirt: '#5aa0e6', pants: '#3d6fb0', hair: '#6b3b1a', pyj: true },
  dimon: { shirt: '#3b4a5e', pants: '#2a3340', hair: '#3a2a1a', helmet: true, vest: true },
  papa: { shirt: '#3f8f5a', pants: '#3b3b55', hair: '#2b2b2b', glasses: true, beard: true, s: 1.25 },
  mama: { shirt: '#e0609a', pants: '#f2c6a0', hair: '#b5652d', dress: true, longHair: true, s: 1.15, smile: true },
};
function drawPlayer() {
  if (P.inv > 0 && (G.t * 20 | 0) % 2) return;
  drawHuman(P.x, P.y, { ...LOOK.dim, dir: P.dir, walk: P.moving ? P.walk : 0, smile: G.state === 'ending' });
}

// ---------- rooms: floor, walls, doors, darkness
function drawFloorWalls(floor, wall) {
  ctx.fillStyle = floor; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let y = TOP + 14; y < H; y += 14) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, TOP);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 7, TOP);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, TOP - 4, W, 4);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(0, 0, 10, H); ctx.fillRect(W - 10, 0, 10, H); ctx.fillRect(0, H - 10, W, 10);
}
function drawDoor(open, toilet) {
  const y = DOOR_Y - 24;
  // the door we came from
  ctx.fillStyle = '#3a2614'; ctx.fillRect(0, y, 10, 48);
  if (open) {
    const g = ctx.createLinearGradient(W - 12, 0, W, 0);
    g.addColorStop(0, '#1a1208'); g.addColorStop(1, toilet ? '#fffbe0' : '#ffd98a');
    ctx.fillStyle = g; ctx.fillRect(W - 12, y, 12, 48);
    ctx.fillStyle = '#ffd98a'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('→', W - 28 + Math.sin(G.t * 5) * 2, DOOR_Y + 4);
  } else {
    ctx.fillStyle = '#6b4423'; ctx.fillRect(W - 12, y, 12, 48);
    ctx.fillStyle = '#d4a017'; ctx.fillRect(W - 10, DOOR_Y - 3, 5, 6);
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W - 7.5, DOOR_Y - 4, 2, Math.PI, 0); ctx.stroke();
  }
  if (toilet) { ctx.fillStyle = '#9fe0ff'; ctx.fillRect(W - 44, TOP - 30, 30, 16); ctx.fillStyle = '#035';
    ctx.font = 'bold 10px sans-serif'; ctx.fillText('WC', W - 37, TOP - 18); }
}
function drawDark(r, lights) {
  sctx.setTransform(S, 0, 0, S, 0, 0);
  sctx.globalCompositeOperation = 'source-over';
  sctx.clearRect(0, 0, W, H);
  sctx.fillStyle = 'rgba(2,0,8,0.95)'; sctx.fillRect(0, 0, W, H);
  sctx.globalCompositeOperation = 'destination-out';
  for (const L of [{ x: P.x, y: P.y, r }, ...(lights || [])]) {
    const g = sctx.createRadialGradient(L.x, L.y, L.r * 0.25, L.x, L.y, L.r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = g; sctx.beginPath(); sctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); sctx.fill();
  }
  ctx.drawImage(shade, 0, 0, W, H);
}
function furniture(x, y, w, h, c, top) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 3, y + h - 2, w, 5);
  ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = top || 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w, 4);
}
function frame(x, y, w, h) { ctx.fillStyle = '#5a4120'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#2a3a4a'; ctx.fillRect(x, y, w, h); }

// ---------- encounters
const near = (e, d = 36) => dist(e, P) < d;
const ROOMS = [
  { name: 'Коридор', floor: '#3b3352', wall: '#2c2442', dim: true,
    hint: 'Это Нолик. Ему очень грустно. Убегать бесполезно — подойди и помоги ему (пробел, E или ✋).',
    deco() { frame(90, 12, 22, 16); frame(300, 10, 26, 18); ctx.fillStyle = '#5a2a3a'; ctx.fillRect(140, 150, 200, 54); },
    make: () => ({
      x: 360, y: 140, evil: true, cryT: 1, li: 0, bub: null, done: false,
      update(dt) {
        tickBub(this, dt);
        if (!this.evil) return;
        const d = dist(this, P);
        if (d > 40) { this.x += (P.x - this.x) / d * 50 * dt; this.y += (P.y - this.y) / d * 50 * dt; }
        this.cryT -= dt;
        if (this.cryT <= 0) {
          this.cryT = 3.2; Snd.cry();
          this.bub = { text: ['стой, спаси меня, не убегай', '*плачет*', 'не убегай...'][this.li++ % 3], t: 2.5 };
        }
      },
      draw() {
        drawFixie(this.x, this.y, { color: '#3d8bff', hair: '#2a5fb8', kind: 'nolik', evil: this.evil });
        drawBubble(this);
        if (this.evil && near(this)) drawActHint(this.x, this.y - 32);
      },
      action() {
        if (!this.evil || !near(this)) return;
        say([['Нолик', '*всхлип* Все от меня убегают... Мне так грустно и одиноко.'],
          ['Дим Димыч', 'Я не убегу. Иди сюда, я тебя обниму.']], () => {
          this.evil = false; this.bub = null; Snd.chime();
          say([['Нолик', 'спасибо...'], ['Нолик', 'Мне стало легче. Дверь открыта — беги!']], () => { this.done = true; });
        });
      },
    }),
  },
  { name: 'Кухня', floor: '#4a3f2e', wall: '#3a4a3a', dim: true,
    hint: 'Симке тревожно. Подойди к ней — она попросит повторять за ней. Это успокаивает.',
    deco() { furniture(30, 8, 34, 44, '#d8dde0'); furniture(380, 18, 60, 28, '#7a6a5a'); ctx.fillStyle = '#222'; ell(395, 25, 6, 3); ell(420, 25, 6, 3); },
    make: () => {
      const PADS = [{ x: W / 2, y: 112, a: '▲' }, { x: W / 2 - 42, y: 152, a: '◀' }, { x: W / 2 + 42, y: 152, a: '▶' }, { x: W / 2, y: 192, a: '▼' }];
      return {
        x: 300, y: 130, mode: 'idle', evil: true, bub: null, shake: 2, lockMove: false, done: false,
        round: 0, seq: [], phase: '', i: 0, t: 1, lit: -1, litT: 0,
        newRound() { this.seq = Array.from({ length: 3 + this.round }, () => Math.random() * 4 | 0); this.phase = 'show'; this.i = 0; this.t = 1.2; },
        update(dt) {
          tickBub(this, dt);
          this.shake = Math.max(this.evil ? 1.5 : 0, this.shake - dt * 3);
          if (this.mode === 'idle') {
            this.t -= dt;
            if (this.t <= 0) { this.t = 3; this.bub = { text: pick(['мне плохо...', 'ой-ой-ой...', 'а вдруг что-то случится?']), t: 2 }; }
            return;
          }
          if (this.mode !== 'game') return;
          this.litT -= dt; if (this.litT <= 0) this.lit = -1;
          if (this.phase === 'show') {
            this.t -= dt;
            if (this.t <= 0) {
              if (this.i < this.seq.length) { this.lit = this.seq[this.i++]; this.litT = 0.4; Snd.pad(this.lit); this.t = 0.65; }
              else { this.phase = 'input'; this.i = 0; this.bub = { text: 'теперь ты!', t: 1.5 }; }
            }
            return;
          }
          let k = -1;
          ['up', 'left', 'right', 'down'].forEach((d, j) => { if (take(d)) k = j; });
          if (tap) PADS.forEach((p, j) => { if (Math.abs(tap.x - p.x) < 20 && Math.abs(tap.y - p.y) < 20) k = j; });
          if (k < 0) return;
          this.lit = k; this.litT = 0.25; Snd.pad(k);
          if (k !== this.seq[this.i]) {
            Snd.ahh(); this.bub = { text: 'ааа!', t: 1.5 }; this.shake = 6;
            this.phase = 'show'; this.i = 0; this.t = 1.4;
            return;
          }
          if (++this.i < this.seq.length) return;
          if (++this.round < 3) { this.bub = { text: 'ещё раз!', t: 1.2 }; this.newRound(); return; }
          this.mode = 'calm'; this.evil = false; this.lockMove = false; Snd.chime();
          say([['Симка', 'Ух... мне уже лучше.'], ['Симка', 'Когда делаешь одно и то же вместе — не так страшно. Спасибо!']], () => { this.done = true; });
        },
        draw() {
          drawFixie(this.x, this.y, { color: '#ff8a1f', hair: '#c45f00', kind: 'simka', evil: this.evil, shake: this.shake });
          drawBubble(this);
          if (this.mode === 'idle' && near(this)) drawActHint(this.x, this.y - 32);
          if (this.mode !== 'game') return;
          PADS.forEach((p, j) => {
            ctx.fillStyle = this.lit === j ? '#ffd27a' : 'rgba(255,170,80,.25)';
            rr(p.x - 16, p.y - 16, 32, 32, 6); ctx.fill();
            ctx.strokeStyle = '#ffb35a'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = this.lit === j ? '#3a1a00' : '#ffd9b0'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(p.a, p.x, p.y + 5); ctx.textAlign = 'left';
          });
          ctx.fillStyle = '#ffd9b0'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`Раунд ${this.round + 1} из 3 — ${this.phase === 'show' ? 'смотри!' : 'повторяй стрелками!'}`, W / 2, 232);
          ctx.textAlign = 'left';
        },
        action() {
          if (this.mode !== 'idle' || !near(this)) return;
          say([['Симка', 'мне плохо... мне очень-очень тревожно.'],
            ['Симка', 'стой! мы будем делать одно и то же. Повторяй за мной, ладно?'],
            ['Димон', 'Смотри, какие кнопки загораются, и повторяй стрелками (или нажимай на кнопки).']], () => {
            this.mode = 'game'; this.lockMove = true; this.x = W / 2 + 110; this.y = 120;
            P.x = W / 2 - 110; P.y = 160; this.round = 0; this.newRound();
          });
        },
      };
    },
  },
  { name: 'Гостиная', floor: '#40303a', wall: '#4a2a2a', dim: true,
    hint: 'Файер в ярости! Уворачивайся от огня, пока его злость не закончится.',
    deco() { furniture(40, 10, 70, 30, '#6a3a4a'); furniture(250, 6, 46, 30, '#151515', '#333'); ctx.fillStyle = '#2a6a2a'; ell(440, 30, 10, 12); },
    make: () => ({
      x: 400, y: DOOR_Y, mode: 'wait', evil: true, anger: 1, balls: [], shootT: 1.5, bub: null, done: false,
      start() { this.mode = 'fight'; this.bub = { text: 'ты никуда не убежишь!', t: 2.5 }; },
      update(dt) {
        tickBub(this, dt);
        if (this.mode === 'calm') { this.y += (TOP + 30 - this.y) * dt * 2; return; }
        if (this.mode !== 'fight') return;
        this.anger -= dt / 20;
        this.y = DOOR_Y + Math.sin(G.t * 1.3) * 80;
        this.shootT -= dt;
        if (this.shootT <= 0) {
          this.shootT = 0.4 + 0.8 * this.anger;
          const a = Math.atan2(P.y - this.y, P.x - this.x);
          Snd.fire();
          this.balls.push({ x: this.x - 10, y: this.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110 });
          if (Math.random() < 0.3) this.bub = { text: pick(['ты никуда не убежишь!', 'у тебя ничего не получится!', 'РРРРР!']), t: 1.8 };
        }
        for (const b of this.balls) {
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (dist(b, P) < 10) { b.dead = true; hurt(); }
          if (b.x < 10 || b.x > W || b.y < TOP - 10 || b.y > H) b.dead = true;
        }
        this.balls = this.balls.filter(b => !b.dead);
        if (this.anger <= 0) {
          this.mode = 'calm'; this.evil = false; this.balls = [];
          say([['Файер', 'я злой... я просто злой.'], ['Файер', 'Я так устал злиться...'],
            ['Дим Димыч', 'Злиться — это нормально. Но не всё же время.'], ['Файер', '...Ладно. Проходи.']], () => { this.done = true; Snd.chime(); });
        }
      },
      draw() {
        for (const b of this.balls) {
          ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 10;
          ctx.fillStyle = '#ffb000'; ell(b.x, b.y, 5, 5); ctx.fillStyle = '#ff3b1f'; ell(b.x - b.vx * 0.02, b.y - b.vy * 0.02, 3, 3);
          ctx.shadowBlur = 0;
        }
        drawFixie(this.x, this.y, { color: '#e8261b', kind: 'fire', evil: this.evil, shake: this.evil ? 1.5 : 0 });
        drawBubble(this);
        if (this.mode === 'fight') {
          ctx.fillStyle = '#0008'; ctx.fillRect(W / 2 - 60, 26, 120, 9);
          ctx.fillStyle = '#ff3b1f'; ctx.fillRect(W / 2 - 59, 27, 118 * Math.max(0, this.anger), 7);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ЗЛОСТЬ', W / 2, 33); ctx.textAlign = 'left';
        }
      },
    }),
  },
  { name: 'Кладовка', floor: '#33302a', wall: '#2e2a26', dim: true,
    hint: 'Кусачке на всё наплевать. Она загородила дверь. Подбери правильные слова.',
    deco() { furniture(30, 60, 40, 30, '#7a5a30'); furniture(60, 230, 30, 26, '#7a5a30'); furniture(120, 6, 120, 34, '#4a3a2a'); },
    make: () => ({
      x: W - 38, y: DOOR_Y, evil: true, bub: null, t: 2, done: false,
      update(dt) {
        tickBub(this, dt);
        if (this.evil) { this.t -= dt; if (this.t <= 0) { this.t = 4; this.bub = { text: 'мне всё равно', t: 2 }; } }
        else this.y += (TOP + 30 - this.y) * dt * 2;
      },
      draw() {
        drawFixie(this.x, this.y, { color: '#9b59d0', hair: '#6a2f9a', kind: 'kusachka', evil: this.evil, s: 1.15 });
        drawBubble(this);
        if (this.evil && near(this, 44)) drawActHint(this.x, this.y - 34);
      },
      action() { if (this.evil && near(this, 44)) this.ask(); },
      ask() {
        const opts = shuffle([['Пусти меня, пожалуйста!', 0], ['Ты злая и вредная!', 0], ['Отойди, а то я тебя покусаю!', 0],
          ['Тебе, наверное, грустно одной. Хочешь, я посижу с тобой?', 1]]);
        choose('Кусачка', 'Чего тебе? Мне всё равно.', opts.map(o => o[0]), i => {
          if (!opts[i][1]) { say([['Кусачка', 'мне всё равно.']], () => this.ask()); return; }
          say([['Кусачка', '...'], ['Кусачка', 'Вообще-то мне не всё равно. Просто я очень устала, и никто не спрашивал.'],
            ['Кусачка', 'Спасибо, что спросил. Проходи.']], () => { this.evil = false; this.done = true; Snd.chime(); });
        });
      },
    }),
  },
  { name: 'Папин кабинет', floor: '#2e3a34', wall: '#24302a', light: 90, lights: [{ x: 350, y: 60, r: 70 }],
    hint: 'Это твой папа! Он союзник. Поговори с ним.',
    deco() { furniture(300, 34, 110, 30, '#5a3a20'); ctx.fillStyle = '#ffe9a0'; ell(350, 36, 8, 5);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = ['#a33', '#36a', '#3a6', '#aa3'][i % 4]; ctx.fillRect(30 + i * 9, 10, 7, 28); } },
    make: () => ({
      x: 330, y: 100, talked: false, done: false,
      update() {},
      draw() { drawHuman(this.x, this.y, { ...LOOK.papa, dir: P.x < this.x ? -1 : 1 }); if (!this.talked && near(this, 40)) drawActHint(this.x, this.y - 38); },
      action() {
        if (this.talked || !near(this, 40)) return;
        this.talked = true;
        say([['Папа', 'Сынок! Ты чего не спишь?'],
          ['Дим Димыч', 'Пап, тут злые фиксики! Один грустный, другая тревожная, третий злой, а четвёртой всё равно.'],
          ['Папа', 'Знаешь, они как чувства. Их не надо прогонять. Их надо просто принять — такие чувства бывают у всех.'],
          ['Папа', 'Дальше будет темно. Возьми мой фонарик.']], () => {
          G.flash = true; Snd.chime();
          say([['', 'Дим Димыч получил фонарик! Теперь в темноте видно дальше.']], () => { this.done = true; });
        });
      },
    }),
  },
  { name: 'Мамина комната', floor: '#4a3440', wall: '#5a3a4e', dim: false, lights: [],
    hint: 'Мама! Она всегда рядом.',
    deco() { furniture(40, 12, 80, 40, '#d0a0c0', '#f0d0e8'); ctx.fillStyle = '#ff7ab0'; ell(420, 30, 6, 6); ell(430, 26, 6, 6); ctx.fillStyle = '#3a7a3a'; ctx.fillRect(424, 32, 2, 12); },
    make: () => ({
      x: 300, y: 130, talked: false, done: false, parts: [],
      update(dt) { for (const p of this.parts) { p.y -= 25 * dt; p.t -= dt; } this.parts = this.parts.filter(p => p.t > 0); },
      draw() {
        drawHuman(this.x, this.y, { ...LOOK.mama, dir: P.x < this.x ? -1 : 1 });
        for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.t); heart(p.x, p.y, 8, '#ff5a8a'); ctx.globalAlpha = 1; }
        if (!this.talked && near(this, 40)) drawActHint(this.x, this.y - 36);
      },
      action() {
        if (this.talked || !near(this, 40)) return;
        this.talked = true;
        say([['Мама', 'Солнышко моё, иди ко мне.'], ['Мама', 'Я тебя очень люблю. Что бы ни случилось — я рядом.']], () => {
          G.maxHearts = 4; G.hearts = 4; Snd.chime();
          for (let i = 0; i < 12; i++) this.parts.push({ x: (P.x + this.x) / 2 + rand(-30, 30), y: P.y + rand(-10, 20), t: rand(1.5, 3) });
          say([['', 'Мама обняла Дим Димыча. Все сердечки восстановлены — и стало на одно больше!'],
            ['Мама', 'А теперь беги. Туалет уже близко!']], () => { this.done = true; });
        });
      },
    }),
  },
  { name: 'Комната с аквариумом', floor: '#1f3340', wall: '#1a2a36', light: 140, lights: [{ x: W / 2, y: 82, r: 160 }],
    hint: 'Рыбы подозрительно спокойны... Иди, только пока они зелёные. Покраснели — замри!',
    deco() {},
    make: () => ({
      state: 'calm', t: 3, done: false, bub: null, x: W / 2, y: 120,
      solids: [{ x: 70, y: TOP + 6, w: W - 140, h: 58 }],
      fish: Array.from({ length: 5 }, (_, i) => ({ x: 90 + i * 70, y: TOP + 20 + (i % 3) * 14, v: rand(15, 30) * (i % 2 ? 1 : -1) })),
      update(dt) {
        tickBub(this, dt);
        this.t -= dt;
        if (this.t <= 0) {
          if (this.state === 'calm') { this.state = 'warn'; this.t = 0.9; }
          else if (this.state === 'warn') { this.state = 'angry'; this.t = rand(1.6, 2.4); this.grace = 0.25; this.bub = { text: 'буль! раздражение!', t: 1.5 }; }
          else { this.state = 'calm'; this.t = rand(2, 3.5); }
        }
        if (this.state === 'calm') for (const f of this.fish) { f.x += f.v * dt; if (f.x < 82 || f.x > W - 82) f.v = -f.v; }
        if (this.state === 'angry') {
          this.grace -= dt;
          if (this.grace <= 0 && P.moving && P.inv <= 0) {
            hurt(); P.x = 36; P.y = DOOR_Y; this.bub = { text: 'не шевелись!', t: 1.5 };
          }
        }
        if (!this.done && P.x > W - 70) { this.done = true; Snd.chime(); }
      },
      draw() {
        const s = this.solids[0];
        ctx.fillStyle = '#0a1a2a'; ctx.fillRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8);
        const col = this.state === 'angry' ? 'rgba(200,40,40,.55)' : this.state === 'warn' ? 'rgba(200,180,40,.5)' : 'rgba(40,140,200,.55)';
        ctx.fillStyle = col; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        for (let i = 0; i < 8; i++) ell(s.x + 20 + i * 40, s.y + s.h - ((G.t * 20 + i * 17) % s.h), 2, 2);
        for (const f of this.fish) {
          const angry = this.state === 'angry', dir = angry ? 0 : Math.sign(f.v);
          ctx.fillStyle = angry ? '#ff3030' : '#ffa030';
          ell(f.x, f.y, 9, 6);
          ctx.beginPath(); ctx.moveTo(f.x - dir * 8, f.y); ctx.lineTo(f.x - dir * 15, f.y - 5); ctx.lineTo(f.x - dir * 15, f.y + 5); ctx.fill();
          ctx.fillStyle = angry ? '#fff' : '#111'; ell(f.x + dir * 4 - 2, f.y - 1, 1.6, 1.6); if (angry) ell(f.x + 2, f.y - 1, 1.6, 1.6);
        }
        ctx.strokeStyle = '#7ab'; ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, s.w, s.h);
        drawBubble({ x: W / 2, y: s.y + s.h + 34, bub: this.bub });
      },
      drawTop() {
        const lbl = { calm: ['Рыбы: подозрительно спокойно… можно идти', '#3ad17a'], warn: ['Рыбы: что-то не так…', '#e8c43a'],
          angry: ['Рыбы: РАЗДРАЖЕНИЕ! ЗАМРИ!', '#ff4040'] }[this.state];
        ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#000a'; rr(W / 2 - 120, 24, 240, 16, 6); ctx.fill();
        ctx.fillStyle = lbl[1]; ctx.fillText(lbl[0], W / 2, 35); ctx.textAlign = 'left';
      },
    }),
  },
  { name: 'Чулан с ключами', floor: '#2a2438', wall: '#3a2448', light: 140, mad: true,
    hint: 'Дверь заперта. Подбери ключ и попробуй его в замке. Тут всё сходит с ума...',
    deco() { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = 'italic 9px sans-serif';
      ctx.fillText('ключ? ключ? КЛЮЧ?', 60, 26); ctx.fillText('ха-ха-ха', 280, 18); ctx.fillText('не тот!', 380, 34); },
    make: () => {
      const cols = ['#ff5555', '#55dd55', '#5599ff', '#ffdd33', '#ff66ff'];
      const keys = cols.map((c, i) => ({ c, i, x: rand(60, W - 110), y: rand(TOP + 30, H - 40), tried: false }));
      return {
        keys, good: Math.random() * 5 | 0, held: null, flip: false, flipT: 6, done: false, bub: null,
        update(dt) {
          tickBub(this, dt);
          if (!this.done) {
            this.flipT -= dt;
            if (this.flipT <= 0) {
              this.flip = !this.flip; this.flipT = this.flip ? 3 : 6;
              if (this.flip) { banner = { text: 'Всё перепуталось!', t: 1.5 }; Snd.laugh(); }
            }
          }
          if (this.held) { this.held.x = P.x + 8 * P.dir; this.held.y = P.y - 2; }
        },
        draw() {
          for (const k of this.keys) {
            ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k === this.held ? 0 : Math.sin(G.t * 3 + k.i) * 0.5);
            ctx.strokeStyle = k.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-5, 0, 4, 0, Math.PI * 2);
            ctx.moveTo(-1, 0); ctx.lineTo(9, 0); ctx.moveTo(6, 0); ctx.lineTo(6, 4); ctx.moveTo(9, 0); ctx.lineTo(9, 4); ctx.stroke();
            if (k.tried) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-1, 4); ctx.moveTo(-1, -4); ctx.lineTo(-9, 4); ctx.stroke(); }
            ctx.restore();
          }
          const free = this.keys.find(k => k !== this.held && dist(k, P) < 20);
          if (free) drawActHint(free.x, free.y - 16);
          if (this.held && P.x > W - 60 && Math.abs(P.y - DOOR_Y) < 40 && !this.done) drawActHint(W - 30, DOOR_Y - 34);
          drawBubble({ x: W - 40, y: DOOR_Y, bub: this.bub });
        },
        action() {
          if (this.done) return;
          if (this.held && P.x > W - 60 && Math.abs(P.y - DOOR_Y) < 40) {
            const k = this.held; this.held = null;
            if (k.i === this.good) {
              this.keys = this.keys.filter(x => x !== k); this.done = true; this.flip = false; Snd.chime();
              this.bub = { text: 'щёлк! подошёл!', t: 2 };
            } else {
              Snd.laugh(); k.tried = true; k.x = rand(60, W - 120); k.y = rand(TOP + 30, H - 40);
              this.bub = { text: 'не подходит! ха-ха!', t: 2 };
            }
            return;
          }
          const k = this.keys.find(x => x !== this.held && dist(x, P) < 20);
          if (k) { if (this.held) { this.held.x = k.x; this.held.y = k.y; } this.held = k; Snd.blip(); }
        },
      };
    },
  },
  { name: 'Тёмный коридор', floor: '#22201e', wall: '#1a1816', light: 75, toilet: true,
    hint: 'Тсс... Здесь живёт Дедус с клыками. Беги к туалету и не дай себя поймать!',
    deco() { frame(100, 10, 20, 24); frame(220, 12, 20, 22); frame(340, 10, 20, 24);
      ctx.fillStyle = '#ff2020'; [110, 230, 350].forEach(x => { ell(x - 3, 20, 1.2, 1.2); ell(x + 3, 20, 1.2, 1.2); }); },
    make: () => ({
      x: -100, y: -100, vis: 0, chase: 0, t: 2, done: true, bub: null,
      update(dt) {
        tickBub(this, dt);
        if (this.chase > 0) {
          this.chase -= dt; this.vis = Math.min(1, this.vis + dt * 3);
          const d = dist(this, P);
          if (d > 1) { this.x += (P.x - this.x) / d * 52 * dt; this.y += (P.y - this.y) / d * 52 * dt; }
          if (d < 14 && P.inv <= 0) {
            hurt(); P.x = 36; P.y = DOOR_Y; this.chase = 0; this.bub = { text: 'попался!', t: 1.2 };
          }
          return;
        }
        this.vis = Math.max(0, this.vis - dt * 2);
        this.t -= dt;
        if (this.t <= 0) {
          const a = rand(0, Math.PI * 2), r = rand(85, 125);
          this.x = clamp(P.x + Math.cos(a) * r, 24, W - 40);
          this.y = clamp(P.y + Math.sin(a) * r, TOP + 14, H - 22);
          this.chase = 2.2; this.t = rand(1.2, 2.2);
          this.bub = { text: 'я тут...', t: 1.6 }; Snd.whisper();
        }
      },
      draw() { if (this.vis > 0) { ctx.globalAlpha = this.vis; drawFixie(this.x, this.y, { color: '#5f6b55', kind: 'dedus', evil: true, s: 1.35 }); ctx.globalAlpha = 1; } },
      drawTop() {
        if (this.vis > 0) {
          ctx.globalAlpha = this.vis * 0.8; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff';
          ell(this.x - 5.4, this.y - 3, 3.6, 4.2); ell(this.x + 5.4, this.y - 3, 3.6, 4.2);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
        drawBubble(this, -36);
      },
    }),
  },
];

// Before room 1: learn to walk and to press the action button, in Russian, for the device in hand.
const TUTORIAL = { name: 'Спальня', floor: '#2e2a44', wall: '#24204a', dim: true,
  hint: 'Сначала научимся управлять. Читай табличку сверху и выполни оба задания.',
  deco() { furniture(30, 60, 70, 40, '#5a4a8a', '#e8e0ff'); ctx.fillStyle = '#ffe9a0'; ell(118, 60, 4, 4); },
  make: () => ({
    moved: 0, acted: false, done: false,
    update(dt) {
      if (P.moving) this.moved += dt;
      if (!this.done && this.moved > 1 && this.acted) {
        this.done = true; Snd.chime();
        say([['Димон', 'Отлично, ты всё умеешь! Дверь справа открыта — иди туда →']]);
      }
    },
    action() { if (!this.acted) { this.acted = true; Snd.chime(); } },
    draw() {},
    drawTop() {
      const lines = TOUCH
        ? ['Держи палец на джойстике слева и веди — Дим Димыч пойдёт.',
          'Жёлтая кнопка ✋ справа — поговорить, помочь, взять ключ.',
          'Чтобы читать разговор дальше — нажми на экран или на ✋.']
        : ['Стрелки или W A S D — ходить.',
          'Пробел или E — действие: поговорить, помочь, взять ключ.',
          'Пробел — читать разговор дальше. M — звук вкл/выкл.'];
      const tasks = [[this.moved > 1, TOUCH ? 'Походи джойстиком' : 'Походи стрелками'],
        [this.acted, TOUCH ? 'Нажми кнопку ✋' : 'Нажми пробел']];
      ctx.fillStyle = 'rgba(14,10,30,.9)'; rr(70, 26, W - 140, 112, 8); ctx.fill();
      ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = 'bold 12px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffcc33';
      ctx.fillText('Как управлять Дим Димычем', W / 2, 42);
      ctx.font = '10px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#f4f0ff';
      lines.forEach((l, i) => ctx.fillText(l, W / 2, 60 + i * 14));
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      tasks.forEach(([ok, t], i) => { ctx.fillStyle = ok ? '#3ad17a' : '#cfc8ef'; ctx.fillText((ok ? '✔ ' : '☐ ') + t, W / 2 + (i ? 75 : -75), 122); });
      ctx.textAlign = 'left';
      if (TOUCH && !dialogActive()) {
        const b = Math.sin(G.t * 5) * 3;
        ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffcc33';
        if (this.moved <= 1) ctx.fillText('↙ джойстик', 20, H - 18 + b);
        if (!this.acted) { ctx.textAlign = 'right'; ctx.fillText('кнопка ✋ ↘', W - 20, H - 18 + b); ctx.textAlign = 'left'; }
      }
    },
  }),
};
const roomDef = i => (i < 0 ? TUTORIAL : ROOMS[i]);

// ---------- room flow
function startRoom(i, fresh) {
  G.state = 'room'; G.room = i; store.set(Math.max(i, 0));
  if (i >= 5) G.flash = true;
  if (i >= 6) G.maxHearts = Math.max(G.maxHearts, 4);
  if (fresh) G.hearts = G.maxHearts;
  P.x = 36; P.y = DOOR_Y; P.inv = 0; P.dir = 1;
  const R = roomDef(i);
  G.enc = R.make();
  banner = { text: i < 0 ? 'Обучение' : `${i + 1}/${ROOMS.length} · ${R.name}`, t: 2.5 };
  resetDialog();
  say([['Димон', R.hint]], () => { if (G.enc.start) G.enc.start(); });
}
function hurt() {
  if (P.inv > 0) return;
  G.hearts--; P.inv = 1.2; shakeT = 0.3; Snd.hurt();
  if (G.hearts <= 0) {
    G.hearts = 0;
    say([['Димон', 'Ой! Ничего страшного — попробуем эту комнату ещё раз.']], () => startRoom(G.room, true));
  }
}
function movePlayer(dt, flip) {
  const a = axis();
  if (flip) { a.x = -a.x; a.y = -a.y; }
  P.moving = Math.abs(a.x) + Math.abs(a.y) > 0.15;
  if (!P.moving) return;
  const solids = G.enc.solids || [];
  const hit = (x, y) => solids.some(s => x > s.x - 6 && x < s.x + s.w + 6 && y > s.y - 4 && y < s.y + s.h + 12);
  const nx = P.x + a.x * 95 * dt, ny = P.y + a.y * 95 * dt;
  if (!hit(nx, P.y)) P.x = nx;
  if (!hit(P.x, ny)) P.y = ny;
  const open = G.enc.done && Math.abs(P.y - DOOR_Y) < 18;
  P.x = clamp(P.x, 20, open ? W + 4 : W - 20);
  P.y = P.x > W - 20 ? clamp(P.y, DOOR_Y - 17, DOOR_Y + 17) : clamp(P.y, TOP + 10, H - 22);
  if (a.x) P.dir = a.x > 0 ? 1 : -1;
  P.walk += dt * 12;
  P.stepT -= dt;
  if (P.stepT <= 0) { P.stepT = 0.32; Snd.step(); }
}
function updRoom(dt) {
  const e = G.enc;
  P.inv = Math.max(0, P.inv - dt);
  if (dialogActive()) { P.moving = false; updDialog(dt); return; }
  if (!e.lockMove) movePlayer(dt, e.flip); else P.moving = false;
  e.update(dt);
  if (G.enc !== e) return;
  if (take('act') && e.action) e.action();
  if (e.done && P.x > W - 8) {
    if (G.room + 1 < ROOMS.length) startRoom(G.room + 1); else startEnding();
  }
}
function drawHUD() {
  for (let i = 0; i < G.maxHearts; i++) heart(14 + i * 15, 6, 12, i < G.hearts ? '#ff4d6d' : '#4a3a4a');
  if (G.flash) { ctx.font = '11px sans-serif'; ctx.fillText('🔦', 14 + G.maxHearts * 15, 16); }
  if (banner.t > 0) {
    ctx.globalAlpha = Math.min(1, banner.t); ctx.font = 'bold 12px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000a'; const tw = ctx.measureText(banner.text).width; rr(W / 2 - tw / 2 - 8, 4, tw + 16, 18, 6); ctx.fill();
    ctx.fillStyle = '#f4f0ff'; ctx.fillText(banner.text, W / 2, 17); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}
function drawRoom() {
  const R = roomDef(G.room), e = G.enc;
  ctx.save();
  if (shakeT > 0) ctx.translate(rand(-3, 3), rand(-3, 3));
  if (R.mad && !e.done) {
    ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(G.t * 1.7) * 0.03);
    ctx.scale(1 + Math.sin(G.t * 2.3) * 0.02, 1 + Math.cos(G.t * 1.9) * 0.02); ctx.translate(-W / 2, -H / 2);
    if ('filter' in ctx) ctx.filter = `hue-rotate(${(G.t * 50) % 360 | 0}deg)`;
  }
  drawFloorWalls(R.floor, R.wall);
  R.deco();
  drawDoor(e.done, R.toilet);
  if (R.dim) { ctx.fillStyle = 'rgba(10,5,30,.3)'; ctx.fillRect(0, 0, W, H); }
  if (e.y !== undefined && e.y > P.y) { drawPlayer(); e.draw(); } else { e.draw(); drawPlayer(); }
  ctx.restore();
  if (R.light) drawDark(R.light * (G.flash ? 1.6 : 1), R.lights);
  if (e.drawTop) e.drawTop();
  drawHUD();
  drawDialog();
}

// ---------- title, intro, ending
const hintEl = document.getElementById('hint');
const menu = document.getElementById('menu'), bPlay = document.getElementById('play'), bCont = document.getElementById('cont');
function showMenu(ending) {
  const saved = store.get();
  menu.hidden = false;
  bPlay.textContent = ending ? 'Играть снова' : (saved > 0 ? 'Начать заново' : 'Играть');
  bPlay.className = !ending && saved > 0 ? 'sec' : '';
  hintEl.textContent = TOUCH ? (innerHeight > innerWidth ? 'Совет: поверни телефон боком — так удобнее 📱↻' : '') : 'Стрелки — ходить, пробел — действие';
  bCont.hidden = ending || saved <= 0;
  bCont.textContent = `Продолжить (комната ${saved + 1})`;
}
bPlay.addEventListener('click', () => { Snd.init(); menu.hidden = true; newGame(); });
bCont.addEventListener('click', () => { Snd.init(); menu.hidden = true; G.flash = false; G.maxHearts = 3; startRoom(store.get(), true); });
function newGame() {
  G.flash = false; G.maxHearts = 3; G.hearts = 3; G.state = 'intro'; store.set(0);
  resetDialog();
  say([['', 'Ночь. Все спят. Дим Димыч проснулся.'],
    ['Дим Димыч', 'Ой... Я очень хочу в туалет!'],
    ['Димон', 'Стой! Я Димон — технический инженер по безопасности фиксиков.'],
    ['Димон', 'Этой ночью фиксики стали злыми. У каждого светятся белые глаза.'],
    ['Димон', 'Туалет — в самом конце дома. Придётся пройти через все комнаты.'],
    ['Дим Димыч', 'Ну... Очень надо. Пошли!']], () => startRoom(-1, true));
}
function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120a2a'); g.addColorStop(1, '#2a1240');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff6d0'; ell(410, 50, 22, 22); ctx.fillStyle = '#120a2a'; ell(400, 44, 20, 20);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(G.t * 2 + i)})`; ctx.fillRect((i * 97) % W, (i * 53) % 120, 1.5, 1.5); }
  ctx.fillStyle = '#0a0614'; ctx.fillRect(0, 230, W, 90);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffcc33';
  ctx.shadowColor = '#ff8a1f'; ctx.shadowBlur = 12;
  ctx.fillText('Дим Димыч', W / 2, 62); ctx.fillText('хочет в туалет', W / 2, 92); ctx.shadowBlur = 0;
  ctx.font = 'italic 11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#cfc8ef';
  ctx.fillText('страшилка про злых фиксиков · идея и сюжет: Валя', W / 2, 112);
  if (TOUCH) { ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffcc33'; ctx.fillText('Играй пальцами: джойстик слева, кнопка ✋ справа', W / 2, 130); }
  ctx.textAlign = 'left';
  const line = [['#3d8bff', 'nolik', '#2a5fb8'], ['#ff8a1f', 'simka', '#c45f00'], ['#e8261b', 'fire'], ['#9b59d0', 'kusachka', '#6a2f9a'], ['#5f6b55', 'dedus']];
  line.forEach((f, i) => drawFixie(110 + i * 65, 162, { color: f[0], kind: f[1], hair: f[2], evil: true, ph: i, s: i === 4 ? 1.3 : 1 }));
  drawHuman(60, 214, { ...LOOK.dim, s: 1.4 });
}
function drawIntro() {
  drawFloorWalls('#2e2a44', '#24204a');
  furniture(30, 60, 70, 40, '#5a4a8a', '#e8e0ff');
  ctx.fillStyle = '#ffe9a0'; ell(118, 60, 4, 4);
  drawDoor(false, false);
  drawHuman(130, 120, { ...LOOK.dim, s: 1.3 });
  if (D.cur && D.queue.length < 6) drawHuman(250, 128, { ...LOOK.dimon, s: 1.3, dir: -1 });
  ctx.fillStyle = 'rgba(10,5,30,.35)'; ctx.fillRect(0, 0, W, H);
  drawDialog();
}
function startEnding() {
  G.state = 'ending'; G.endT = 0; store.set(0);
  P.x = 150; P.y = 200; P.dir = 1; P.moving = false;
  resetDialog();
  say([['Дим Димыч', 'ТУАЛЕТ! Наконец-то!!!']], () => { Snd.flush(); G.endT = 0.01; });
}
function drawEnding(dt) {
  ctx.fillStyle = '#d8eef4'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b8d4dc'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x < W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const tx = 220, ty = 180;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8aa'; ctx.lineWidth = 2;
  rr(tx - 14, ty - 48, 28, 30, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(tx, ty - 8, 22, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9fd8ef'; ell(tx, ty - 9, 14, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(tx - 10, ty + 4, 20, 14); ctx.strokeRect(tx - 10, ty + 4, 20, 14);
  drawPlayer();
  if (G.endT > 0) {
    ctx.fillStyle = `rgba(14,10,30,${Math.min(0.85, G.endT / 2)})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, G.endT / 1.5); ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffcc33';
    ctx.fillText('Финал — реальность', W / 2, 60);
    ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#f4f0ff';
    ['Дим Димыч добежал до туалета. Уф!', 'Злые фиксики оказались просто чувствами:',
      'грусть, тревога, злость, безразличие, раздражение…', 'Их не надо бояться — их можно понять и принять.',
      'А папа и мама всегда рядом.'].forEach((l, i) => ctx.fillText(l, W / 2, 92 + i * 16));
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#86e08a';
    ctx.fillText('Идея и сюжет: Валя', W / 2, 186);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

// ---------- main loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.t += dt; shakeT = Math.max(0, shakeT - dt); banner.t -= dt;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  if (take('mute')) Snd.toggle();
  if (G.state === 'title') {
    if (take('act')) (store.get() > 0 ? bCont : bPlay).click();
    drawTitle();
  } else if (G.state === 'intro') {
    updDialog(dt); drawIntro();
  } else if (G.state === 'room') {
    updRoom(dt); if (G.state === 'room') drawRoom();
  }
  if (G.state === 'ending') {
    updDialog(dt);
    if (G.endT > 0) { G.endT += dt; if (G.endT > 2.5 && menu.hidden) showMenu(true); }
    drawEnding(); drawDialog();
  }
  for (const k in pressed) pressed[k] = false;
  tap = null;
  requestAnimationFrame(loop);
}

const qRoom = +new URLSearchParams(location.search).get('room');
if (qRoom >= 1 && qRoom <= ROOMS.length) { window.__game = { G, P, D }; startRoom(qRoom - 1, true); }
else showMenu(false);
requestAnimationFrame(loop);
})();
