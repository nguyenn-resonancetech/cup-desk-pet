// Cúp's brain: animation state machine, schedules (xúi trốn việc, uống nước, đi ăn, quẩy,
// trò xàm, lịch họp, drama), the speech bubble, drag & fall, cursor hang, click-through.
import { loadSprite } from './sprite.js';
import { Vinahouse, TrackPlayer } from './vinahouse.js';
import * as L from './lines.js';

const api = window.cup;
const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const g = stage.getContext('2d', { willReadFrequently: true });
const bubble = $('#bubble');
const rand = (a, b) => a + Math.random() * (b - a);
const MIN = 60e3;

let cfg, S, PS, C, W, H, wa, DEFAULT_MUSIC;
let winX, winY;
let sprite, icons = {};

// ---------------------------------------------------------------- state
const st = {
  mode: 'idle', since: 0, facing: 1, f: 0,
  walkTo: null, vy: 0, vx: 0, jump: [], land: 0,
  talking: false, actionsOpen: false,
  away: false, awaySince: 0, streakStart: Date.now(), lastStreak: 0,
  quietUntil: 0, party: null, beat: { k: 0, at: 0, drop: false, bar: 0 },
  taste: null, move: 'bounce', moveBeat: 0, lift: 0, flyBase: 0,
  expr: null, exprUntil: 0,
  gone: false, leaving: false, drunkUntil: 0, nextSlur: 0,
  skinny: 0, lastPlay: Date.now(),
  hang: null, massage: null, hidden: false,
  events: [], drama: [],
};
const eyes = { lx: 0, ly: 0, derp: null, blinkAt: 0, blinkUntil: 0, nextLook: 0, cursor: null };
const fx = [];
const next = {};
const last = {};

const MUL = { it: 2, vua: 1, lay: 0.45 };
const mul = () => MUL[cfg.frequency] || 1;
const vars = (extra = {}) => ({ a: cfg.pronoun || 'anh', ...extra });
const fillT = (t, x) => L.fill(t, vars(x));
// xáo bài: mỗi bộ thoại phát hết một lượt rồi mới lặp lại, nhớ qua cả những lần mở app
const bagKey = (arr) => { const k = JSON.stringify(arr[0]).slice(0, 48) + arr.length; let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) | 0; return 'bag' + h; };
function P(arr) {
  if (!arr || !arr.length) return undefined;
  if (arr.length === 1) return arr[0];
  const k = bagKey(arr); let b = store.get(k, null);
  if (!b || b.n !== arr.length || !b.left || !b.left.length) {
    const left = [...arr.keys()];
    for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    if (b && left[0] === b.last) left.push(left.shift());
    b = { n: arr.length, left, last: b ? b.last : -1 };
  }
  const i = b.left.shift(); b.last = i; store.set(k, b);
  return arr[i];
}
const pickT = (_key, arr) => P(arr);
const SLACKS = [...L.SLACK, ...L.SLACK_MORE];
// Google Maps "<món> gần đây" — Maps ranks nearby places, "ngon" leans it toward well-rated ones
const openMaps = (q) => api.openUrl('https://www.google.com/maps/search/' + encodeURIComponent(q.replace(/\s*gần đây$/, '') + ' gần đây'));
const POKES = [...L.POKE, ...L.POKE_MORE];
const DL_IDX = [...L.DL_OPEN.keys()];
function daolyText() {
  const r = Math.random();
  if (r < 0.3) return fillT(P(L.DAOLY_LONG));
  if (r < 0.45) return fillT(P(L.DAOLY).t);
  const i = P(DL_IDX);
  return fillT(L.DL_OPEN[i] + ' ' + (Math.random() < 0.55 ? L.DL_TWIST[i] : P(L.DL_GENERIC)));
}
const today = () => new Date().toISOString().slice(0, 10);
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function schedule() {
  const now = Date.now();
  next.slack = now + rand(4, 9) * MIN * mul();
  next.water = now + rand(35, 50) * MIN;
  next.party = now + rand(40, 70) * MIN * mul();
  next.antic = now + rand(2, 5) * MIN * mul();
  next.chat = now + rand(1, 2.5) * MIN * mul();
  next.dramaTalk = now + rand(4, 8) * MIN * mul();
  next.calAsk = now + rand(2, 4) * MIN;
  next.walk = now + rand(8, 20) * 1e3;
  next.calendar = now + 5e3;
  next.drama = now + 20e3;
}

// ---------------------------------------------------------------- boot
async function boot() {
  const init = await api.init();
  cfg = init.cfg; wa = init.workArea; DEFAULT_MUSIC = init.defaultMusic;
  W = init.winW; H = init.winH; setScale(cfg.scale);
  winX = init.bounds.x; winY = init.bounds.y;
  st.quietUntil = init.quietUntil;
  stage.width = W; stage.height = H;
  const lp = store.get('lastPlay', 0);
  st.lastPlay = Date.now() - lp < 12 * 3600e3 ? lp : Date.now();
  sprite = await loadSprite('../assets/pet/');
  for (const n of ['water', 'milktea', 'noodles', 'cash', 'gamepad', 'boombox']) {
    icons[n] = await new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = `../assets/icons/${n}.png`; });
  }
  icons.face = await new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = '../assets/app-icon.png'; });
  try { await document.fonts.load('16px VT323'); } catch {}
  schedule();
  ground(true);
  wireInput();
  api.on('cmd', onCmd);
  api.on('idle', onIdle);
  api.on('quiet', (until) => setQuiet(until));
  api.on('cfg', (c, m) => { if (c.icsUrl !== cfg.icsUrl) next.calendar = 0; const sc = c.scale !== S; cfg = c; if (sc) { setScale(c.scale); H = m.winH; stage.height = H; ground(true); } });
  api.on('overlay-done', onOverlayDone);
  api.on('popups-done', () => { played(); jump(); say(fillT(P(L.POPUP_DONE))); });
  api.on('music-beat', () => st.party && st.party.beat && st.party.beat());
  api.on('music-state', (s) => { if (s.title) st.musicTitle = s.title; });
  if (Date.now() < st.quietUntil) setMode('sleep');
  else setTimeout(() => hello(), 1200);
  requestAnimationFrame(loop);
}
function setScale(s) { S = s; PS = Math.round(100 * S); C = Math.max(1, Math.round(S)); }

// ---------------------------------------------------------------- geometry
const petLeft = () => Math.round((W - PS) / 2);
const petTop = () => H - PS;
const groundY = () => wa.y + wa.height - H;
function moveWin(x, y) {
  winX = Math.round(x); winY = Math.round(y);
  api.move(winX, winY);
}
function clampX(x) {
  // pet centre may go to the very screen edge; the window hangs off-screen a bit
  const half = W / 2, petHalf = 46 * S;
  return Math.max(wa.x - half + petHalf, Math.min(wa.x + wa.width - half - petHalf, x));
}
function ground(snap) { if (snap) moveWin(clampX(winX), groundY()); }
function hidePet(v) { st.hidden = v; stage.style.visibility = v ? 'hidden' : ''; if (v) { hideBubble(); setHover(false); } }

// ---------------------------------------------------------------- modes
function setMode(m) { st.mode = m; st.since = performance.now(); st.f = 0; }
const SPECIAL = ['drag', 'fall', 'dance', 'hang', 'tired', 'face', 'lap'];
const busy = () => !!st.skit || st.actionsOpen || SPECIAL.includes(st.mode) || st.gone || st.leaving || st.away || st.hidden || Date.now() < st.quietUntil;
function jump() { st.jump = [-4, -8, -10, -10, -8, -4, 0]; }
function expr(name, ms = 5000) { st.expr = name; st.exprUntil = performance.now() + ms; }
function played() {
  st.lastPlay = Date.now(); store.set('lastPlay', st.lastPlay);
  if (st.skinny > 0) { st.skinny = 0; jump(); setTimeout(() => say(fillT(P(L.FED))), 400); }
}

// ---------------------------------------------------------------- bubble
let typer = null, hideT = null, onTimeout = null, pageT = null;
function say(text, o = {}) {
  clearTimeout(hideT); clearInterval(typer); if (!o.keepPages) clearTimeout(pageT);
  if (st.hidden) return;
  const el = bubble.querySelector('.b-text');
  const ico = bubble.querySelector('.b-ico');
  const acts = bubble.querySelector('.b-actions');
  const meter = bubble.querySelector('.meter');
  const nm = bubble.querySelector('.b-name');
  nm.textContent = o.name || 'CÚP';
  el.className = 'b-text' + (o.big ? ' big' : '') + (o.poem ? ' poem' : '');
  el.textContent = '';
  if (o.icon && icons[o.icon]) { ico.src = icons[o.icon].src; ico.hidden = false; bubble.style.width = '348px'; }
  else { ico.hidden = true; bubble.style.width = o.poem ? '420px' : ''; }
  setMeter(o.meter, o.meterLabel);
  acts.innerHTML = '';
  (o.actions || []).forEach((a, i) => {
    const b = document.createElement('button');
    b.className = i === 0 ? 'btn' : 'btn-ghost';
    const sp = document.createElement('span'); sp.textContent = a.label; b.append(sp);
    b.onclick = (e) => { e.stopPropagation(); st.actionsOpen = false; onTimeout = null; played(); hideBubble(); setTimeout(a.fn, 160); };
    acts.append(b);
  });
  st.actionsOpen = !!(o.actions && o.actions.length);
  bubble.classList.toggle('below', st.mode === 'hang');
  bubble.hidden = false;
  bubble.classList.remove('hide');
  placeBubble();
  requestAnimationFrame(() => bubble.classList.add('show'));
  // typewriter + beak flaps
  let i = 0; st.talking = true;
  typer = setInterval(() => {
    i += text[i] === ' ' ? 2 : 1;
    el.textContent = text.slice(0, i);
    placeBubble();
    if (i >= text.length) { clearInterval(typer); st.talking = false; }
  }, o.slow ? 55 : 26);
  const ttl = o.ttl ?? (st.actionsOpen ? 30e3 : 3500 + text.length * 55);
  onTimeout = o.onTimeout || null;
  hideT = setTimeout(() => {
    const t = onTimeout; onTimeout = null;
    st.actionsOpen = false; hideBubble();
    if (t) setTimeout(t, 300);
  }, ttl);
}
function setMeter(n, label) {
  const meter = bubble.querySelector('.meter');
  meter.hidden = n === undefined || n === null;
  if (meter.hidden) return;
  meter.querySelector('.mlabel').textContent = label || 'H2O';
  const cells = meter.querySelector('.cells');
  if (cells.children.length !== 8) { cells.innerHTML = ''; for (let i = 0; i < 8; i++) { const c = document.createElement('i'); c.className = 'mc'; c.style.animationDelay = i * 40 + 'ms'; cells.append(c); } }
  [...cells.children].forEach((c, i) => c.classList.toggle('full', i < n));
}
// several bubbles in a row (poems, ỉ ôi complaints)
function sayPages(pages, o = {}) {
  let i = 0;
  const nextPage = () => {
    if (i >= pages.length) { o.done && o.done(); return; }
    const t = fillT(pages[i++]);
    const last_ = i === pages.length;
    o.onPage && o.onPage(i - 1);
    const ttl = 1800 + t.length * (o.slow ? 80 : 60) + (last_ && o.actions ? 26e3 : 0);
    say(t, { ...o, keepPages: true, ttl, meter: o.meters ? o.meters[i - 1] : o.meter, actions: last_ ? o.actions : undefined });
    pageT = setTimeout(last_ ? () => o.done && o.done() : nextPage, last_ ? ttl : 1900 + t.length * (o.slow ? 80 : 60));
  };
  nextPage();
}
function hideBubble() {
  clearTimeout(hideT); clearInterval(typer); st.talking = false;
  bubble.classList.remove('show'); bubble.classList.add('hide');
  setTimeout(() => { if (bubble.classList.contains('hide')) bubble.hidden = true; }, 240);
}
function placeBubble() {
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  const visL = Math.max(0, wa.x - winX) + 4, visR = Math.min(W, wa.x + wa.width - winX) - 10;
  const cx = st.mode === 'hang' && st.hang ? st.hang.cx : W / 2;
  let left = cx - bw / 2;
  left = Math.max(visL, Math.min(visR - bw, left));
  let top;
  if (st.mode === 'hang' && st.hang) top = st.hang.cy + PS / 2 + 10;
  else top = Math.max(0, petTop() + 2 * S + Math.min(0, jumpOff() - st.poleY) * S - bh - 18);
  bubble.style.left = left + 'px';
  bubble.style.top = top + 'px';
  bubble.style.setProperty('--tail', Math.max(24, Math.min(bw - 24, cx - left)) + 'px');
}
const jumpOff = () => (st.jump.length ? st.jump[0] : 0);
st.poleY = 0;

// ---------------------------------------------------------------- talk lines
function slackLine(forceTimely) {
  const d = new Date();
  const timely = L.TIMELY.filter((x) => x.when(d));
  const r = Math.random();
  const line = timely.length && (forceTimely || r < 0.15) ? P(timely)
    : r < 0.5 ? { t: daolyText() } : P(SLACKS);
  const t = fillT(line.t);
  expr(Math.random() < 0.6 ? 'smug' : 'smugTongue', 9000);
  if (line.act === 'money') {
    say(t, { icon: 'cash', actions: [
      { label: 'Cầm tiền', fn: () => { cashRain(); jump(); say(fillT(P(L.MONEY_YES))); } },
      { label: 'Không cần', fn: () => sulk() },
    ], onTimeout: () => say(fillT('Không trả lời là nhận tiền rồi nha {a}!'), {}) });
  } else if (line.act === 'steam') {
    say(t, { icon: 'gamepad', actions: [
      { label: 'Xem sale', fn: () => { api.openUrl('https://store.steampowered.com/specials'); jump(); say(fillT(P(L.STEAM_YES))); } },
      { label: 'Không có tiền', fn: () => say(fillT(P(L.STEAM_NO)), { icon: 'cash' }) },
    ] });
  } else {
    say(t, { icon: line.icon, actions: [
      { label: 'Ừ, chơi!', fn: () => { jump(); say(fillT(P(L.SLACK_YES))); } },
      { label: 'Thôi, làm tiếp', fn: () => sulk() },
    ], onTimeout: () => say(fillT('Không trả lời là đồng ý rồi nha {a}!')) });
  }
}
function sulk() { setMode('sulk'); expr('side', 4500); say(fillT(P(L.SLACK_NO))); }

function waterLine() {
  const line = P(L.WATER);
  say(fillT(line.t), { icon: 'water', actions: [
    { label: 'Uống rồi!', fn: () => {
      const k = 'water-' + today(); const n = store.get(k, 0) + 1; store.set(k, n);
      jump(); say(fillT(P(L.WATER_DONE), { n }), { meter: Math.min(8, n) });
    } },
    { label: 'Lát nữa', fn: () => { next.water = Date.now() + 10 * MIN; expr('side', 3000); say(fillT(P(L.WATER_LATER))); } },
  ] });
}

function foodLine(pool) {
  const line = P(pool || L.FOOD);
  expr('tongue', 6000);
  say(fillT(line.t), { icon: line.icon, actions: [
    { label: 'Đi ăn!', fn: () => {
      openMaps(/ngon|quán/.test(line.dish) ? line.dish : line.dish + ' ngon');
      jump(); say(fillT(P(L.FOOD_YES)));
    } },
    { label: 'Đang bận', fn: () => { setMode('sulk'); expr('side', 4000); say(fillT(P(L.FOOD_NO))); } },
  ] });
}

// meal slots: once per day each
const MEALS = [
  { id: 'trua', from: [11, 20], to: [12, 15], pick: (f) => !/trà sữa|bánh tráng/.test(f.dish) },
  { id: 'xe', from: [15, 0], to: [16, 0], pick: (f) => /trà sữa|bánh tráng/.test(f.dish) },
  { id: 'toi', from: [17, 45], to: [18, 45], pick: (f) => /ốc|phở|bún|quán/.test(f.dish) },
];
function mealDue() {
  if (!cfg.food) return null;
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  for (const s of MEALS) {
    if (m >= s.from[0] * 60 + s.from[1] && m < s.to[0] * 60 + s.to[1] && !store.get(`meal-${today()}-${s.id}`, false)) return s;
  }
  return null;
}

function hello() {
  jump();
  const d = new Date();
  const timely = L.TIMELY.filter((x) => x.when(d));
  if (timely.length && Math.random() < 0.5) say(fillT(P(timely).t));
  else say(fillT(P(L.HELLO)));
}

function poem() {
  const p = P(L.POEMS);
  expr('dreamy', 30e3);
  // short verse lines → the whole stanza in one bubble; story-style poems keep one paragraph per page
  const verse = !p.story;
  sayPages(verse ? [p.pages.join('\n')] : p.pages, { name: 'CÚP NGÂM THƠ', poem: true, slow: !verse, done: () => { st.expr = null; },
    actions: [{ label: 'Hay quá!', fn: () => { jump(); expr('blush', 3000); say(fillT('Biết ngay {a} có tâm hồn mà. Giờ chơi với em đi!')); } }, { label: 'Thôi đủ rồi', fn: () => sulk() }] });
}
function lonely() {
  expr('sad', 12000);
  say(fillT(P(L.LONELY)), { actions: [
    { label: 'Chơi với em nè', fn: () => { jump(); expr('blush', 3000); say(fillT(P(L.SLACK_YES))); } },
    { label: 'Để sau', fn: () => { expr('sad', 6000); say(fillT('Để sau là bao giờ… em đợi được, em quen rồi…')); } },
  ] });
}

// ---------------------------------------------------------------- party (music + choreography)
const TH = /th[aáàả]i\s*ho[aàáạ]ng|thai\s*hoang/i;
class RemotePlayer {
  constructor() { this.q = 0; this.playing = false; this.lastReal = 0; this.lastGhost = 0; this.n = 0; }
  start(url, vol, sec) {
    api.musicStart(url, vol); this.playing = true; this.t0 = performance.now();
    if (sec) this.cut = setTimeout(() => this.stop(true), sec * 1000);
  }
  beat() { this.q++; this.lastReal = performance.now(); }
  poll() {
    if (!this.playing) return [];
    const now = performance.now(), out = [];
    for (; this.q > 0; this.q--) out.push(this._ev());
    // no analyser beat yet (page loading, ads, silent intro) → ~130 BPM pulse
    if (now - this.t0 > 2500 && now - this.lastReal > 1600 && now - this.lastGhost > 462) { this.lastGhost = now; out.push(this._ev()); }
    return out;
  }
  _ev() { this.n++; return { s: 0, name: 'drop', bar: Math.floor(this.n / 4), b: 0 }; }
  stop(natural = false) {
    if (!this.playing) return;
    this.playing = false; clearTimeout(this.cut); api.musicStop();
    this.onEnd && this.onEnd(natural);
  }
}

async function startParty(manual, sec) {
  if (st.party) return;
  let src = cfg.musicSource, player, taste;
  const dur = sec ?? (manual ? 30 * 60 : 100);
  if (src === 'link' && !/^https:\/\//i.test(cfg.musicLink || '')) src = 'default';
  if (src === 'folder') {
    const files = await api.musicFiles();
    if (!files.length) src = 'default';
    else {
      const f = P(files);
      player = new TrackPlayer(); player.start(f, cfg.volume, dur);
      taste = TH.test(f.split(/[\\/]/).pop()) ? 'love' : 'meh';
    }
  }
  if (src === 'default' || src === 'link') {
    const url = src === 'default' ? DEFAULT_MUSIC : cfg.musicLink.trim();
    player = new RemotePlayer(); player.start(url, cfg.volume, dur);
    taste = src === 'default' ? 'love' : 'judging';
    if (taste === 'judging') api.pageTitle(url).then((t) => { if (st.party === player) { st.taste = TH.test(t) || /5mhxMaefHRA/.test(url) ? 'love' : 'meh'; tasteReact(); } });
  }
  if (src === 'synth') { player = new Vinahouse(); player.start(cfg.volume); taste = 'synth'; }
  st.party = player; st.taste = taste;
  st.beat = { k: 0, at: 0, drop: false, bar: 0 }; st.move = 'bounce'; st.moveBeat = 0;
  setMode('dance');
  player.onEnd = (natural) => endParty(natural);
  if (taste !== 'judging') tasteReact(manual);
  else say(fillT('Để em nghe thử gu {a} cái đã…'), { ttl: 3000 });
}
function tasteReact(manual) {
  if (!st.party) return;
  if (st.taste === 'love') {
    api.overlayShow({ mode: 'lights' });
    partyBubble(fillT(P(L.MUSIC_LOVE)));
  } else if (st.taste === 'meh') {
    expr('deadpan', 60e3);
    sayPages(L.MUSIC_MEH.slice().sort(() => Math.random() - 0.5).slice(0, 3), { name: 'CÚP CHÊ NHẠC', actions: [
      { label: 'Tắt nhạc', fn: () => stopParty(true) }, { label: 'Kệ anh', fn: () => { expr('side', 4000); } },
    ] });
    st.nextWhine = Date.now() + 25e3;
  } else partyBubble(manual ? null : fillT(P(L.MUSIC_SYNTH)));
}
function partyBubble(text) {
  say(text || fillT(P(L.PARTY_START)), { icon: 'boombox', ttl: 9000, actions: [
    { label: 'Tắt nhạc', fn: () => stopParty(true) },
    { label: 'Quẩy tiếp!', fn: () => {} },
  ] });
}
function endParty(natural) {
  st.party = null; st.taste = null; st.poleY = 0; st.expr = null;
  api.overlayHide();
  if (st.mode === 'dance') setMode('idle');
  if (natural) say(fillT(P(L.PARTY_END)));
}
function stopParty(byUser) {
  if (!st.party) return;
  const p = st.party; p.onEnd = null; p.stop(false); endParty(false);
  if (byUser) { setMode('sulk'); expr('side', 4000); say(fillT(P(L.PARTY_STOP))); }
}
const MOVES = ['bounce', 'pole', 'fly', 'spin', 'headbang', 'pole', 'fly'];
function onBeat(now) {
  const b = st.beat;
  if (st.taste === 'love' && b.k - st.moveBeat >= 8) {
    st.moveBeat = b.k;
    let m; do { m = P(MOVES); } while (m === st.move);
    st.move = m;
    if (m === 'fly') st.flyBase = winX;
  }
  api.overlayBeat({ k: b.k });
  const cols = ['#f87a71', '#ffc107', '#54d62c', '#a8cceb'];
  if (st.taste !== 'meh' || b.k % 4 === 0) {
    fx.push({ t: 'note', x: W / 2 + rand(-55, 55) * S, y: petTop() + rand(5, 30) * S - st.poleY * S, vx: rand(-0.5, 0.5), vy: -1.2, life: 1, col: cols[b.k % 4] });
    if (st.taste === 'love' && b.k % 2) fx.push({ t: 'spark', x: W / 2 + rand(-70, 70) * S, y: petTop() + rand(-15, 40) * S, vx: 0, vy: -0.3, life: 0.8, col: b.k % 4 === 1 ? '#ffc107' : '#f87a71' });
  }
}

// ---------------------------------------------------------------- antics (trò xàm)
function startFace() {
  if (busy() && st.mode !== 'idle') return;
  setMode('face'); hidePet(true);
  api.overlayShow({ mode: 'face' });
}
function startLap() {
  setMode('lap');
  say(fillT(P(L.LAP_START)), { ttl: 1500 });
  jump();
  setTimeout(() => { hidePet(true); api.overlayShow({ mode: 'lap' }); }, 1400);
}
function onOverlayDone(r) {
  if (r.mode === 'face') {
    setMode('idle'); hidePet(false); played();
    if (r.result === 'praised') { jump(); expr('blush', 5000); say(fillT(P(L.FACE_OK))); }
    else { sulk(); }
  }
  if (r.mode === 'lap') {
    hidePet(false); ground(true); setMode('tired');
    say(fillT(P(L.TIRED)), { actions: [
      { label: 'Mát-xa', fn: startMassage },
      { label: 'Tự đứng dậy đi', fn: () => { say(fillT(P(L.MASSAGE_NO))); setTimeout(() => { if (st.mode === 'tired') { setMode('sulk'); expr('side', 4000); } }, 5000); } },
    ], onTimeout: () => { if (st.mode === 'tired') { setMode('idle'); say(fillT(P(L.MASSAGE_NO))); } } });
  }
}
function startMassage() {
  st.massage = { got: 0, need: 2600, until: Date.now() + 25e3 };
  say(fillT(P(L.MASSAGE_GO)), { meter: 0, meterLabel: 'MAT-XA', ttl: 26e3 });
}
function massageTick(dist) {
  const m = st.massage; if (!m) return;
  m.got += dist;
  if (Math.random() < 0.08) fx.push({ t: 'heart', x: W / 2 + rand(-30, 30) * S, y: petTop() + rand(30, 60) * S, vx: rand(-0.3, 0.3), vy: -0.9, life: 1 });
  setMeter(Math.min(8, Math.floor((m.got / m.need) * 8)), 'MAT-XA');
  if (m.got >= m.need) {
    st.massage = null; played(); setMode('idle'); jump(); expr('blush', 5000);
    for (let i = 0; i < 6; i++) fx.push({ t: 'heart', x: W / 2 + rand(-50, 50) * S, y: petTop() + rand(10, 50) * S, vx: rand(-0.6, 0.6), vy: -1.4, life: 1, delay: i * 3 });
    say(fillT(P(L.MASSAGE_OK)));
  }
}

function startHang() {
  if (st.party) stopParty(false);
  hideBubble(); setMode('hang');
  st.hang = { t0: performance.now(), dur: rand(9, 14) * 1000, th: 0.5, om: 0, prev: null, vx: 0, fast: 0, cx: W / 2, cy: H / 2, nextWhine: 0 };
}
let cursorBusy = false, lastCursor = null;
function hangFrame(now) {
  const h = st.hang;
  if (!cursorBusy) { cursorBusy = true; api.cursor().then((p) => { lastCursor = { ...p, t: performance.now() }; cursorBusy = false; }); }
  if (!lastCursor) return;
  const hand = { x: lastCursor.x + 12, y: lastCursor.y + 26 };   // grabs the arrow's tail, never its tip
  const dt = 1 / 60;
  let ax = 0;
  if (h.prev) {
    const vx = (hand.x - h.prev.x) / dt, vy = (hand.y - h.prev.y) / dt;
    ax = (vx - h.vx) / dt; h.vx = vx;
    h.fast = Math.hypot(vx, vy) > 3200 ? h.fast + 1 : 0;
  }
  h.prev = hand;
  const len = 70;                                          // hand → wing (the arm)
  h.om += (-(2600 / len) * Math.sin(h.th) - 2.2 * h.om - (Math.max(-9000, Math.min(9000, ax)) / len) * Math.cos(h.th)) * dt;
  h.th = Math.max(-1.3, Math.min(1.3, h.th + h.om * dt));
  moveWin(hand.x - W / 2, hand.y - 24);
  h.hx = W / 2; h.hy = 24;
  // the bird hangs by its left wing: wing at the arm's end, body to the right of it
  h.wx = W / 2 + Math.sin(h.th) * len; h.wy = 24 + Math.cos(h.th) * len;
  h.cx = h.wx + 34 * S; h.cy = h.wy - 14 * S;
  if (now > h.nextWhine) { h.nextWhine = now + 3200; say(fillT(P(L.HANG)), { ttl: 2600 }); }
  if (h.fast >= 3) return releaseHang(true);
  if (now - h.t0 > h.dur) return releaseHang(false);
}
function releaseHang(flung) {
  const h = st.hang; st.hang = null;
  // keep the bird where it is on screen, switch back to the normal window layout, then fall
  const sx = winX + h.cx - PS / 2, sy = winY + h.cy - PS / 2;
  moveWin(sx - petLeft(), sy - petTop());
  st.vx = flung ? Math.max(-30, Math.min(30, h.vx / 120)) : 0; st.vy = flung ? -8 : 0;
  setMode('fall');
  bubble.classList.remove('below');
  if (flung) { say(fillT(P(L.HANG_FLUNG)), { ttl: 2000 }); expr('cry', 4000); }
  else st.afterFall = () => say(fillT(P(L.HANG_END)), { actions: [
    { label: 'Chơi!', fn: () => { jump(); expr('blush', 3000); say(fillT(P(L.SLACK_YES))); } },
    { label: 'Thôi', fn: () => sulk() },
  ] });
}

const POPUP_KINDS = ['yesyes', 'tap', 'type', 'quiz', 'dodge', 'stars', 'grid', 'hold', 'contract'];
function startPopups() {
  say(fillT(P(L.POPUP_INTRO)), { ttl: 3000 });
  expr('smug', 4000);
  const kinds = POPUP_KINDS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  setTimeout(() => api.popups(kinds), 900);
}

function leave() {
  say(fillT(P(L.LEAVE)), { ttl: 2600 });
  setTimeout(() => {
    const leftSide = winX + W / 2 < wa.x + wa.width / 2;
    st.leaving = true; st.facing = leftSide ? -1 : 1;
    st.walkTo = leftSide ? wa.x - W / 2 - PS : wa.x + wa.width - W / 2 + PS;
    st.leaveSide = leftSide ? -1 : 1;
    setMode('walk');
  }, 2200);
}
function goneNow() {
  st.leaving = false; st.gone = true; hidePet(true); setMode('idle');
  st.backAt = Date.now() + rand(3, 6) * MIN;
}
function comeBack() {
  st.gone = false; hidePet(false);
  const side = st.leaveSide || 1;
  moveWin(side > 0 ? wa.x + wa.width - W / 2 + PS : wa.x - W / 2 - PS, groundY());
  st.drunkUntil = Date.now() + rand(80, 120) * 1000; st.nextSlur = 0;
  st.facing = -side;
  st.walkTo = clampX(wa.x + (side > 0 ? wa.width - W / 2 - 260 : 260 - W / 2));
  setMode('walk');
}
const drunk = () => Date.now() < st.drunkUntil;

function dramaLine() {
  const seen = store.get('dramaSeen', []);
  const item = st.drama.find((d) => !seen.includes(d.link));
  if (!item) { next.drama = Math.min(next.drama, Date.now() + 60e3); return false; }
  seen.unshift(item.link); store.set('dramaSeen', seen.slice(0, 80));
  expr('smugTongue', 9000);
  say(fillT(P(L.DRAMA), { title: item.title.length > 90 ? item.title.slice(0, 88) + '…' : item.title, src: item.src }), { name: 'CÚP HÓNG DRAMA', actions: [
    { label: 'Hóng!', fn: () => { api.openUrl(item.link); jump(); say(fillT('Hóng xong kể em nghe với {a}!')); } },
    { label: 'Không quan tâm', fn: () => { expr('side', 3000); say(fillT('Không hóng thì thôi, em hóng một mình.')); } },
  ] });
  return true;
}

// ---------------------------------------------------------------- tán gẫu tự phát
function chatLine(fromPoke) {
  const r = Math.random();
  if (r < 0.42) { expr(P(['smug', 'tongue', 'blush', 'dreamy', 'side', null]), 5000); say(fillT(P(L.CHATTER))); }
  else if (r < 0.62 && !fromPoke) {
    const q = P(L.ASKS);
    expr('smug', 6000);
    say(fillT(q.t), { icon: q.maps ? (/trà|cà phê|sinh tố|chanh/.test(q.maps.join()) ? 'milktea' : 'noodles') : undefined, actions: q.a.map((label, i) => ({ label, fn: () => { if (q.maps) openMaps(q.maps[i]); jump(); expr('blush', 3000); say(fillT(q.r[i])); } })) });
  } else if (r < 0.9) { expr('smug', 8000); say(daolyText()); }
  else if (st.drama.length && !fromPoke) dramaLine();
  else say(fillT(P(L.LONELY)));
}

// ---------------------------------------------------------------- tiểu phẩm lầy
function runSkit(sk) {
  st.skit = { id: sk.id, mode: (sk.modes || [])[0] || sk.mode, t0: Date.now() };
  if (sk.mode === 'fart') setTimeout(() => { for (let i = 0; i < 6; i++) fx.push({ t: 'fart', x: W / 2 + (st.facing > 0 ? -40 : 40) * S + rand(-10, 10), y: H - 18 * S, vx: rand(-0.5, 0.5), vy: -0.35, life: 1.2, delay: i * 2 }); }, 1600);
  const acts = sk.actions && sk.actions.map(([label, reply]) => ({ label, fn: () => { st.skit = null; jump(); expr('blush', 3000); say(fillT(reply)); } }));
  sayPages(sk.pages, {
    actions: acts, meters: sk.mode === 'hack' ? [2, 5, 8] : undefined, meterLabel: 'CÀI ĐẶT',
    onPage: (i) => {
      if (!st.skit) return;
      if (sk.mode === 'snore') st.skit.mode = i < 2 ? 'snore' : 'awake';
      if (sk.mode === 'selfie' && i === 1) { st.flash = performance.now(); for (let k = 0; k < 4; k++) fx.push({ t: 'spark', x: W / 2 + rand(-60, 60) * S, y: petTop() + rand(0, 40) * S, vx: 0, vy: -0.4, life: 0.9, col: '#ffc107' }); }
    },
    done: () => { if (st.skit && st.skit.id === sk.id) st.skit = null; },
  });
}
function skitPose(p, now, f) {
  const k = st.skit; if (!k) return;
  switch (k.mode) {
    case 'snore':
      p.eyes = both('closed', 0, 0); p.head = [0, f % 20 < 10 ? 1 : 2]; p.beak = false;
      if (f % 12 === 0) fx.push({ t: 'z', x: W / 2 + 22 * S, y: petTop() + 14 * S, vx: 0.6, vy: -0.9, life: 1 });
      break;
    case 'awake': p.eyes = both('small', 0.8, -0.5); p.sweat = true; break;
    case 'dead': st.rot = 1; p.eyes = both('x', 0, 0); p.tongue = 3; p.beak = true; break;
    case 'fart': p.eyes = both('side', st.facing > 0 ? -1 : 1, 0.3); p.blush = true; break;
    case 'selfie': p.wingR = -3; p.eyes = both('smug', 0.7, -0.3); p.blush = true; p.tongue = f % 10 < 5 ? 1 : 0; break;
    case 'talk': p.wingL = f % 4 < 2 ? -3 : 0; p.eyes = both('open', 0, 0); break;
    case 'jacks':
      if (f % 6 === 0) jump();
      p.wingL = f % 2 ? -3 : 0; p.wingR = f % 2 ? -3 : 0; p.sweat = f > 30;
      break;
    case 'karaoke':
      p.eyes = both(f % 16 < 8 ? 'closed' : 'happy', 0, 0); p.beak = true; p.x = f % 8 < 4 ? -1 : 1; p.wingL = -3;
      if (f % 6 === 0) fx.push({ t: 'note', x: W / 2 + rand(-40, 40) * S, y: petTop() + rand(10, 30) * S, vx: rand(-0.4, 0.4), vy: -1.1, life: 1, col: P(['#f87a71', '#ffc107', '#54d62c', '#a8cceb']) });
      break;
    case 'phone': p.wingR = -3; p.head = [1, 0]; p.eyes = both('smug', -0.6, 0.2); break;
    case 'hack': p.eyes = both('flat', 0, 0); p.head = [0, f % 4 < 2 ? 0 : 1]; break;
    case 'side': p.eyes = both('side', -1, 0.3); p.sweat = true; break;
    case 'meditate':
      p.eyes = both('closed', 0, 0); p.wingL = -2; p.wingR = -2; p.head = [0, 0];
      if (f % 10 === 0) fx.push({ t: 'spark', x: W / 2 + rand(-50, 50) * S, y: petTop() + rand(0, 50) * S, vx: 0, vy: -0.5, life: 0.9, col: '#a8cceb' });
      break;
    case 'tiktok':
      st.facing = Math.floor(f / 3) % 2 ? 1 : -1; p.x = f % 4 < 2 ? -2 : 2; p.tongue = 2; p.eyes = both('smug', 0.5, 0); p.wingL = f % 2 ? -3 : 0;
      break;
    case 'small': p.eyes = both('small', P([-1, 1]), 0); p.sweat = true; break;
    case 'smug': p.eyes = both('smug', 0.6, 0.3); p.blush = true; break;
  }
}

function antic() {
  const neglect = (Date.now() - st.lastPlay) / MIN;
  const pool = [];
  const add = (w, fn) => pool.push([w, fn]);
  add(2.5, startLap); add(2.5, startHang); add(2, startFace); add(1.5, startPopups); add(1, leave);
  add(6, () => runSkit(P(L.SKITS)));
  add(2, poem); add(neglect > 45 ? 4 : 1.5, lonely);
  if (st.drama.length) add(3.5, dramaLine);
  let r = Math.random() * pool.reduce((s, x) => s + x[0], 0);
  for (const [w, fn] of pool) { if ((r -= w) <= 0) { fn(); return; } }
}

// ---------------------------------------------------------------- calendar + drama
async function refreshCalendar() {
  if (!cfg.icsUrl) { st.events = []; return; }
  const r = await api.calendar();
  if (r.events) st.events = r.events;
}
function meetingCheck() {
  const now = Date.now();
  const done = store.get('meetDone', {});
  for (const ev of st.events) {
    const m = (ev.start - now) / MIN;
    const phase = m > 25 && m <= 32 ? '30' : m > 7 && m <= 12 ? '10' : m > 0.3 && m <= 2.5 ? 'now' : null;
    if (!phase) continue;
    const key = `${ev.start}-${ev.title}-${phase}`;
    if (done[key]) continue;
    done[key] = 1; store.set('meetDone', Object.fromEntries(Object.entries(done).slice(-60)));
    const v = { title: ev.title, m: Math.round(m) };
    if (phase === 'now') {
      if (st.party) stopParty(false);
      say(fillT(P(L.MEET_NOW), v), { ttl: 15e3 });
    } else {
      expr('smug', 9000);
      say(fillT(P(phase === '30' ? L.MEET_30 : L.MEET_10), v), { actions: [
        { label: 'Quẩy 1 set', fn: () => startParty(true, Math.max(60, (ev.start - Date.now()) / 1000 - 180)) },
        { label: 'Làm 1 ván', fn: () => { api.openUrl('steam://open/games'); jump(); say(fillT('Một ván thôi nha {a}, em canh giờ họp cho.')); } },
      ] });
    }
    return true;
  }
  return false;
}
// Each user links their OWN Google Calendar (secret iCal address, stored only on their machine).
function askCalendar() {
  expr('smug', 9000);
  say(fillT('{A} ơi, cho em xem lịch họp của {a} đi. Em nhắc khéo trước giờ họp, còn dư thời gian thì mình chơi.'), { actions: [
    { label: 'Nối lịch', fn: () => { api.openSettings('calendar'); api.openUrl('https://calendar.google.com/calendar/r/settings'); jump(); say(fillT('Em mở trang cài đặt Google Calendar rồi đó. Copy "Địa chỉ bí mật ở định dạng iCal" dán vào Cài đặt của em nha.'), { ttl: 12e3 }); } },
    { label: 'Để sau', fn: () => { store.set('calAskSnooze', Date.now() + 3 * 864e5); expr('side', 3000); say(fillT('Ok, ba ngày nữa em hỏi lại.')); } },
  ] });
}

function nextMeetingLine() {
  if (!cfg.icsUrl) { askCalendar(); return; }
  const ev = st.events.find((e) => e.start > Date.now());
  if (!ev) { say(fillT('Hôm nay {a} hết họp rồi! Vậy là rảnh, chơi với em đi.')); return; }
  const m = Math.round((ev.start - Date.now()) / MIN);
  const when = m < 90 ? `${m} phút nữa` : new Date(ev.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  say(fillT(`Cuộc họp tới là "${ev.title}", ${when}. Trước đó còn thời gian chơi đó {a}.`));
}

// ---------------------------------------------------------------- commands / system
function onCmd(c) {
  if (st.gone && c !== 'stop') comeBack();
  if (st.mode === 'sleep' && !['stop', 'home'].includes(c)) wake();
  const A = {
    talk: () => slackLine(), party: () => startParty(true), stop: () => stopParty(true),
    water: waterLine, food: () => foodLine(),
    face: startFace, hang: startHang, lap: startLap, popups: startPopups, poem, lonely, leave,
    drama: async () => { if (!st.drama.length) st.drama = await api.drama(); if (!dramaLine()) say(fillT('Hôm nay showbiz yên bình quá {a}, chưa có drama gì xôm.')); },
    meeting: async () => { await refreshCalendar(); nextMeetingLine(); },
    home: () => api.cursor().then(async (p) => { wa = await api.workArea(p.x, p.y); moveWin(clampX(wa.x + wa.width - W / 2 - 120), groundY()); }),
    // debug-only shortcuts
    skinny: () => { st.lastPlay = Date.now() - 200 * MIN; }, drunk: () => { st.drunkUntil = Date.now() + 60e3; },
    back: () => comeBack(),
    edgeL: () => moveWin(clampX(-1e6), groundY()), edgeR: () => moveWin(clampX(1e6), groundY()),
    skit: () => runSkit(P(L.SKITS)), chat: () => chatLine(),
    askfood: () => { const q = L.ASKS.find((x) => x.maps && /trà sữa/.test(x.t)); say(fillT(q.t), { icon: 'milktea', actions: q.a.map((label, i) => ({ label, fn: () => { openMaps(q.maps[i]); say(fillT(q.r[i])); } })) }); },
  };
  if (c.startsWith('skit:')) { const sk = L.SKITS.find((x) => x.id === c.slice(5)); if (sk) runSkit(sk); return; }
  A[c] && A[c]();
}
function setQuiet(until) {
  st.quietUntil = until;
  if (until > Date.now()) { stopParty(false); hideBubble(); setMode('sleep'); }
  else wake();
}
function wake() {
  if (st.mode !== 'sleep') return;
  setMode('idle'); jump(); say(fillT(P(L.WAKE)));
}
function onIdle(sec) {
  const now = Date.now();
  if (sec >= 300 && !st.away) {
    st.away = true; st.awaySince = now - sec * 1000; st.streakStart = null;
    if (!st.party && st.mode === 'idle') { hideBubble(); setMode('sleep'); }
  } else if (st.away && sec < 20) {
    st.away = false; st.streakStart = now;
    const m = Math.round((now - st.awaySince) / MIN);
    if (Date.now() >= st.quietUntil && st.mode === 'sleep') {
      setMode('idle'); jump();
      if (m >= 5) say(fillT(P(L.BACK), { m }));
      for (const k of ['slack', 'water', 'party', 'antic']) next[k] = Math.max(next[k], now + rand(2, 6) * MIN);
    }
  } else if (!st.away && st.streakStart && now - st.streakStart > 100 * MIN && now - st.lastStreak > 60 * MIN && !busy()) {
    st.lastStreak = now;
    const h = ((now - st.streakStart) / 3600e3).toFixed(1).replace('.0', '').replace('.', ',');
    say(fillT(P(L.STREAK), { h }), { actions: [
      { label: 'Ừ, nghỉ', fn: () => { jump(); say(fillT(P(L.SLACK_YES))); st.streakStart = Date.now(); } },
      { label: 'Kệ anh', fn: () => sulk() },
    ] });
  }
}

// ---------------------------------------------------------------- scheduler (every 0.5 s)
function think() {
  const now = Date.now();
  if (st.f % 20 === 0 && !st.hidden) api.workArea(winX + W / 2, winY + H - 4).then((w) => { if (w) wa = w; });
  if (st.mode === 'sleep' && now >= st.quietUntil && st.quietUntil && !st.away) { st.quietUntil = 0; wake(); }
  if (now >= next.calendar) { next.calendar = now + 10 * MIN; refreshCalendar(); }
  if (now >= next.drama) { next.drama = now + 20 * MIN; api.drama().then((d) => { if (d && d.length) st.drama = d; }); }
  if (st.gone) { if (now >= st.backAt) comeBack(); return; }
  // neglect → thin and pitiful
  const neglect = (now - st.lastPlay) / MIN;
  st.skinny = neglect > 150 ? 1 : neglect > 90 ? 0.5 : 0;
  if (st.party && st.taste === 'meh' && now > (st.nextWhine || 0) && bubble.hidden) { st.nextWhine = now + rand(18, 30) * 1e3; say(fillT(P(L.MUSIC_MEH)), { ttl: 4000 }); }
  if (drunk() && now > st.nextSlur && bubble.hidden && !SPECIAL.includes(st.mode)) { st.nextSlur = now + rand(9, 15) * 1e3; say(L.slur(fillT(P(L.DRUNK))), { ttl: 5000, slow: true }); }
  if (st.drunkUntil && !drunk() && !st.leaving) { st.drunkUntil = 0; say(fillT(P(L.SOBER))); }
  if (busy() || (!bubble.hidden && st.talking)) return;
  if (st.events.length && bubble.hidden && meetingCheck()) return;
  const meal = mealDue();
  if (meal && bubble.hidden) {
    store.set(`meal-${today()}-${meal.id}`, true);
    const pool = L.FOOD.filter(meal.pick);
    foodLine(pool.length ? pool : L.FOOD); return;
  }
  if (!bubble.hidden) return;
  if (cfg.water && now >= next.water) { next.water = now + rand(40, 55) * MIN; waterLine(); return; }
  if (cfg.vinahouse && now >= next.party) { next.party = now + rand(45, 80) * MIN * mul(); startParty(false); return; }
  if (st.skinny >= 1 && now > (next.pity || 0)) { next.pity = now + rand(6, 10) * MIN; expr('cry', 8000); say(fillT(P(L.PITY))); return; }
  if (now >= next.antic) { next.antic = now + rand(3, 6) * MIN * mul(); antic(); return; }
  if (!cfg.icsUrl && now >= next.calAsk && now > store.get('calAskSnooze', 0)) { next.calAsk = now + 864e5; store.set('calAskSnooze', now + 864e5); askCalendar(); return; }
  if (now >= next.dramaTalk) { next.dramaTalk = now + rand(8, 14) * MIN * mul(); if (dramaLine()) return; }
  if (now >= next.chat) { next.chat = now + rand(1.5, 3.5) * MIN * mul(); chatLine(); return; }
  if (now >= next.slack) {
    next.slack = now + rand(4, 9) * MIN * mul();
    if (cfg.food && Math.random() < 0.15) foodLine(); else slackLine();
    return;
  }
  if (st.mode === 'idle' && now >= next.walk) {
    next.walk = now + rand(12, 40) * 1e3;
    const target = clampX(winX + rand(-1, 1) * Math.min(600, wa.width / 2));
    if (Math.abs(target - winX) > 30) { st.walkTo = target; st.facing = target > winX ? 1 : -1; setMode('walk'); }
    else if (Math.random() < 0.3) {
      const r = Math.random();
      if (r < 0.4) say(P(L.MUMBLE), { ttl: 1800 });
      else if (r < 0.7) expr(P(['smug', 'tongue', 'side', 'deadpan', 'crazy']), 2500);   // random đê tiện face
    }
  }
}

// ---------------------------------------------------------------- eyes + expressions
function updateEyes(now) {
  if (now > eyes.blinkAt) { eyes.blinkUntil = now + 130; eyes.blinkAt = now + rand(2200, 5500) * (Math.random() < 0.2 ? 0.15 : 1); }
  if (now > eyes.nextLook) {
    eyes.nextLook = now + rand(1200, 4200);
    const r = Math.random();
    eyes.derp = null;
    if (r < 0.45 && eyes.cursor) { eyes.lx = eyes.cursor.lx; eyes.ly = eyes.cursor.ly; eyes.follow = true; }
    else {
      eyes.follow = false;
      if (r < 0.62) eyes.derp = [{ lx: rand(-1, 1), ly: rand(-1, 1) }, { lx: rand(-1, 1), ly: rand(-1, 1) }];   // each eye its own way
      else if (r < 0.7) eyes.derp = [{ lx: 1, ly: 0.2 }, { lx: -1, ly: 0.2 }];                                  // cross-eyed
      else { eyes.lx = rand(-1, 1); eyes.ly = rand(-0.8, 0.6); }
    }
  }
  if (eyes.follow && eyes.cursor) { eyes.lx = eyes.cursor.lx; eyes.ly = eyes.cursor.ly; }
}
let cursorPoll = 0;
function pollCursor(now) {
  if (now - cursorPoll < 250 || st.hang) return; cursorPoll = now;
  api.cursor().then((p) => {
    const cx = winX + W / 2, cy = winY + petTop() + 45 * S;
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
    eyes.cursor = d < 900 ? { lx: Math.max(-1, Math.min(1, dx / 300)) * st.facing, ly: Math.max(-1, Math.min(1, dy / 260)) } : null;
  });
}
function eyePose(mode, jitter = 0) {
  return [0, 1].map((i) => {
    const v = eyes.derp ? eyes.derp[i] : { lx: eyes.lx, ly: eyes.ly };
    const o = sprite.look(i, v.lx + (jitter ? rand(-jitter, jitter) : 0), v.ly + (jitter ? rand(-jitter, jitter) : 0));
    return { mode, ...o };
  });
}
const both = (mode, lx, ly, extra = {}) => [0, 1].map((i) => ({ mode, ...sprite.look(i, lx, ly), ...extra }));
function applyExpr(p, now, f) {
  const e = st.expr; if (!e) return;
  if (now > st.exprUntil) { st.expr = null; return; }
  const lx = eyes.cursor ? eyes.cursor.lx : 0.6;
  switch (e) {
    case 'smug': p.eyes = both('smug', lx, 0.4); break;
    case 'smugTongue': p.eyes = both('smug', -0.7, 0.4); p.tongue = 2; p.blush = true; break;
    case 'side': p.eyes = both('side', -1, 0.3); break;
    case 'deadpan': p.eyes = both('flat', 0, 0); break;
    case 'tongue': p.eyes = both('smug', lx, 0.2); p.tongue = 1 + (f % 6 < 3 ? 1 : 0); break;
    case 'crazy': p.eyes = [{ mode: 'open', ...sprite.look(0, 1, 1) }, { mode: 'open', ...sprite.look(1, -1, -1) }]; p.tongue = 3; p.tongueSide = 2; break;
    case 'sad': p.eyes = both('small', 0, 0.6); p.tear = f; break;
    case 'cry': p.eyes = both('small', 0, 0.8); p.tear = f; p.beak = f % 4 < 2; break;
    case 'blush': p.eyes = both('happy', 0, 0); p.blush = true; break;
    case 'dreamy': p.eyes = both('half', 0, -1); p.blush = true; break;
  }
}

// ---------------------------------------------------------------- per-tick pose
function poseFor(now) {
  const f = st.f;
  const blink = now < eyes.blinkUntil;
  let p = { head: [0, 0], body: 0, eyes: eyePose(blink ? 'closed' : 'open') };
  st.rot = 0; st.poleY = st.mode === 'dance' && st.move === 'pole' ? st.poleY : 0;
  switch (st.mode) {
    case 'idle': {
      p.head = [0, (f % 20) < 10 ? 0 : 1];
      if (st.skit && st.skit.mode === 'dead') st.rot = 1;
      if ((f % 60) > 54) p.wingL = -1;
      break;
    }
    case 'walk': {
      const k = f % 4;
      if (k === 0) Object.assign(p, { footL: -2, body: -1, head: [0, -1], wingR: -1 });
      if (k === 2) Object.assign(p, { footR: -2, body: -1, head: [0, -1], wingL: -1 });
      let step = 2 * S * st.facing * (st.skinny >= 1 ? 0.5 : 1);
      if (drunk()) {   // lảo đảo: stumble, sometimes a step back
        step *= Math.random() < 0.25 ? -0.6 : 1.2;
        p.head = [f % 6 < 3 ? -1 : 1, 1];
      }
      const nx = winX + step;
      const free = st.leaving || (drunk() && (winX < wa.x - W / 2 + 40 * S || winX > wa.x + wa.width - W / 2 - 40 * S));
      if ((st.facing > 0 && nx >= st.walkTo) || (st.facing < 0 && nx <= st.walkTo)) {
        st.walkTo = null;
        if (st.leaving) goneNow(); else setMode('idle');
      } else moveWin(free ? nx : clampX(nx), winY);
      break;
    }
    case 'sleep': {
      p.eyes = [{ mode: 'closed' }, { mode: 'closed' }];
      p.head = [0, (f % 30) < 15 ? 1 : 2];
      if (f % 15 === 0) fx.push({ t: 'z', x: W / 2 + 22 * S, y: petTop() + 14 * S, vx: 0.6, vy: -0.9, life: 1 });
      break;
    }
    case 'sulk': {
      p.eyes = both('side', -1, 0.2);
      p.head = [0, 1];
      if (now - st.since > 4500) setMode('idle');
      break;
    }
    case 'drag': case 'fall': {
      p.eyes = eyePose('small', 0.5);
      p.wingL = f % 2 ? -3 : 0; p.wingR = f % 2 ? 0 : -2;
      p.footL = 1 + (f % 2); p.footR = 2 - (f % 2);
      p.beak = true;
      break;
    }
    case 'hang': {
      p.wingL = -3; p.wingR = f % 4 < 2 ? -2 : 0;
      p.footL = 2 + (f % 2); p.footR = 3 - (f % 2);
      p.eyes = both('small', 0, -1); p.beak = f % 3 === 0;
      if (f % 8 < 4) p.tear = f;
      break;
    }
    case 'tired': {
      st.rot = 1;
      p.eyes = both(f % 30 < 25 ? 'flat' : 'closed', 0, 0); p.beak = f % 4 < 2; p.tongue = 2; p.sweat = true;
      p.body = f % 6 < 3 ? 0 : 1;
      if (f % 9 === 0) fx.push({ t: 'drop', x: W / 2 + rand(-40, 40) * S, y: H - 30 * S, vx: rand(-0.4, 0.4), vy: -1.1, life: 1 });
      if (st.massage && Date.now() > st.massage.until) { st.massage = null; setMode('idle'); say(fillT(P(L.MASSAGE_NO))); }
      break;
    }
    case 'dance': danceFor(p, now, f); break;
  }
  if (st.land > 0) { st.land--; p.head = [0, 2]; p.body = 1; p.eyes = [{ mode: 'closed' }, { mode: 'closed' }]; }
  if (st.jump.length) { p.eyes = [{ mode: 'happy' }, { mode: 'happy' }]; p.wingL = -3; p.wingR = -3; p.footL = 1; p.footR = 1; }
  if (!['drag', 'fall', 'hang', 'tired', 'dance'].includes(st.mode) && !st.jump.length) applyExpr(p, now, f);
  if (st.skit && ['idle', 'walk', 'sulk'].includes(st.mode)) { if (st.mode === 'walk') setMode('idle'); skitPose(p, now, f); }
  if (st.skit && Date.now() - st.skit.t0 > 90e3) st.skit = null;
  if (drunk() && !['hang', 'tired'].includes(st.mode)) {
    p.blush = true; p.eyes = [{ mode: 'half', ...sprite.look(0, Math.sin(f / 3), 0.5) }, { mode: 'smug', lid: 0.6, ...sprite.look(1, Math.cos(f / 3), 1) }];
    if (f % 20 < 6) p.tongue = 1;
    if (f % 25 === 0) fx.push({ t: 'hic', x: W / 2 + 30 * S, y: petTop() + 30 * S, vx: 0.3, vy: -0.8, life: 1 });
  }
  if (st.talking && !['drag', 'fall', 'tired'].includes(st.mode)) p.beak = f % 2 === 0;
  if (st.skinny) p.skinny = st.skinny;
  if (st.skinny >= 1 && st.mode === 'idle' && !st.expr && !st.jump.length) { p.eyes = both('small', 0, 0.6); if (f % 40 < 12) p.tear = f; }
  return p;
}

function danceFor(p, now, f) {
  const b = st.beat;
  const since = now - b.at;
  const hit = since < 110;            // just on the beat
  const side = b.k % 2 ? 1 : -1;
  if (st.taste === 'meh') {           // dances "cho có": barely moves, deadpan face
    p.head = [0, hit ? 1 : 0];
    p.eyes = both('flat', -0.5, 0.2);
    return;
  }
  p.head = [b.drop ? -side : 0, hit ? 2 : 0];
  p.x = b.drop ? side * 2 : 0;       // lắc: whole bird sways on every beat
  p.body = hit ? 1 : 0;
  p.wingL = hit && side < 0 ? -3 : -1; p.wingR = hit && side > 0 ? -3 : -1;
  p.footL = !hit && side < 0 ? -2 : 0; p.footR = !hit && side > 0 ? -2 : 0;
  const phase = b.bar % 4;
  if (!b.drop) p.eyes = [{ mode: 'closed' }, { mode: 'closed' }];
  else if (phase === 0 || phase === 2) p.eyes = [{ mode: 'happy' }, { mode: 'happy' }];
  else if (phase === 1) p.eyes = [{ mode: 'open', ...sprite.look(0, 1, -0.6) }, { mode: 'open', ...sprite.look(1, -1, -0.6) }];
  else p.eyes = [{ mode: 'open', ...sprite.look(0, side, 0.8) }, { mode: 'open', ...sprite.look(1, -side, -0.8) }];
  p.beak = b.drop && (b.k % 4 === 0 || b.k % 4 === 1);
  if (st.taste !== 'love') return;
  const beatIn = b.k - st.moveBeat;
  switch (st.move) {
    case 'headbang':
      p.head = [0, hit ? 3 : -1]; p.eyes = both('closed', 0, 0); p.tongue = 3; p.x = 0;
      break;
    case 'spin':
      st.facing = (Math.floor(since / 120) + b.k) % 2 ? 1 : -1;
      p.eyes = [{ mode: 'open', ...sprite.look(0, 1, 1) }, { mode: 'open', ...sprite.look(1, -1, -1) }]; p.tongue = 2; p.tongueSide = 2;
      break;
    case 'pole': {
      // múa cột: climb up over 4 beats, spin around, slide down
      const up = beatIn < 4 ? beatIn / 4 : Math.max(0, 1 - (beatIn - 4) / 4);
      st.poleY = Math.round(up * 30);
      st.facing = b.k % 2 ? 1 : -1;
      p.wingL = -3; p.footL = -3; p.x = 0;
      p.eyes = both('smug', 0.8, 0.3); p.blush = true; p.tongue = beatIn % 2 ? 2 : 0;
      break;
    }
    case 'fly':
      p.wingL = f % 2 ? -3 : 1; p.wingR = f % 2 ? 1 : -3; p.footL = 2; p.footR = 2; p.x = 0;
      p.eyes = both('happy', 0, 0);
      break;
  }
}

// ---------------------------------------------------------------- FX (self-drawn pixel FX only)
const NOTE = ['..##', '..#.#', '..#..#', '..#', '..#', '###', '###'];
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
function bitmap(rows, x, y, cell, col) {
  g.fillStyle = '#161c24';
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(x + i * cell - C, y + j * cell - C, cell + 2 * C, cell + 2 * C); });
  g.fillStyle = col;
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(x + i * cell, y + j * cell, cell, cell); });
}
function drawSpark(x, y, s, col) {
  g.fillStyle = col;
  g.fillRect(x - s, y - s * 3, s * 2, s * 6); g.fillRect(x - s * 3, y - s, s * 6, s * 2);
}
function cashRain() {
  for (let i = 0; i < 4; i++) fx.push({ t: 'cash', x: W / 2 + rand(-60, 60), y: petTop() + 10 * S, vx: rand(-0.6, 0.6), vy: rand(-3.2, -2.2), life: 1, delay: i * 6 });
}
function drawFx() {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    if (p.delay > 0) { p.delay--; continue; }
    p.x += p.vx * C; p.y += p.vy * C; p.life -= p.t === 'cash' ? 0.03 : 0.035;
    if (p.t === 'cash' || p.t === 'drop') p.vy += 0.12;
    if (p.life <= 0) { fx.splice(i, 1); continue; }
    g.globalAlpha = p.life < 0.3 ? p.life / 0.3 : 1;
    const X = Math.round(p.x / C) * C, Y = Math.round(p.y / C) * C;
    if (p.t === 'z') { g.font = `${(9 + (1 - p.life) * 9) * C | 0}px VT323`; g.fillStyle = '#161c24'; g.fillText('Z', X, Y); }
    if (p.t === 'note') bitmap(NOTE, X, Y, 2 * C, p.col);
    if (p.t === 'heart') bitmap(HEART, X, Y, C + 1, '#f87a71');
    if (p.t === 'spark') drawSpark(X, Y, 2 * C, p.col);
    if (p.t === 'cash') g.drawImage(icons.cash, X - 48, Y - 40);
    if (p.t === 'fart') { const r = Math.round((1.3 - p.life) * 7 + 3) * C; g.fillStyle = '#9fd4a3'; g.fillRect(X - r, Y - r, 2 * r, 2 * r); g.fillStyle = '#d3e7c9'; g.fillRect(X - r + C, Y - r + C, r, r); }
    if (p.t === 'drop') { g.fillStyle = '#161c24'; g.fillRect(X - C, Y - C, 4 * C, 5 * C); g.fillStyle = '#a8cceb'; g.fillRect(X, Y, 2 * C, 3 * C); }
    if (p.t === 'hic') { const r = Math.round((1.2 - p.life) * 4 + 2) * C; g.fillStyle = '#161c24'; g.fillRect(X - r - C, Y - r - C, 2 * r + 2 * C, 2 * r + 2 * C); g.fillStyle = '#e2eef7'; g.fillRect(X - r, Y - r, 2 * r, 2 * r); }
    g.globalAlpha = 1;
  }
}
function drawPole() {
  const x = Math.round(W / 2 + 24 * S), top = Math.max(0, petTop() - 50 * S), w = Math.max(6, 6 * C);
  g.fillStyle = '#161c24'; g.fillRect(x - C, top, w + 2 * C, H - top);
  g.fillStyle = '#c4cdd5'; g.fillRect(x, top + C, w, H - top);
  g.fillStyle = '#ffffff'; g.fillRect(x + 1, top + C, Math.max(2, 2 * C), H - top);
  g.fillStyle = '#9aa5b1'; g.fillRect(x + w - 2, top + C, 2, H - top);
  g.fillStyle = '#161c24'; g.fillRect(x - 3 * C, top - C, w + 6 * C, 3 * C);
  g.fillStyle = '#ffc107'; g.fillRect(x - 2 * C, top, w + 4 * C, C);
}
// rubber arm from the raised wing up to the cursor
function drawArm(h) {
  const steps = Math.ceil(Math.hypot(h.hx - h.wx, h.hy - h.wy) / C);
  for (const [col, r] of [['#161c24', 3], ['#f59b23', 2], ['#ffc107', 1]]) {
    g.fillStyle = col;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round((h.wx + (h.hx - h.wx) * i / steps) / C) * C, y = Math.round((h.wy + (h.hy - h.wy) * i / steps) / C) * C;
      g.fillRect(x - r * C, y - r * C, 2 * r * C, 2 * r * C);
    }
  }
  // the gripping "hand": a chunky wing tip with three fingers around the cursor
  const X = Math.round(h.hx), Y = Math.round(h.hy);
  g.fillStyle = '#161c24'; g.fillRect(X - 7 * C, Y - 6 * C, 14 * C, 11 * C);
  g.fillStyle = '#f59b23'; g.fillRect(X - 6 * C, Y - 5 * C, 12 * C, 9 * C);
  g.fillStyle = '#ffc107'; g.fillRect(X - 6 * C, Y - 5 * C, 12 * C, 4 * C);
  g.fillStyle = '#161c24'; for (const fx_ of [-3, 0, 3]) g.fillRect(X + fx_ * C, Y - 5 * C, C, 4 * C);
}

// ---------------------------------------------------------------- loop
let lastTick = 0, lastFrame = 0;
function loop(now) {
  requestAnimationFrame(loop);
  // beats arrive every frame (audio clock), animation ticks at 10 fps (pet world = stepped)
  if (st.party) {
    for (const ev of st.party.poll()) {
      if (ev.s % 4 !== 0) continue;
      const b = st.beat; b.k++; b.at = now; b.drop = ev.name.startsWith('drop'); b.bar = ev.bar;
      onBeat(now);
    }
  }
  if (st.mode === 'fall') fall();      // gravity runs per frame so a long drop stays smooth
  if (st.mode === 'hang' && st.hang) hangFrame(now);
  flyFrame(now);
  const smooth = st.mode === 'hang' || st.lift > 0.5;
  if (now - lastTick >= 100) {
    lastTick = now; st.f++;
    if (st.jump.length) st.jump.shift();
    updateEyes(now); pollCursor(now);
    if (st.f % 5 === 0) think();
    draw(now);
  } else if (fx.length || smooth) draw(now, true);
  lastFrame = now;
}
function flyFrame(now) {
  const flying = st.mode === 'dance' && st.taste === 'love' && st.move === 'fly';
  const floating = st.skit && st.skit.mode === 'meditate';
  const target = flying ? 240 : floating ? 46 : 0;
  if (!flying && !floating && st.lift < 0.5) { if (st.lift) { st.lift = 0; moveWin(clampX(winX), groundY()); } return; }
  st.lift += (target - st.lift) * 0.04;
  const sway = flying ? Math.sin(now / 520) * 160 : 0;
  moveWin(clampX((flying ? st.flyBase + sway : winX)), groundY() - st.lift + Math.sin(now / 260) * (flying ? 14 : 0));
}

let lastPose = null;
function draw(now, fxOnly) {
  g.clearRect(0, 0, W, H);
  if (st.hidden) return;
  if (!fxOnly || !lastPose) lastPose = poseFor(now);
  const img = sprite.render(lastPose);
  g.imageSmoothingEnabled = false;
  if (st.mode === 'dance' && st.move === 'pole' && st.taste === 'love' && st.facing > 0) drawPole();
  g.save();
  if (st.mode === 'hang' && st.hang) {
    const h = st.hang;
    g.drawImage(img, Math.round(h.cx - PS / 2), Math.round(h.cy - PS / 2), PS, PS);
    drawArm(h);
  } else if (st.rot) {
    // nằm xõng xoài: lying on its side, feet to the right
    g.translate(Math.round(W / 2 - 50 * S), Math.round(H + 10 * S));
    g.rotate(-Math.PI / 2);
    g.drawImage(img, 0, 0, PS, PS);
  } else {
    const x = petLeft() + Math.round((lastPose.x || 0) * S), y = petTop() + Math.round((jumpOff() - st.poleY) * S);
    const flip = st.facing < 0 && st.mode !== 'sulk' || st.facing > 0 && st.mode === 'sulk';
    if (flip) { g.translate(x + PS, y); g.scale(-1, 1); g.drawImage(img, 0, 0, PS, PS); }
    else g.drawImage(img, x, y, PS, PS);
  }
  g.restore();
  if (st.mode === 'dance' && st.move === 'pole' && st.taste === 'love' && st.facing < 0) drawPole();
  drawFx();
  if (st.flash && performance.now() - st.flash < 160) { g.globalAlpha = 0.7 * (1 - (performance.now() - st.flash) / 160); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (!bubble.hidden) placeBubble();
}

// ---------------------------------------------------------------- input: click-through, poke, drag, massage
let hovering = false, press = null, lastMove = null;
function hit(x, y) {
  if (st.hidden) return false;
  if (!bubble.hidden) {
    const r = bubble.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom + 14) return true;
  }
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return g.getImageData(x | 0, y | 0, 1, 1).data[3] > 0;
}
function setHover(v) { if (v !== hovering) { hovering = v; api.ignoreMouse(!v); document.body.style.cursor = v ? (st.massage ? 'pointer' : 'grab') : ''; } }

function wireInput() {
  window.addEventListener('mousemove', (e) => {
    if (press) return;
    const h = hit(e.clientX, e.clientY);
    setHover(h);
    if (st.massage && h && lastMove) massageTick(Math.hypot(e.screenX - lastMove.x, e.screenY - lastMove.y));
    lastMove = { x: e.screenX, y: e.screenY };
  });
  window.addEventListener('mouseleave', () => { if (!press) setHover(false); lastMove = null; });
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || st.mode === 'hang') return;
    stage.setPointerCapture(e.pointerId);
    press = { sx: e.screenX, sy: e.screenY, wx: winX, wy: winY, moved: false, lastY: e.screenY, vy: 0 };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!press || st.massage) return;
    const dx = e.screenX - press.sx, dy = e.screenY - press.sy;
    if (!press.moved && Math.hypot(dx, dy) > 5) {
      press.moved = true; played();
      if (st.party) stopParty(false);
      setMode('drag'); hideBubble();
      if (Math.random() < 0.7) say(fillT(P(L.DRAG)), { ttl: 1600 });
      document.body.style.cursor = 'grabbing';
    }
    if (press.moved) {
      press.vy = e.screenY - press.lastY; press.lastY = e.screenY;
      if (dx) st.facing = dx > 0 ? 1 : -1;
      moveWin(press.wx + dx, press.wy + dy);
    }
  });
  stage.addEventListener('pointerup', async (e) => {
    if (!press) return;
    const p = press; press = null;
    if (p.moved) {
      wa = await api.workArea(winX + W / 2, winY + H - 4);
      st.vy = Math.max(-6, Math.min(12, p.vy)); st.vx = 0;
      if (winY > groundY()) moveWin(clampX(winX), groundY());
      else { moveWin(clampX(winX), winY); setMode('fall'); }
      if (st.mode !== 'fall') landed();
    } else poke();
    setHover(hit(e.clientX, e.clientY));
  });
  stage.addEventListener('contextmenu', (e) => { e.preventDefault(); api.contextMenu(); });
}

function fall() {
  st.vy = Math.min(st.vy + 1.1, 40);
  const y = winY + st.vy, x = st.vx ? clampX(winX + st.vx) : winX;
  st.vx *= 0.97;
  if (y >= groundY()) { moveWin(clampX(x), groundY()); landed(); return; }
  moveWin(x, y);
}
function landed() {
  setMode('idle'); st.land = 2; st.vx = 0;
  if (st.afterFall) { const f = st.afterFall; st.afterFall = null; setTimeout(f, 300); return; }
  if (Math.random() < 0.6) setTimeout(() => say(fillT(P(L.LAND)), { ttl: 2200 }), 250);
}

function poke() {
  played();
  if (st.mode === 'sleep') { if (Date.now() < st.quietUntil) { say('Zzz… (em đang ngủ, chọc nữa em dậy đó)', { ttl: 2200 }); return; } wake(); return; }
  if (st.mode === 'tired') { if (!st.massage) startMassage(); return; }
  if (st.party) { partyBubble(fillT('Đang quẩy mà {a}! Tắt hả?')); return; }
  if (st.actionsOpen) return;
  jump();
  const now = Date.now();
  st.pokes = (st.pokes || []).filter((t) => now - t < 7000); st.pokes.push(now);
  if (st.pokes.length >= 3) {               // chọc liên tục → leo thang
    const n = st.pokes.length + (st.pokeStreak || 0); st.pokeStreak = (st.pokeStreak || 0) + 1;
    expr(n > 6 ? 'crazy' : 'side', 2600);
    say(fillT(P(L.POKE_SPAM), { n, N: n }), { ttl: 2400 });
    return;
  }
  st.pokeStreak = 0;
  // a poke is the perfect moment to tempt you again
  const r = Math.random();
  if (r < 0.22) slackLine();
  else if (r < 0.36) { expr('smug', 7000); say(daolyText()); }
  else if (r < 0.44) chatLine(true);
  else { expr(P(['tongue', 'smugTongue', 'crazy', 'blush', 'smug', 'side']), 2600); say(fillT(P(POKES)), { ttl: 2800 }); }
}

window.__cup = { st, eyes, next, drop: () => { moveWin(winX, winY - 700); st.vy = 0; setMode('fall'); } };   // CUP_DEBUG handle
boot();
