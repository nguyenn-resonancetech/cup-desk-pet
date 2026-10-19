// v0.2 — nhây hơn, lầy hơn. {a} = cách Cúp gọi bạn, {A} = viết hoa.

// Đạo lý — nghe rất sâu sắc, kết luận vẫn là: chơi đi.
export const DAOLY = [
  { t: 'Đời người như bóng câu qua cửa sổ. Mà cửa sổ của {a} là cửa sổ Excel. Đóng nó lại đi {a}.' },
  { t: 'Người xưa dạy: có công mài sắt có ngày nên kim. Nhưng giờ kim bán 5 ngàn một hộp rồi {a} ạ. Đi chơi đi.' },
  { t: 'Hạnh phúc không phải là đích đến, mà là hành trình. Hành trình từ cái ghế này ra quán trà sữa.' },
  { t: 'Đời có bao lâu mà hững hờ. Deadline thì còn hoài, nhưng em thì không có mãi đâu {a}.' },
  { t: 'Thất bại là mẹ thành công. Vậy nghỉ ngơi là bà ngoại thành công. Phải kính trọng bà chứ {a}.' },
  { t: 'Sống là phải biết đủ. Hôm nay {a} làm đủ rồi. Em biết vì em là gà, gà biết hết.' },
  { t: 'Chiếc lá còn biết rơi đúng lúc, sao {a} không biết nghỉ đúng lúc? Lúc đó là bây giờ.' },
  { t: 'Đừng để công việc định nghĩa {a}. Để em định nghĩa: {a} là người sắp đi chơi với em.' },
  { t: 'Nước chảy đá mòn, làm nhiều lưng mòn. Đứng dậy vươn vai rồi chơi với em một xíu.' },
  { t: 'Trên đời chỉ có hai thứ quý: thời gian và em. Thời gian thì {a} đang phí cho Excel rồi đó.' },
  { t: 'Người khôn ăn nói nửa chừng, để cho người dại nửa mừng nửa lo. Em nói nửa thôi: chơi đi.' },
];

// Than vãn vì cô đơn.
export const LONELY = [
  'Hôm nay không ai nói chuyện với em hết… em nói chuyện với cái taskbar.',
  'Cô đơn quá {a} ơi. Con trỏ chuột còn có người cầm, em thì không.',
  'Em đứng đây từ sáng, chân mỏi, bụng đói, lòng buồn. Mà {a} vẫn gõ phím.',
  'Người ta có đôi có cặp. Em có mỗi cái thùng rác làm bạn.',
  'Em hỏi thật: {a} còn thương em không, hay {a} thương deadline hơn?',
  'Buồn quá em muốn đọc thơ. Mà đọc một mình thì càng buồn. {A} nghe em đọc nha.',
];
export const PITY = [
  '{A} bỏ rơi em lâu quá… em gầy rộc đi rồi nè, nhìn đi.',
  'Em đói… em yếu… em chỉ cần {a} bấm vào em một cái thôi…',
  'Mấy tiếng rồi {a} không chơi với em. Em còn da bọc xương thôi.',
  'Trời ơi em teo tóp rồi. Chắc em sắp thành gà khô xé phay.',
];
export const FED = ['A! {A} nhớ em rồi! Em mập lại liền nè.', 'Cảm ơn {a}, em sống lại rồi. Lần sau đừng bỏ em lâu vậy nha.'];

// Thơ. Thơ có tác giả chỉ đọc câu mở đầu rồi Cúp "sáng tác tiếp".
export const POEMS = [
  { story: true, pages: [
    'Bài thơ đầu anh viết tặng em, là bài thơ anh kể về đôi dép…',
    '…rồi em quên mất đoạn sau. Đại khái là đôi dép đi đâu cũng có nhau.',
    'Còn em với {a}: {a} ngồi đây, em đứng đó. Hai mình không bằng đôi dép.',
    'Hết bài. Cảm động không {a}? Cảm động thì chơi với em đi.',
  ] },
  { story: true, pages: [
    'Chiều mộng hoà thơ trên nhánh duyên…',
    '…tới đây em quên rồi. Xuân Diệu viết hay quá, em nhớ không nổi.',
    'Em chế tiếp nha: chiều mộng hoà thơ, sáng mộng hoà cà phê. {A} mộng gì cũng được, miễn đừng mộng deadline.',
  ] },
  { pages: [
    'Cảm ơn đời mỗi sớm mai thức dậy, ta có thêm 5 ngàn để ăn xôi.',
    'Cảm ơn đời mỗi trưa hè oi ả, ta có thêm cái quạt để ngồi chơi.',
    'Cảm ơn đời mỗi chiều về mệt mỏi, ta có thêm con gà để than phiền.',
  ] },
  { pages: [
    'Sáng ra mở máy thấy mail,',
    'Mười cái deadline, chín cái hôm qua.',
    'Thôi thì gập máy về nhà,',
    'Ôm con gà Cúp hát ca cho đời.',
  ] },
  { pages: [
    'Gà kia đứng ở góc màn,',
    'Nhìn {a} làm việc mà than một mình.',
    'Bao giờ {a} mới thương tình,',
    'Tắt cái Excel, ra đình chơi chung.',
  ] },
  { pages: [
    'Em yêu thanh taskbar,',
    'Vì nó luôn ở dưới chân em.',
    'Còn {a} thì luôn ở trên mây…',
    '…mây deadline.',
  ] },
];

// Bỏ đi nhậu, về say. slur() làm giọng lè nhè.
export const LEAVE = ['Em ra ngoài xíu nha {a}… có hẹn với mấy đứa ở màn hình bên kia.', 'Em đi công chuyện, {a} đừng hỏi.', 'Đi đây. Đừng nhớ em.'];
export const DRUNK = [
  'Em hông có say. Em chỉ hơi lắc lư theo nhịp sống thôi {a}.',
  '{A} ơi, sao {a} có hai cái đầu vậy.',
  'Mấy đứa kia nó ép em. Em uống có một ly, thuốc lào có một điếu.',
  'Em thương {a} lắm. Thiệt đó. Hức.',
  'Cái màn hình này, sao nó nghiêng nghiêng.',
  'Hồi nãy em gặp con trỏ chuột ngoài kia, nó nói nó cũng mệt.',
];
export const SOBER = ['Tỉnh rồi… hồi nãy em có nói gì bậy không {a}?', 'Đầu em đau quá. Từ nay em bỏ nhậu. Từ ngày mai.'];
export function slur(s) {
  return s.toLowerCase()
    .replace(/([aăâeêioôơuưy])([ ,.])/g, (m, v, sp) => (Math.random() < 0.45 ? v + v + v : v) + sp)
    .replace(/\. /g, () => (Math.random() < 0.5 ? '… hức… ' : '… '))
    .replace(/, /g, () => (Math.random() < 0.3 ? '… ' : ', '))
    .replace(/\.$/, '…');
}

// Mặt khổng lồ.
export const FACE = ['Hãy nhìn vào mắt em…', 'Nhìn kỹ đi {a}. Em có đẹp không?', 'Không khen là em không thu nhỏ lại đâu.'];
export const FACE_DODGE = ['Ơ né!', 'Không có nút đó đâu {a}.', 'Bấm hụt rồi, hí hí.', 'Nút đó hư rồi, bấm nút kia đi.'];
export const FACE_OK = ['Biết ngay mà. Em đẹp nhất cái màn hình này.', 'Cảm ơn {a}! Em ngại quá, em thu nhỏ lại đây.'];

// Đu bám chuột.
export const HANG = ['Chơi với em điiii', 'Em không buông đâu!', '{A} đi đâu em theo đó!', '{A} ơiii chơi với emmm', 'Hông chịu đâuuu'];
export const HANG_FLUNG = ['Áaaaaa!', 'Ui da! {A} hất em!', 'Bạo lực gia đình!'];
export const HANG_END = ['Mỏi tay quá… nhưng em vẫn muốn chơi với {a}.', 'Thôi em buông. Nhưng {a} phải chơi với em đó.'];

// Chạy vòng quanh màn hình rồi mệt.
export const LAP_START = ['Em thấy khoẻ quá, em chạy một vòng nha!', 'Zoomies tới rồi {a} ơi!!', 'Tập thể dục giữa giờ nè, nhìn em nè!'];
export const TIRED = [
  'Hộc… hộc… em mệt quá {a} ơi… {a} mát-xa cho em đi…',
  'Chết em rồi… chân em rụng rồi… {a} bóp chân cho em đi…',
  'Hộc hộc… em chạy một vòng bằng {a} chạy deadline cả tuần… mát-xa đi {a}…',
];
export const MASSAGE_GO = ['Xoa xoa chuột lên người em đi {a}…', 'Ừ ừ, chỗ đó, chỗ đó…'];
export const MASSAGE_OK = ['Ư ư… sướng quá… em sống lại rồi!', 'Tay nghề {a} đỉnh quá. Mở tiệm đi, em làm khách quen.'];
export const MASSAGE_NO = ['Không mát-xa thì thôi… em tự nằm đây đến tối…', '{A} vô tình quá.'];

// Popup.
export const POPUP_INTRO = ['Em gửi {a} vài lời nhắn nè, đọc hết nha!', 'Ting ting! {A} có thư!'];
export const POPUP_DONE = ['{A} đóng hết rồi hả? Vậy giờ rảnh rồi, chơi với em đi!', 'Giỏi quá! Phần thưởng là… được chơi với em.'];

// Gu nhạc.
export const MUSIC_LOVE = [
  'Thái Hoàng lên là em lên! Quẩy đi {a}!!',
  'Đây mới gọi là nhạc! Lắc đi {a}, lắc cho deadline nó sợ!',
  'Bass này là bass của Thái Hoàng, nghe là biết. Bay luôn {a} ơi!',
];
export const MUSIC_MEH = [
  'Nhạc gì đây {a}… nghe như nhạc chờ tổng đài.',
  'Cái này không phải Thái Hoàng. Em nhảy cho có thôi đó nha.',
  'Gu {a} lạ ghê… em tôn trọng, nhưng em không nhún.',
  'Bài này mà cũng gọi là quẩy hả {a}? Em lắc mà không thấy phê.',
  'Lần sau mở Thái Hoàng đi {a}, em năn nỉ đó.',
];
export const MUSIC_SYNTH = ['Nhạc em tự chế đó, tạm chấp nhận được. Quẩy!'];

// Lịch họp.
export const MEET_30 = [
  'Còn {m} phút nữa mới họp "{title}" lận. Làm một ván game đi {a}!',
  'Còn {m} phút mới tới "{title}". Làm 1 set nhạc trước khi họp cho xôm đi {a}!',
  '"{title}" còn {m} phút. Đủ thời gian uống một ly trà sữa đó {a}.',
];
export const MEET_10 = [
  'Còn {m} phút họp "{title}". Nhảy một bài khởi động cho tỉnh đi {a}!',
  '{m} phút nữa họp. Đi rót nước rồi vào họp, tiện trốn được 5 phút.',
];
export const MEET_NOW = ['Thôi vào họp "{title}" đi {a}, họp xong mình chơi tiếp. Em giữ chỗ.', '"{title}" sắp bắt đầu rồi! Đi đi, em ở đây chờ.'];

// Hóng drama.
export const DRAMA = [
  '{A} ơi có drama nè: "{title}". Xôm lắm, vào hóng với em!',
  'Tin nóng hổi: "{title}". Làm việc gì giờ này, hóng đã {a}.',
  'Bên {src} đang sôi sục vụ "{title}". Em hóng tới quên ăn.',
];
