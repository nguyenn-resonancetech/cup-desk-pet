// Runs inside the hidden music window (YouTube or any page with <video>/<audio>):
// finds the media element, sets volume, taps it with an analyser and reports kicks to Cúp.
const { ipcRenderer } = require('electron');

let volume = 0.8, media = null, ctx = null, an = null, buf = null;
let avg = 0, last = 0, n = 0, lastTitle = '';
ipcRenderer.on('player-volume', (_e, v) => { volume = v; if (media) media.volume = v; });

function hook(el) {
  if (media === el) return;
  media = el;
  el.volume = volume;
  try {
    ctx = ctx || new AudioContext();
    const src = ctx.createMediaElementSource(el);
    an = ctx.createAnalyser(); an.fftSize = 1024;
    src.connect(an); an.connect(ctx.destination);
    buf = new Uint8Array(an.frequencyBinCount);
  } catch { an = null; }
  el.addEventListener('ended', () => ipcRenderer.send('player-state', { ended: true }));
}

setInterval(() => {
  const el = document.querySelector('video, audio');
  if (el && el !== media) hook(el);
  if (!media) return;
  if (media.paused && !document.querySelector('.ad-showing')) media.play().catch(() => {});
  if (Math.abs(media.volume - volume) > 0.01) media.volume = volume;
  const t = document.title.replace(/\s*-\s*YouTube\s*$/, '');
  if (t && t !== lastTitle) { lastTitle = t; ipcRenderer.send('player-state', { title: t, playing: !media.paused }); }
}, 700);

setInterval(() => {
  if (!an || !media || media.paused) return;
  an.getByteFrequencyData(buf);
  let e = 0; for (let i = 1; i < 6; i++) e += buf[i];
  e /= 5;
  avg = avg * 0.93 + e * 0.07;
  const now = performance.now();
  if (e > avg * 1.15 && e > 110 && now - last > 300) {
    last = now; n++;
    ipcRenderer.send('player-beat', { n, e: Math.round(e) });
  }
}, 30);
