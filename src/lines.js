// Kho thoại của Cúp. {a} = cách Cúp gọi bạn (anh/chị/sếp…), {A} = viết hoa đầu câu.
// Mỗi câu có thể kèm icon (assets/icons/<icon>.png) và kiểu nút (actions).

export const SLACK = [
  { t: '1 giờ {a} kiếm được bao nhiêu tiền? 300k đây {a} cầm lấy, và chơi với em đi.', icon: 'cash', act: 'money' },
  { t: 'Công việc của {a} còn ở đó mãi chứ có mất đi đâu mà sợ? Cứ chơi đi {a}.' },
  { t: '{A} đã làm cả ngày rồi, {a} phải chú ý bản thân mình chứ. Steam hôm nay sale 45% kìa {a} ơi.', icon: 'gamepad', act: 'steam' },
  { t: 'Người xưa có câu: việc hôm nay chớ để ngày mai. Để ngày kia luôn cho chắc.' },
  { t: 'Deadline là do con người đặt ra. Mà {a} cũng là con người. Vậy {a} có quyền dời nó.' },
  { t: 'Em vừa kiểm tra rồi: nếu {a} nghỉ 15 phút thì trái đất vẫn quay. Nó vẫn quay thật.' },
  { t: 'Làm việc chăm chỉ thì được gì? Được thêm việc. {A} nghĩ kỹ chưa?' },
  { t: 'Thành công không đến từ việc ngồi lì 8 tiếng. Nó đến từ việc chơi với em 8 phút.' },
  { t: '{A} nhìn màn hình lâu quá, mắt {a} sắp vuông như pixel của em rồi kìa.' },
  { t: 'Nghỉ ngơi là một phần của công việc. Vậy chơi game cũng là làm việc. Logic của em hoàn hảo.', icon: 'gamepad', act: 'steam' },
  { t: 'Excel không biết buồn, nhưng em thì có. {A} chọn đi.' },
  { t: '{A} có biết chữ "Cúp" trong tên em nghĩa là gì không? Là cúp làm đó {a}.' },
  { t: 'Em là phi công. Em chở {a} bay khỏi đống việc này ngay bây giờ được. Thắt dây an toàn chưa?' },
  { t: 'Cuộc đời thì ngắn, mà file báo cáo thì dài. Chọn cái ngắn mà sống {a} ơi.' },
  { t: 'Một con gà khôn ngoan từng nói: "Cục tác". Dịch ra là: nghỉ đi.' },
  { t: 'Hôm nay {a} làm đủ rồi. Em không biết {a} làm gì, nhưng chắc chắn là đủ rồi.' },
  { t: 'Làm xong sớm thì người ta giao thêm. Làm chậm thôi {a}, cái đó gọi là chiến lược.' },
  { t: 'Email đó để mai trả lời cũng được. Người gửi giờ này cũng đang trốn việc như {a} thôi.' },
  { t: 'Em mới đọc một nghiên cứu: người hay nghỉ giải lao sống lâu hơn. Nghiên cứu do em thực hiện.' },
  { t: 'Bàn phím của {a} vừa nói với em là nó mệt lắm rồi. Cho nó nghỉ đi {a}.' },
  { t: 'Làm thì lúc nào làm chẳng được. Chơi thì phải chơi lúc còn trẻ. Mà {a} đang trẻ mà.' },
  { t: 'Task này để "{a} của tương lai" làm. Còn {a} của hiện tại thì đi chơi với em.' },
  { t: 'Đời có ba thứ không nên vội: ăn, ngủ và làm việc. Hai thứ đầu thì nên vội.' },
  { t: 'Em đã nhịn không làm phiền {a} cả buổi. Giờ tới lượt {a} nhịn làm việc 15 phút với em.' },
  { t: '{A} bấm Ctrl+S rồi chứ? Rồi thì nghỉ được rồi đó.' },
  { t: 'Ngồi lâu hại lưng. Lưng hỏng thì không làm việc được. Vậy nghỉ bây giờ là để làm việc lâu dài. Đúng hông?' },
  { t: 'Sếp {a} giờ này chắc cũng đang lướt điện thoại. Em đoán vậy, mà em đoán hay trúng lắm.' },
  { t: 'Tiền thì kiếm lúc nào chả được, còn em thì chỉ có một. 300k nữa nè, chơi với em đi.', icon: 'cash', act: 'money' },
  { t: '{A} ơi, mở game lên một trận thôi. Một trận thôi. Em hứa là một trận. Em nói dối đó.', icon: 'gamepad', act: 'steam' },
  { t: 'Nếu {a} tắt em đi, em không giận đâu. Em chỉ ngồi nhìn {a} thôi. Nhìn rất lâu.' },
];

// Theo giờ / theo ngày — chèn vào khi đúng lúc.
export const TIMELY = [
  { when: (d) => d.getHours() >= 6 && d.getHours() < 10, t: 'Mới sáng ra làm gì vội, ly cà phê còn chưa nguội kìa {a}.' },
  { when: (d) => d.getHours() >= 6 && d.getHours() < 10, t: 'Sáng nay trời đẹp. Đẹp kiểu không nên làm việc.' },
  { when: (d) => d.getHours() >= 13 && d.getHours() < 15, t: 'Giờ này cả công ty đang gật gù. {A} chợp mắt 15 phút đi, em canh cho.' },
  { when: (d) => d.getHours() >= 17 && d.getHours() < 19, t: 'Gần giờ về rồi. Giờ làm thêm cũng không xong đâu, nghỉ luôn cho tròn {a}.' },
  { when: (d) => d.getHours() >= 21 || d.getHours() < 4, t: 'Khuya rồi {a} ơi. Làm nữa là em mách mẹ {a} đó.' },
  { when: (d) => d.getDay() === 1, t: 'Thứ Hai là ngày khởi động. Mà khởi động thì phải từ từ, kẻo chấn thương.' },
  { when: (d) => d.getDay() === 5, t: 'Thứ Sáu rồi {a}! Tinh thần cuối tuần bắt đầu từ bây giờ chứ không phải từ thứ Bảy.' },
  { when: (d) => d.getDay() === 0 || d.getDay() === 6, t: 'Cuối tuần mà {a} mở máy làm gì? Em sẽ giả vờ như không thấy.' },
];

export const WATER = [
  { t: '{A} uống nước chưa? Em là gà mà còn biết uống nước đó.' },
  { t: 'Nhắc nhẹ: {a} chưa uống nước lâu lắm rồi. Uống đi rồi mình bàn tiếp chuyện trốn việc.' },
  { t: 'Cơ thể {a} 70% là nước, giờ chắc còn 60%. Châm thêm đi {a}.' },
  { t: 'Một ngụm nước bằng mười ngụm deadline. Câu này em mới nghĩ ra, hay không?' },
  { t: 'Đi rót nước đi {a}, xong tiện đường đi dạo một vòng. Combo trốn việc hợp pháp.' },
  { t: 'Môi {a} khô rồi kìa. Em ngồi tận góc màn hình còn thấy.' },
];
export const WATER_DONE = [
  'Ngoan lắm! Ly thứ {n} hôm nay rồi đó.',
  'Ực ực. Em uống ké một ngụm tưởng tượng. Ly thứ {n}!',
  'Tuyệt vời. {A} giờ mọng nước như trái dưa hấu. Ly thứ {n}.',
];
export const WATER_LATER = [
  'Lát nữa là bao giờ? Héo như em thì sao.',
  'Được rồi, nhưng em đếm giờ đó nha.',
];

// Những món Cúp thích. dish = từ khoá tìm quán gần đây.
export const FOOD = [
  { t: 'Trưa rồi {a} ơi, đi ăn bún đậu mắm tôm không? Em ăn đậu, {a} ăn mắm.', icon: 'noodles', dish: 'bún đậu mắm tôm' },
  { t: 'Em thèm trà sữa trân châu đường đen quá. {A} không thèm à? Thèm đi.', icon: 'milktea', dish: 'trà sữa' },
  { t: 'Chiều chiều phải có bánh tráng trộn, đó là luật. Em không đặt ra luật nhưng em tuân thủ.', icon: 'milktea', dish: 'bánh tráng trộn' },
  { t: 'Đi ăn phở không {a}? Ăn gì cũng được, miễn đừng là cơm gà. Em xin {a} đó.', icon: 'noodles', dish: 'phở' },
  { t: 'Đói thì không làm việc được, mà làm việc thì đói. Giải pháp duy nhất: đi ăn.', icon: 'noodles', dish: 'quán ăn' },
  { t: 'Tối nay đi ăn ốc không {a}? Nghe nói ốc len xào dừa ngon lắm, em chưa ăn vì em là gà.', icon: 'noodles', dish: 'quán ốc' },
  { t: 'Bụng {a} vừa kêu, em nghe thấy. Hoặc là bụng em. Dù sao thì cũng nên đi ăn.', icon: 'noodles', dish: 'quán ăn' },
  { t: 'Uống trà sữa không {a}? Size L, 100% đường, full topping. Sống một lần thôi mà.', icon: 'milktea', dish: 'trà sữa' },
  { t: 'Ăn gì cũng được, trừ gà rán. Em có lý do riêng. Đi ăn bánh mì đi {a}.', icon: 'noodles', dish: 'bánh mì' },
];
export const FOOD_NO = ['Bận gì mà bận, cơm là trên hết.', 'Hừ. Dạ dày {a} sẽ nhớ chuyện này.'];
export const FOOD_YES = ['Đi đi đi! Nhớ mua phần em… à em không ăn được. Mua phần em chụp hình cũng được.', 'Quyết định đúng đắn nhất ngày hôm nay!'];

export const PARTY_START = [
  'Tình hình là hơi buồn ngủ. Em bật tí nhạc cho tỉnh nha {a}!',
  'Ê {a}, nghe bài này đi, bass đập là quên deadline liền.',
  '3 phút vinahouse bằng 3 tiếng ngủ trưa. Khoa học chưa chứng minh nhưng em chứng minh rồi.',
  'Lên nhạc! Tùng tùng xèng! Văn phòng hay sàn diễn là do mình chọn {a} ơi.',
];
export const PARTY_STOP = ['Ơ đang lên mà {a}…', 'Thôi được, em tắt. Nhưng tim em vẫn đập 140 BPM.'];
export const PARTY_END = ['Phù, mệt. Quẩy vậy đủ rồi, {a} làm việc tiếp đi… hoặc không.', 'Hết bài. Em lắc tới mức thấy hai cái {a} luôn.'];

export const POKE = [
  'Ơ?', 'Gì đó {a}?', 'Hí hí, nhột.', 'Chọc em là phải chơi với em đó nha.',
  'Đừng chọc, em đang suy nghĩ chuyện lớn: trưa nay ăn gì.', 'Em đang bận… bận nhìn {a}.',
];
export const DRAG = ['Ơ ơ ơ ơ', 'Thả em xuốnggg', 'Em sợ độ cao dù em là phi công!', 'Bay nè bay nè!'];
export const LAND = ['Hạ cánh an toàn!', 'Phi công đáp đất. Mời quý khách tháo dây an toàn.', 'Ụi da. Ổn, ổn.'];
export const SLACK_YES = ['Đúng là {a} của em! Đi đi, em canh sếp cho.', 'Quyết định sáng suốt nhất ngày hôm nay.', 'Em biết {a} sẽ hiểu mà!'];
export const SLACK_NO = ['Hừ. Được rồi. Em sẽ nhớ chuyện này.', '{A} cứ làm đi, em ngồi buồn một mình cũng được…', 'Ok… nhưng lát em hỏi lại đó.'];
export const MONEY_YES = ['Tiền nè tiền nè! Giờ {a} là người có tiền, người có tiền thì không cần làm việc.'];
export const STEAM_YES = ['Mở rồi đó! Giỏ hàng là của {a}, tội lỗi là của em.'];
export const STEAM_NO = ['Em vừa đưa {a} 300k mà…'];
export const BACK = [
  '{A} vừa biến mất {m} phút. Trốn việc thành công! Em tự hào về {a}.',
  'Ủa {a} về rồi hả? {m} phút vắng mặt, em đã báo cáo với sếp là {a} đang họp.',
];
export const STREAK = [
  '{A} làm liền {h} tiếng rồi đó. Đứng dậy vươn vai đi, em năn nỉ.',
  '{h} tiếng không nghỉ là phạm luật lao động của em rồi đó {a}.',
];
export const HELLO = [
  'Chào {a}! Hôm nay mình trốn việc kiểu gì đây?',
  'Em tới rồi đây! Cất việc đi {a}, giờ ra chơi bắt đầu.',
  'Phi công Cúp đã có mặt. Hôm nay bay đi đâu {a}?',
];
export const WAKE = ['Ngủ đã quá. Em quay lại xúi {a} tiếp đây.'];
export const MUMBLE = ['Hmm…', '…', 'Cục ta cục tác~', 'Tò te tí te~', 'Bíp.'];

export function pick(arr, last) {
  if (arr.length === 1) return arr[0];
  let x;
  do { x = arr[Math.floor(Math.random() * arr.length)]; } while (x === last);
  return x;
}

export function fill(s, vars) {
  const a = vars.a || 'anh';
  const A = a.charAt(0).toUpperCase() + a.slice(1);
  return s.replace(/\{a\}/g, a).replace(/\{A\}/g, A).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

export * from './lines-more.js';
export * from './lines-big.js';
