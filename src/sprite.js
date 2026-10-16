// Composes Cúp from its layers on the art's native 100×100 grid.
// Eyes are redrawn in code (pupils move independently → the derpy look),
// so blink / happy ^^ / sleepy lids / tiny scared pupils need no extra art.

const LAYERS = ['footL', 'footR', 'body', 'wingL', 'wingR', 'head'];

export async function loadSprite(base, parts) {
  parts = parts || (await import(base + 'parts.js')).default;
  const load = (n) => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = base + n + '.png';
  });
  const imgs = {};
  for (const n of [...LAYERS, 'beak-open']) imgs[n] = await load(n);
  return new Sprite(parts, imgs);
}

const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

class Sprite {
  constructor(parts, imgs) {
    this.p = parts; this.imgs = imgs;
    this.W = parts.size[0]; this.H = parts.size[1];
    this.cv = document.createElement('canvas');
    this.cv.width = this.W; this.cv.height = this.H;
    this.ctx = this.cv.getContext('2d');
    this.ink = rgb(parts.ink); this.skin = rgb(parts.skin);
    // per-eye lookups
    this.eyes = parts.eyes.map((e) => {
      const rows = new Map(e.interior.map(([y, x0, x1]) => [y, [x0, x1]]));
      const ys = e.interior.map((r) => r[0]);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      let x0 = 1e9, x1 = -1;
      e.interior.forEach(([, a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); });
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, P = e.pupil;
      return { ...e, rows, y0, y1, x0, x1, cx, cy, white: rgb(e.white),
        c0x: cx - (P.x + (P.w - 1) / 2), c0y: cy - (P.y + (P.h - 1) / 2) };
    });
  }

  /** look vector lx, ly in [-1, 1] → pupil offset for eye i (0 = left, 1 = right) */
  look(i, lx, ly) {
    const e = this.eyes[i], P = e.pupil;
    const c0x = e.cx - (P.x + (P.w - 1) / 2), c0y = e.cy - (P.y + (P.h - 1) / 2);
    const rx = (e.x1 - e.x0 + 1 - P.w) / 2 - 1, ry = (e.y1 - e.y0 + 1 - P.h) / 2 - 1;
    return { dx: Math.round(c0x + lx * rx), dy: Math.round(c0y + ly * ry) };
  }

  inside(eye, x, y) {
    const r = eye.rows.get(y);
    return r && x >= r[0] + 1 && x <= r[1] - 1;
  }

  /** pose: {head:[dx,dy], body:dy, footL, footR, wingL, wingR, beak, tongue, blush, tear, sweat,
   *  skinny (0..1), eyes:[{mode,dx,dy,lid,slant},{…}]} */
  render(pose) {
    const c = this.ctx, I = this.imgs;
    c.clearRect(0, 0, this.W, this.H);
    const bd = pose.body || 0;
    c.drawImage(I.footL, 0, pose.footL || 0);
    c.drawImage(I.footR, 0, pose.footR || 0);
    c.drawImage(I.body, 0, bd);
    c.drawImage(I.wingL, 0, bd + (pose.wingL || 0));
    c.drawImage(I.wingR, 0, bd + (pose.wingR || 0));
    const [hx, hy] = pose.head || [0, 0];
    const oy = hy + bd;
    c.drawImage(I.head, hx, oy);
    if (pose.blush) this.blush(hx, oy);
    this.eyes.forEach((e, i) => this.drawEye(e, pose.eyes?.[i] || {}, hx, oy, i));
    if (pose.beak || pose.tongue) c.drawImage(I['beak-open'], this.p.beak.x + hx, this.p.beak.y + oy);
    if (pose.tongue) this.tongue(pose.tongue, hx, oy, pose.tongueSide || 0);
    if (pose.tear) this.tear(pose.tear, hx, oy);
    if (pose.sweat) this.sweat(hx, oy);
    return pose.skinny ? this.thin(pose.skinny) : this.cv;
  }

  rect(x, y, w, h, col) { this.ctx.fillStyle = col; this.ctx.fillRect(x, y, w, h); }

  // lè lưỡi: a pink tongue hanging out of the open beak, len 1..4
  tongue(len, ox, oy, side) {
    const x = 59 + ox + side, y = 54 + oy, w = 7, h = 4 + len * 3;
    this.rect(x - 1, y, w + 2, h, this.ink);
    this.rect(x, y + h, w, 2, this.ink);
    this.rect(x, y, w, h, '#f87a71');
    this.rect(x + 3, y, 1, h - 3, '#b9271c');           // the centre crease
    this.rect(x + 1, y + 1, 1, 3, '#fececa');            // shine
    this.rect(x, y + h - 1, 1, 1, this.ink); this.rect(x + w - 1, y + h - 1, 1, 1, this.ink);
  }
  blush(ox, oy) {
    for (const [x, y] of [[35, 57], [73, 55]]) {
      this.rect(x + ox, y + oy, 7, 2, '#f2a9a0');
      this.rect(x + 1 + ox, y + 2 + oy, 5, 1, '#f2a9a0');
    }
  }
  // khóc ròng: a blue stream from the left eye, animated by frame
  tear(f, ox, oy) {
    const x = 37 + ox, y0 = 53 + oy;
    for (let y = 0; y < 9; y++) {
      const on = (y + f) % 4 !== 0;
      this.rect(x - 1, y0 + y, 4, 1, this.ink);
      this.rect(x, y0 + y, 2, 1, on ? '#a8cceb' : '#e2eef7');
    }
    this.rect(x - 2, y0 + 9, 6, 3, this.ink); this.rect(x - 1, y0 + 9, 4, 2, '#a8cceb');
  }
  sweat(ox, oy) {
    const x = 24 + ox, y = 38 + oy;                      // big drop on the left cheek, by the helmet flap
    this.rect(x + 2, y - 2, 2, 2, this.ink);
    this.rect(x + 1, y, 4, 2, this.ink); this.rect(x, y + 2, 6, 6, this.ink); this.rect(x + 1, y + 8, 4, 1, this.ink);
    this.rect(x + 2, y, 2, 2, '#a8cceb'); this.rect(x + 1, y + 2, 4, 6, '#a8cceb');
    this.rect(x + 2, y + 3, 1, 3, '#ffffff');
  }
  // gầy rộc: drop columns from the composed sprite (keeps every pixel crisp)
  thin(k) {
    if (!this.cv2) { this.cv2 = document.createElement('canvas'); this.cv2.width = this.W; this.cv2.height = this.H; this.ctx2 = this.cv2.getContext('2d'); }
    const c2 = this.ctx2; c2.clearRect(0, 0, this.W, this.H);
    const every = k >= 1 ? 3 : k >= 0.5 ? 4 : 6;
    const keep = [];
    for (let x = 0; x < this.W; x++) if (!(x > 18 && x < 88 && x % every === 0)) keep.push(x);
    const off = Math.floor((this.W - keep.length) / 2);
    keep.forEach((x, i) => c2.drawImage(this.cv, x, 0, 1, this.H, i + off, 0, 1, this.H));
    return this.cv2;
  }

  px(x, y, col) { this.ctx.fillStyle = col; this.ctx.fillRect(x, y, 1, 1); }

  drawEye(e, st, ox, oy, idx) {
    const c = this.ctx;
    const mode = st.mode || 'open';
    const fillRows = (from, to, col) => {
      c.fillStyle = col;
      for (let y = from; y <= to; y++) {
        const r = e.rows.get(y); if (!r) continue;
        c.fillRect(r[0] + ox, y + oy, r[1] - r[0] + 1, 1);
      }
    };
    const pupil = (dx, dy, small) => {
      const P = e.pupil;
      if (small) {
        // 6×6 rounded dot + 2×2 shine, centred on the eye
        const sx = Math.round(e.cx - 3 + dx - e.c0x), sy = Math.round(e.cy - 3 + dy - e.c0y);
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
          if ((x === 0 || x === 5) && (y === 0 || y === 5)) continue;
          if (this.inside(e, sx + x, sy + y)) this.px(sx + x + ox, sy + y + oy, this.ink);
        }
        this.px(sx + 1 + ox, sy + 1 + oy, e.white); this.px(sx + 2 + ox, sy + 1 + oy, e.white);
        this.px(sx + 1 + ox, sy + 2 + oy, e.white);
        return;
      }
      for (let y = 0; y < P.h; y++) {
        const row = P.sprite[y];
        for (let x = 0; x < P.w; x++) {
          const ch = row[x]; if (ch === '.') continue;
          const X = P.x + x + Math.round(dx), Y = P.y + y + Math.round(dy);
          if (!this.inside(e, X, Y)) continue;
          this.px(X + ox, Y + oy, ch === 'h' ? e.white : this.ink);
        }
      }
    };
    const lidLine = (y, x0, x1) => { c.fillStyle = this.ink; c.fillRect(x0 + ox, y + oy, x1 - x0 + 1, 2); };

    if (mode === 'open' || mode === 'small') {
      pupil(st.dx || 0, st.dy || 0, mode === 'small');
    } else if (mode === 'closed') {
      fillRows(e.y0, e.y1, this.skin);
      const y = Math.round(e.cy);
      const r = e.rows.get(y);
      lidLine(y, r[0] + 2, r[1] - 2);
    } else if (mode === 'smug' || mode === 'side' || mode === 'flat') {
      // đê tiện: heavy slanted lid. lid = covered fraction, slant > 0 drops the inner corner
      const lid = st.lid ?? (mode === 'flat' ? 0.42 : 0.5);
      const slant = st.slant ?? (mode === 'smug' ? 0.18 : 0);
      pupil(st.dx || 0, (st.dy ?? 2), mode === 'flat');
      const inner = idx === 0 ? 1 : -1;            // left eye's inner side is to the right
      const h = e.y1 - e.y0;
      for (let x = e.x0; x <= e.x1; x++) {
        const t = ((x - e.cx) / ((e.x1 - e.x0) / 2)) * inner;   // -1 outer … +1 inner
        const cut = Math.round(e.y0 + h * (lid + slant * t));
        for (let y = e.y0; y <= cut; y++) if (this.inside(e, x, y) || (e.rows.get(y) && x >= e.rows.get(y)[0] && x <= e.rows.get(y)[1])) this.px(x + ox, y + oy, this.skin);
        const r = e.rows.get(cut);
        if (r && x >= r[0] && x <= r[1]) { this.px(x + ox, cut + oy, this.ink); this.px(x + ox, cut + 1 + oy, this.ink); }
      }
    } else if (mode === 'x') {
      // X_X — giả chết
      fillRows(e.y0, e.y1, e.white);
      const r = Math.min(e.x1 - e.x0, e.y1 - e.y0) / 2 - 3;
      for (let k = -r; k <= r; k++) {
        const x = Math.round(e.cx + k), y1 = Math.round(e.cy + k), y2 = Math.round(e.cy - k);
        c.fillStyle = this.ink; c.fillRect(x + ox - 1, y1 + oy - 1, 3, 3); c.fillRect(x + ox - 1, y2 + oy - 1, 3, 3);
      }
    } else if (mode === 'half') {
      pupil(st.dx || 0, 3, false);
      const cut = Math.round(e.y0 + (e.y1 - e.y0) * 0.5);
      fillRows(e.y0, cut, this.skin);
      const r = e.rows.get(cut + 1);
      lidLine(cut, r[0], r[1]);
    } else if (mode === 'happy') {
      // ^ ^ eyes: skin fill + an arch of ink
      fillRows(e.y0, e.y1, this.skin);
      const hw = (e.x1 - e.x0) / 2 - 3;
      for (let x = Math.ceil(e.cx - hw); x <= Math.floor(e.cx + hw); x++) {
        const k = (x - e.cx) / hw;
        const y = Math.round(e.cy + 2 - 5 * (1 - k * k));
        c.fillStyle = this.ink; c.fillRect(x + ox, y + oy, 1, 3);
      }
    }
  }
}
