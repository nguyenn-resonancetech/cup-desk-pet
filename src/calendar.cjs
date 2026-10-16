// Google Calendar via the calendar's "secret address in iCal format".
// Minimal ICS parser: VEVENT + TZID + all-day skip + RRULE (DAILY/WEEKLY/MONTHLY,
// INTERVAL, COUNT, UNTIL, BYDAY) + EXDATE + RECURRENCE-ID overrides + CANCELLED.
const { net } = require('electron');

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseProp(line) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i), value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params = {};
  ps.forEach((p) => { const [k, v] = p.split('='); params[k.toUpperCase()] = (v || '').replace(/^"|"$/g, ''); });
  return { name: name.toUpperCase(), params, value };
}

const unescape = (s) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

// wall clock in an IANA zone → UTC ms
function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!tz) return new Date(y, mo - 1, d, h, mi, s).getTime();
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const off = (t) => {
      const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - t;
    };
    let t = guess - off(guess);
    t = guess - off(t);
    return t;
  } catch {
    return new Date(y, mo - 1, d, h, mi, s).getTime();
  }
}

function parseTime(prop) {
  const v = prop.value.trim();
  if (prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) return { allDay: true };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m.map((x, i) => (i && i < 7 ? +x : x));
  const tz = z ? 'UTC' : prop.params.TZID || null;
  return { y, mo, d, h, mi, s, tz, ms: zonedToUtc(y, mo, d, h, mi, s, z ? 'UTC' : tz) };
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function expand(ev, from, to) {
  const out = [];
  const st = ev.start, dur = ev.end ? ev.end.ms - st.ms : 30 * 60e3;
  const push = (ms) => { if (!ev.exdates.has(ms) && ms + dur >= from && ms <= to) out.push({ title: ev.title, start: ms, end: ms + dur, uid: ev.uid }); };
  if (!ev.rrule) { push(st.ms); return out; }
  const r = Object.fromEntries(ev.rrule.split(';').map((kv) => kv.split('=')));
  const freq = r.FREQ, interval = +(r.INTERVAL || 1);
  const count = r.COUNT ? +r.COUNT : Infinity;
  let until = Infinity;
  if (r.UNTIL) { const u = parseTime({ value: r.UNTIL.length === 8 ? r.UNTIL + 'T235959Z' : r.UNTIL, params: {} }); if (u && u.ms) until = u.ms; }
  const byday = r.BYDAY ? r.BYDAY.split(',').map((d) => DAYS.indexOf(d.slice(-2))) : null;
  const at = (dayUtc) => { const d = new Date(dayUtc); return zonedToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), st.h, st.mi, st.s, st.tz === 'UTC' ? 'UTC' : st.tz); };
  const base = Date.UTC(st.y, st.mo - 1, st.d);
  let n = 0;
  for (let i = 0; i < 4000 && n < count; i++) {
    let days = [];
    if (freq === 'DAILY') days = [base + i * interval * 864e5];
    else if (freq === 'WEEKLY') {
      const weekStart = base - new Date(base).getUTCDay() * 864e5 + i * interval * 7 * 864e5;
      days = (byday || [new Date(base).getUTCDay()]).slice().sort().map((wd) => weekStart + wd * 864e5).filter((d) => d >= base);
    } else if (freq === 'MONTHLY') {
      const d = new Date(base); days = [Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i * interval, d.getUTCDate())];
    } else if (freq === 'YEARLY') {
      const d = new Date(base); days = [Date.UTC(d.getUTCFullYear() + i * interval, d.getUTCMonth(), d.getUTCDate())];
    } else break;
    let past = false;
    for (const day of days) {
      const ms = at(day);
      if (ms > until || n >= count) { past = true; break; }
      n++;
      if (ms > to) { past = true; break; }
      push(ms);
    }
    if (past) break;
  }
  return out;
}

function parseICS(text, from, to) {
  const lines = unfold(text);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { exdates: new Set() }; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const p = parseProp(line); if (!p) continue;
    if (p.name === 'SUMMARY') cur.title = unescape(p.value);
    else if (p.name === 'UID') cur.uid = p.value;
    else if (p.name === 'DTSTART') cur.start = parseTime(p);
    else if (p.name === 'DTEND') cur.end = parseTime(p);
    else if (p.name === 'RRULE') cur.rrule = p.value;
    else if (p.name === 'STATUS') cur.status = p.value.toUpperCase();
    else if (p.name === 'RECURRENCE-ID') cur.recurId = parseTime(p);
    else if (p.name === 'EXDATE') p.value.split(',').forEach((v) => { const t = parseTime({ value: v, params: p.params }); if (t && t.ms) cur.exdates.add(t.ms); });
  }
  // overrides replace the original instance of their series
  for (const e of events) if (e.recurId && e.recurId.ms) {
    const master = events.find((m) => m.uid === e.uid && !m.recurId);
    if (master) master.exdates.add(e.recurId.ms);
  }
  const out = [];
  for (const e of events) {
    if (!e.start || e.start.allDay || !e.start.ms || e.status === 'CANCELLED') continue;
    if (e.recurId) { delete e.rrule; }
    out.push(...expand({ ...e, title: e.title || 'Cuộc họp' }, from, to));
  }
  return out.sort((a, b) => a.start - b.start);
}

async function upcoming(url) {
  if (!url) return [];
  const u = url.trim().replace(/^webcal:/i, 'https:');
  if (!/^https:\/\//i.test(u)) throw new Error('Link lịch phải bắt đầu bằng https://');
  const res = await net.fetch(u);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Không phải link iCal');
  const now = Date.now();
  return parseICS(text, now - 3600e3, now + 36 * 3600e3);
}

module.exports = { upcoming, parseICS };
