// One prank popup = one tiny game. The only way out is to play it.
const api = window.cup;
const q = new URLSearchParams(location.search);
const a = q.get('a') || 'anh';
const A = a.charAt(0).toUpperCase() + a.slice(1);
const T = (s) => s.replace(/\{a\}/g, a).replace(/\{A\}/g, A);
const body = document.getElementById('body');
const card = document.getElementById('card');
const FACE = '../assets/app-icon.png';

const html = (s) => { body.innerHTML = T(s); };
const $ = (s) => body.querySelector(s);
const shake = () => { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); };
const close = (msg) => {
  if (msg) { html(`<h1>${msg}</h1>`); setTimeout(() => api.popupClose(), 900); }
  else api.popupClose();
};

const GAMES = {
  yesyes() {
    html(`<h1>{A} có muốn chơi với Cúp không?</h1><p>Chọn đi, em đợi.</p>
      <div class="row"><button class="btn" id="y1"><span>Có</span></button><button class="btn" id="y2"><span>Có luôn</span></button></div>`);
    $('#y1').onclick = () => close('Em biết mà!');
    $('#y2').onclick = () => close('Yêu {a} nhất!');
  },
  tap() {
    let n = 10;
    html(`<h1>Bấm vào mặt em ${n} lần để đóng</h1>
      <div class="row"><img class="face" id="f" src="${FACE}" alt=""><span class="big" id="n">${n}</span></div>
      <p class="hint">Bấm mạnh tay lên, em không đau đâu.</p>`);
    $('#f').onclick = () => { n--; $('#n').textContent = n; if (n <= 0) close('Mặt em sưng rồi. Cảm ơn {a}.'); };
  },
  type() {
    const want = 'cúp đẹp trai';
    html(`<h1>Gõ "${want}" để đóng</h1><input type="text" id="i" placeholder="gõ vào đây…" autocomplete="off"><p class="hint">Gõ đúng từng chữ nha {a}.</p>`);
    const i = $('#i'); setTimeout(() => i.focus(), 100);
    i.oninput = () => { if (i.value.trim().toLowerCase().normalize('NFC') === want.normalize('NFC')) close('Chuẩn không cần chỉnh!'); };
    i.onkeydown = (e) => { if (e.key === 'Enter') shake(); };
  },
  quiz() {
    html(`<h1>Câu đố: Cái gì càng làm càng nhiều?</h1>
      <div class="row"><button class="opt" data-ok="1">Việc</button><button class="opt">Tiền</button><button class="opt">Tóc bạc</button><button class="opt">Calo</button></div>
      <p class="hint" id="h">Trả lời đúng mới được đóng.</p>`);
    body.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
      if (b.dataset.ok) close('Đúng! Vậy nên đừng làm nữa.');
      else { $('#h').textContent = 'Sai rồi {a} ơi, nghĩ lại đi.'.replace('{a}', a); shake(); }
    });
  },
  dodge() {
    let n = 0;
    html(`<h1>Popup này đóng dễ lắm</h1><p>Chỉ cần bấm nút Đóng thôi {a}.</p><div class="row"><button class="btn" id="c"><span>Đóng</span></button></div>`);
    $('#c').onmouseenter = () => { if (n < 2) { n++; api.popupDodge(); } };
    $('#c').onclick = () => { if (n < 2) { n++; api.popupDodge(); return; } close('Thôi được rồi, cho {a} đóng.'); };
  },
  stars() {
    html(`<h1>Đánh giá Cúp</h1><div class="stars">${[1, 2, 3, 4, 5].map((i) => `<button data-i="${i}">★</button>`).join('')}</div><p class="hint" id="h">Thật lòng nha {a}.</p>`);
    const bs = [...body.querySelectorAll('.stars button')];
    bs.forEach((b) => b.onclick = () => {
      const k = +b.dataset.i; bs.forEach((x, j) => x.classList.toggle('on', j < k));
      if (k === 5) setTimeout(() => close('5 sao! {A} đúng là người tinh tế.'), 250);
      else setTimeout(() => { bs.forEach((x) => x.classList.remove('on')); $('#h').textContent = `${k} sao?? Đánh giá lại đi.`; shake(); }, 450);
    });
  },
  grid() {
    html(`<h1>Chọn tất cả ô có Cúp</h1><div class="row"><div class="grid">${Array.from({ length: 9 }, () => `<button><img src="${FACE}" alt=""></button>`).join('')}</div>
      <div class="grow"><p class="hint" id="h">Chọn hết rồi bấm Xác nhận.</p></div></div><div class="row"><button class="btn" id="ok"><span>Xác nhận</span></button></div>`);
    const cells = [...body.querySelectorAll('.grid button')];
    cells.forEach((c) => c.onclick = () => c.classList.toggle('on'));
    $('#ok').onclick = () => {
      const left = cells.filter((c) => !c.classList.contains('on')).length;
      if (!left) close('Ô nào cũng có em. Vì em ở khắp mọi nơi.');
      else { $('#h').textContent = `Còn sót ${left} ô kìa {a}.`.replace('{a}', a); shake(); }
    };
  },
  hold() {
    html(`<h1>Giữ nút này 3 giây để chứng minh {a} thương em</h1><div class="meter" id="m">${'<i></i>'.repeat(10)}</div>
      <div class="row"><button class="btn" id="h"><span>Giữ nè</span></button></div>`);
    let t = null, k = 0; const cells = [...body.querySelectorAll('.meter i')];
    const paint = () => cells.forEach((c, j) => c.classList.toggle('full', j < k));
    $('#h').onpointerdown = () => { clearInterval(t); t = setInterval(() => { k++; paint(); if (k >= 10) { clearInterval(t); close('Cảm động quá, em khóc.'); } }, 300); };
    const stop = () => { clearInterval(t); if (k < 10) { k = 0; paint(); } };
    $('#h').onpointerup = stop; $('#h').onpointerleave = stop;
  },
  contract() {
    html(`<h1>Bản cam kết</h1><label class="chk"><input type="checkbox" id="c1">Tôi sẽ nghỉ giải lao 5 phút ngay sau khi đóng popup này.</label>
      <label class="chk"><input type="checkbox" id="c2">Tôi thừa nhận Cúp là con gà dễ thương nhất màn hình.</label>
      <div class="row"><button class="btn" id="s"><span>Ký tên</span></button></div>`);
    $('#s').onclick = () => { if ($('#c1').checked && $('#c2').checked) close('Đã ký. Có hiệu lực ngay.'); else shake(); };
  },
};

(GAMES[q.get('k')] || GAMES.yesyes)();
