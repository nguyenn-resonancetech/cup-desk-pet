// Hóng drama: đọc RSS mục giải trí của mấy báo lớn, chấm điểm độ "xôm" theo từ khoá + độ mới.
const { net } = require('electron');

const FEEDS = [
  ['Kenh14', 'https://kenh14.vn/star.rss'],
  ['VnExpress', 'https://vnexpress.net/rss/giai-tri.rss'],
  ['Dân trí', 'https://dantri.com.vn/rss/giai-tri.rss'],
  ['Tuổi Trẻ', 'https://tuoitre.vn/rss/giai-tri.rss'],
  ['Thanh Niên', 'https://thanhnien.vn/rss/giai-tri.rss'],
  ['Znews', 'https://znews.vn/rss/giai-tri.rss'],
];

const HOT = {
  'drama': 6, 'ồn ào': 6, 'lùm xùm': 6, 'phốt': 6, 'scandal': 6, 'khẩu chiến': 6, 'cà khịa': 5,
  'đáp trả': 5, 'đá xéo': 5, 'rạn nứt': 5, 'tranh cãi': 5, 'bị chỉ trích': 5, 'tẩy chay': 5, 'unfollow': 5,
  'chia tay': 4, 'ly hôn': 4, 'tố cáo': 4, 'gây bão': 4, 'bức xúc': 4, 'xin lỗi': 3, 'mỉa mai': 4,
  'hẹn hò': 3, 'tình mới': 3, 'người yêu': 2, 'antifan': 4, 'cư dân mạng': 3, 'dân mạng': 3, 'netizen': 3,
  'chỉ trích': 3, 'nghi vấn': 3, 'bóc': 3, 'lộ': 2, 'mắng': 3, 'livestream': 2, 'gây sốt': 2, 'xôn xao': 4,
  'phản ứng': 2, 'lên tiếng': 3, 'vạch trần': 5, 'kiện': 3, 'tình cũ': 4, 'bạn gái': 2, 'bạn trai': 2,
};

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
  .replace(/\s+/g, ' ').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };

async function fetchFeed([src, url]) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await net.fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const xml = await res.text();
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => {
      const it = m[0];
      return { src, title: tag(it, 'title'), link: tag(it, 'link') || tag(it, 'guid'), desc: tag(it, 'description').slice(0, 300), date: Date.parse(tag(it, 'pubDate')) || 0 };
    }).filter((x) => x.title && /^https:\/\//.test(x.link));
  } catch { return []; } finally { clearTimeout(to); }
}

async function hottest() {
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  const now = Date.now();
  for (const it of all) {
    const text = (it.title + ' ' + it.desc).toLowerCase();
    let s = 0;
    for (const [k, w] of Object.entries(HOT)) if (text.includes(k)) s += (it.title.toLowerCase().includes(k) ? 1.5 : 1) * w;
    const ageH = it.date ? (now - it.date) / 3600e3 : 48;
    s *= ageH < 6 ? 1.6 : ageH < 24 ? 1.2 : ageH < 72 ? 0.8 : 0.4;
    it.score = Math.round(s * 10) / 10;
  }
  return all.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
}

module.exports = { hottest };
