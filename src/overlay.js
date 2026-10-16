// Full-screen layer: giant face ("hãy nhìn vào mắt em"), pixel disco lights, zoomies lap.
import { loadSprite } from './sprite.js';
import * as L from './lines.js';

const api = window.cup;
const stage = document.getElementById('stage');
const g = stage.getContext('2d');
const lc = document.getElementById('lights');
const lg = lc.getContext('2d');
const rand = (a, b) => a + Math.random() * (b - a);
let sprite, msg = { mode: 'off' }, W = 0, H = 0, raf = 0;
const vars = () => ({ a: msg.cfg?.pronoun || 'anh' });
const fillT = (t, x = {}) => L.fill(t, { ...vars(), ...x });

function size() {
  W = stage.width = innerWidth; H = stage.height = innerHeight;
  lc.width = Math.ceil(W / 8); lc.height = Math.ceil(H / 8);    // lights render at 1/8 → chunky pixels
}

api.on('overlay', async (m) => {
  sprite = sprite || await loadSprite('../assets/pet/');
  cancelAnimationFrame(raf);
  msg = m; size();
  g.clearRect(0, 0, W, H); lg.clearRect(0, 0, lc.width, lc.height);
  document.getElementById('face-ui').hidden = m.mode !== 'face';
  if (m.mode === 'face') startFace();
  if (m.mode === 'lights') startLights();
  if (m.mode === 'lap') startLap();
});
api.on('beat', (b) => { beat = { ...b, at: performance.now() }; beats++; });

// ================================================================ giant face
let mouse = { x: 0, y: 0 }, escN = 0, escT = 0, dodges = 0;
addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; });
function startFace() {
  const t0 = performance.now();
  const pet = msg.pet, b = msg.bounds, S0 = msg.cfg.scale;
  const crop = { x: 8, y: 0, w: 88, h: 74 };
  const final = Math.max(4, Math.floor(Math.min(W * 0.92 / crop.w, H * 0.86 / crop.h)));
  const from = { x: pet.x - b.x + pet.width / 2, y: pet.y - b.y + pet.height - 60 * S0, s: S0 };
  const to = { x: W / 2, y: H * 0.47, s: final };
  const text = document.getElementById('faceText');
  let line = 0; text.textContent = fillT(L.FACE[0]);
  const lineT = setInterval(() => { line = (line + 1) % L.FACE.length; text.textContent = fillT(L.FACE[line]); }, 3200);
  escN = 0; dodges = 0;
  const diss = document.getElementById('diss');
  diss.style.transform = '';
  diss.onmouseenter = diss.onclick = (e) => {
    e.preventDefault();
    dodges++;
    const dx = rand(-1, 1) * W * 0.3, dy = -rand(60, H * 0.5);
    diss.style.transform = `translate(${dx | 0}px, ${dy | 0}px)`;
    text.textContent = fillT(L.pick(L.FACE_DODGE));
  };
  const done = (result) => {
    clearInterval(lineT); cancelAnimationFrame(raf);
    document.getElementById('face-ui').hidden = true;
    shrink(result);
  };
  document.getElementById('praise').onclick = () => done('praised');
  onkeydown = (e) => {
    if (e.key !== 'Escape') return;
    const now = performance.now(); escN = now - escT < 900 ? escN + 1 : 1; escT = now;
    if (escN >= 5) done('escaped');                     // emergency exit: Esc ×5
  };
  let shrinkFrom = null;
  function shrink(result) {
    shrinkFrom = { t: performance.now(), result };
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let k = Math.min(1, (now - t0) / 650);
    if (shrinkFrom) {
      k = 1 - Math.min(1, (now - shrinkFrom.t) / 450);
      if (k <= 0) { cancelAnimationFrame(raf); g.clearRect(0, 0, W, H); api.overlayDone({ mode: 'face', result: shrinkFrom.result }); return; }
    }
    const step = Math.round(k * 8) / 8;                       // stepped growth — pixel world moves in steps
    const s = Math.max(1, Math.round(from.s + (to.s - from.s) * step));
    const cx = from.x + (to.x - from.x) * step, cy = from.y + (to.y - from.y) * step;
    // eyes chase the cursor; every few seconds it pulls a sly face instead
    const ex = Math.max(-1, Math.min(1, (mouse.x - W / 2) / (W / 3))), ey = Math.max(-1, Math.min(1, (mouse.y - H * 0.4) / (H / 3)));
    const phase = Math.floor(now / 2600) % 3;
    const eyes = phase === 2
      ? [{ mode: 'smug', ...sprite.look(0, ex, 0.4) }, { mode: 'smug', ...sprite.look(1, ex, 0.4) }]
      : [{ mode: 'open', ...sprite.look(0, ex, ey) }, { mode: 'open', ...sprite.look(1, ex, ey) }];
    const img = sprite.render({ eyes, blush: true, beak: phase === 1 && (Math.floor(now / 160) % 2 === 0), tongue: dodges > 1 && phase === 2 ? 2 : 0 });
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(22,28,36,${0.45 * step})`; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, crop.x, crop.y, crop.w, crop.h, Math.round(cx - crop.w * s / 2), Math.round(cy - crop.h * s / 2), crop.w * s, crop.h * s);
    // sparkle in the eyes, at screen scale
    if (step === 1 && phase !== 2) {
      g.fillStyle = '#fff';
      for (const e of sprite.eyes) {
        const X = Math.round(cx + (e.cx + 3 - crop.x - crop.w / 2) * s), Y = Math.round(cy + (e.cy - 4 - crop.y - crop.h / 2) * s);
        const tw = (Math.floor(now / 300) % 2) ? 1 : 0.6;
        g.fillRect(X - s * tw, Y - s * 3 * tw, s * 2 * tw, s * 6 * tw); g.fillRect(X - s * 3 * tw, Y - s * tw, s * 6 * tw, s * 2 * tw);
      }
    }
  }
  raf = requestAnimationFrame(frame);
}

// ================================================================ pixel disco lights
let beat = null, beats = 0;
const COLS = ['#f87a71', '#ffc107', '#54d62c', '#a8cceb', '#f2a9a0', '#9fd4a3'];
function startLights() {
  const t0 = performance.now(); let lastFlash = 0, flashCol = '#fff';
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const w = lc.width, h = lc.height, t = (now - t0) / 1000;
    lg.clearRect(0, 0, w, h);
    const sinceBeat = beat ? now - beat.at : 9999;
    const pump = sinceBeat < 160 ? 1 : 0.55;
    // sweeping beams from the top corners
    for (let i = 0; i < 4; i++) {
      const ox = i < 2 ? w * 0.08 : w * 0.92, oy = -2;
      const ang = Math.PI / 2 + Math.sin(t * (0.6 + i * 0.17) + i * 1.7) * 0.75;
      const len = h * 1.15, spread = 0.09;
      lg.globalAlpha = 0.24 * pump;
      lg.fillStyle = COLS[(i + (beats >> 2)) % COLS.length];
      lg.beginPath(); lg.moveTo(ox, oy);
      lg.lineTo(ox + Math.cos(ang - spread) * len, oy + Math.sin(ang - spread) * len);
      lg.lineTo(ox + Math.cos(ang + spread) * len, oy + Math.sin(ang + spread) * len);
      lg.closePath(); lg.fill();
    }
    // floor spots around Cúp
    const px = (msg.pet.x - msg.bounds.x + msg.pet.width / 2) / 8, py = (msg.workArea.y + msg.workArea.height - msg.bounds.y) / 8;
    for (let i = 0; i < 5; i++) {
      const sx = px + Math.sin(t * 1.3 + i * 2) * 26, r = 4 + (i % 2) * 2;
      lg.globalAlpha = 0.35 * pump; lg.fillStyle = COLS[(i + beats) % COLS.length];
      lg.fillRect(Math.round(sx - r), Math.round(py - 2), r * 2, 2);
    }
    // twinkles
    lg.globalAlpha = 0.8;
    for (let i = 0; i < 14; i++) {
      const on = (Math.floor(t * 4) + i * 7) % 5 === 0; if (!on) continue;
      const x = (i * 97.3 + 13) % w | 0, y = (i * 53.1 + 7) % (h * 0.8) | 0;
      lg.fillStyle = COLS[i % COLS.length];
      lg.fillRect(x, y - 1, 1, 3); lg.fillRect(x - 1, y, 3, 1);
    }
    // flash on the beat (soft, ≤ 1 per ~2 beats, can be switched off in settings)
    if (msg.cfg.flash && beat && sinceBeat < 90 && now - lastFlash > 850) { lastFlash = now; flashCol = COLS[beats % COLS.length]; }
    if (msg.cfg.flash && now - lastFlash < 90) { lg.globalAlpha = 0.14; lg.fillStyle = flashCol; lg.fillRect(0, 0, w, h); }
    lg.globalAlpha = 1;
  };
  raf = requestAnimationFrame(frame);
}

// ================================================================ zoomies lap around the screen edges
function startLap() {
  const S = msg.cfg.scale, b = msg.bounds, wa = msg.workArea;
  const L_ = wa.x - b.x, R = wa.x + wa.width - b.x, T = wa.y - b.y, B = wa.y + wa.height - b.y;
  const sx = Math.max(L_ + 50 * S, Math.min(R - 50 * S, msg.pet.x - b.x + msg.pet.width / 2));
  // bottom ← left ↑ top → right ↓ bottom ← back to the spot (feet on the edge, belly inward)
  const segs = [
    { a: [sx, B], b: [L_, B], rot: 0 },
    { a: [L_, B], b: [L_, T], rot: Math.PI / 2 },
    { a: [L_, T], b: [R, T], rot: Math.PI },
    { a: [R, T], b: [R, B], rot: -Math.PI / 2 },
    { a: [R, B], b: [sx, B], rot: 0 },
  ];
  for (const s of segs) s.len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  const speed = 1500;                    // px / s
  const t0 = performance.now(); let f = 0, lastF = 0;
  const dust = [];
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    let d = (now - t0) / 1000 * speed, seg = null, i = 0;
    for (; i < segs.length; i++) { if (d <= segs[i].len) { seg = segs[i]; break; } d -= segs[i].len; }
    if (!seg) { cancelAnimationFrame(raf); g.clearRect(0, 0, W, H); api.overlayDone({ mode: 'lap' }); return; }
    const k = seg.len ? d / seg.len : 1;
    const x = seg.a[0] + (seg.b[0] - seg.a[0]) * k, y = seg.a[1] + (seg.b[1] - seg.a[1]) * k;
    if (now - lastF > 55) { lastF = now; f++; if (f % 2) dust.push({ x, y, r: seg.rot, life: 1 }); }
    const c = f % 4;
    const pose = {
      footL: c === 0 ? -3 : 0, footR: c === 2 ? -3 : 0, body: c % 2 ? -1 : 0, head: [0, c % 2 ? -1 : 0],
      wingL: f % 2 ? -3 : 0, wingR: f % 2 ? 0 : -3, beak: true,
      eyes: [{ mode: 'small', ...sprite.look(0, 1, -0.3) }, { mode: 'small', ...sprite.look(1, -0.6, 0.6) }],
    };
    const img = sprite.render(pose);
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    // dust puffs
    for (let j = dust.length - 1; j >= 0; j--) {
      const p = dust[j]; p.life -= 0.06; if (p.life <= 0) { dust.splice(j, 1); continue; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = p.life * 0.7; g.fillStyle = '#dfe3e8';
      const r = Math.round((1 - p.life) * 6 + 2) * S;
      g.fillRect(-r, -r * 1.4, r * 2, r); g.restore();
    }
    g.globalAlpha = 1;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(seg.rot); g.scale(-1, 1);
    g.drawImage(img, -50 * S, -98 * S, 100 * S, 100 * S);
    g.restore();
  };
  raf = requestAnimationFrame(frame);
}

addEventListener('resize', size);
