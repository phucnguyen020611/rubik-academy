import { L, type Tx } from '../i18n-core.ts'

export type MaskName = 'all' | 'daisy' | 'cross' | 'firstLayer' | 'f2l' | 'oll' | 'f2lcase' | 'xcross' | 'centers'

export interface Demo {
  title: Tx
  /** applied to a solved cube before the inverse of `alg` (the state the demo should end in) */
  pre?: string
  alg: string
  mask?: MaskName
}

export interface Step {
  id: string
  title: Tx
  goal: Tx
  body: Tx[]
  tips?: Tx[]
  sheet: string
  demos: Demo[]
}

/** Lessons are taught with yellow on top and white on the bottom (scheme "yellowTop"). */
export const LL_PRE = "R U R' U R U2 R' U F R U R' U' F'"

export const BEGINNER: Step[] = [
  {
    id: 'daisy',
    title: L('Bông hoa trắng', 'The daisy'),
    goal: L('Đưa 4 cạnh trắng lên quanh tâm vàng.', 'Bring the four white edges up around the yellow centre.'),
    body: [
      L(
        'Cầm khối sao cho tâm vàng nằm trên. Tìm 4 viên cạnh có màu trắng rồi lần lượt đưa chúng lên mặt trên, mặt trắng hướng lên. Khi xong, bạn sẽ thấy một bông hoa trắng với nhụy vàng.',
        'Hold the cube with the yellow centre on top. Find the four edges that have white on them and bring each one up so the white faces the sky. When you are done you will see a white flower with a yellow middle.',
      ),
      L(
        'Bước này không cần học thuộc gì. Mẹo duy nhất: trước khi đưa một cạnh mới lên, xoay U để chỗ phía trên nó còn trống, như vậy bạn sẽ không đẩy cánh hoa cũ xuống.',
        'Nothing to memorise here. The one trick: before bringing a new edge up, turn U so the spot above it is free. That way you never knock an old petal back down.',
      ),
    ],
    tips: [
      L('Cạnh trắng ở tầng giữa, bên phải: xoay R hoặc R\'.', 'White edge in the middle layer on the right: turn R or R\'.'),
      L('Cạnh trắng ở tầng giữa, bên trái: xoay L\' hoặc L.', 'White edge in the middle layer on the left: turn L\' or L.'),
      L('Cạnh trắng nằm dưới đáy, trắng úp xuống: xoay F2.', 'White edge on the bottom, white facing down: turn F2.'),
      L('Trắng quay ra phía trước: xoay F một lần rồi làm như trên.', 'White facing you on the front: turn F once, then use the moves above.'),
    ],
    sheet: "R, L', F2",
    demos: [{ title: L('Xây bông hoa', 'Building the daisy'), pre: 'F2 R2 B2 L2', alg: "L' U F' R' U' F2", mask: 'daisy' }],
  },
  {
    id: 'cross',
    title: L('Dấu thập trắng', 'White cross'),
    goal: L('Hạ bông hoa xuống đáy thành dấu thập trắng.', 'Turn the daisy into a white cross on the bottom.'),
    body: [
      L(
        'Nhìn màu bên của một cánh hoa. Xoay U đến khi màu đó nằm ngay trên tâm cùng màu, ví dụ cạnh trắng–xanh lá đứng trên tâm xanh lá.',
        'Look at the side colour of one petal. Turn U until that colour sits right above the matching centre, for example the white–green edge above the green centre.',
      ),
      L('Xoay mặt đó nửa vòng (F2, R2, B2 hoặc L2) để cạnh rơi xuống đáy. Làm vậy với cả 4 cạnh.', 'Turn that face a half turn (F2, R2, B2 or L2) and the edge drops to the bottom. Repeat for all four.'),
    ],
    tips: [L('Lật khối lên xem đáy: dấu thập trắng phải khớp màu với các tâm bên.', 'Flip the cube to check the bottom: the white cross should match the side centres.')],
    sheet: 'U … F2',
    demos: [{ title: L('Hạ từng cánh hoa', 'One petal at a time'), alg: 'U F2 U R2 U2 B2 U L2', mask: 'cross' }],
  },
  {
    id: 'white-corners',
    title: L('Góc trắng', 'White corners'),
    goal: L('Đặt 4 góc trắng để xong tầng thứ nhất.', 'Place the four white corners to finish the first layer.'),
    body: [
      L(
        'Tìm một góc có màu trắng ở tầng trên. Xoay U để đưa nó lên đúng phía trên chỗ của nó, tức là giữa hai tâm cùng màu với góc.',
        'Find a corner with white on it in the top layer. Turn U until it sits right above where it belongs, between the two centres that match its colours.',
      ),
      L(
        'Giữ góc đó ở vị trí trước bên phải rồi làm R U R\' U\' cho đến khi nó vào chỗ với mặt trắng úp xuống. Có khi cần 1 lần, có khi 3 hoặc 5 lần.',
        'Keep it at the front-right and repeat R U R\' U\' until it drops in with white facing down. Sometimes once, sometimes three or five times.',
      ),
    ],
    tips: [L('R U R\' U\' là chuỗi bạn sẽ gặp lại rất nhiều về sau, nên tập cho tay quen luôn từ giờ.', 'You will use R U R\' U\' a lot later on, so let your hands get used to it now.')],
    sheet: "R U R' U'",
    demos: [{ title: L('Đưa góc vào chỗ', 'Dropping a corner in'), pre: LL_PRE, alg: "U' R U R' U' R U R' U' R U R' U'", mask: 'firstLayer' }],
  },
  {
    id: 'second-layer',
    title: L('Tầng giữa', 'Middle layer'),
    goal: L('Chèn 4 cạnh của tầng giữa.', 'Insert the four middle-layer edges.'),
    body: [
      L(
        'Lật khối để mặt trắng xuống dưới. Tìm một cạnh ở tầng trên không có màu vàng, rồi xoay U để màu phía trước của nó khớp với tâm trước.',
        'Keep white on the bottom. Find a top-layer edge without yellow on it and turn U so its front colour matches the front centre.',
      ),
      L(
        'Nếu màu trên của cạnh khớp với tâm bên phải, dùng công thức chèn phải. Khớp với tâm bên trái thì dùng chèn trái.',
        'If its top colour matches the right centre, use the right insert. If it matches the left centre, use the left one.',
      ),
      L(
        'Có cạnh bị kẹt sai chỗ trong tầng giữa? Làm một lần công thức chèn để đẩy nó lên, rồi chèn lại cho đúng.',
        'Edge stuck in the wrong slot? Do one insert to pop it out to the top, then insert it properly.',
      ),
    ],
    tips: [L("Chèn phải: U R U' R' U' F' U F", "Right insert: U R U' R' U' F' U F"), L("Chèn trái: U' L' U L U F U' F'", "Left insert: U' L' U L U F U' F'")],
    sheet: "U R U' R' U' F' U F",
    demos: [
      { title: L('Chèn phải', 'Right insert'), pre: LL_PRE, alg: "U R U' R' U' F' U F", mask: 'f2l' },
      { title: L('Chèn trái', 'Left insert'), pre: LL_PRE, alg: "U' L' U L U F U' F'", mask: 'f2l' },
    ],
  },
  {
    id: 'yellow-cross',
    title: L('Dấu thập vàng', 'Yellow cross'),
    goal: L('Làm dấu thập vàng trên mặt trên.', 'Make a yellow cross on top.'),
    body: [
      L(
        'Chỉ nhìn các cạnh ở mặt vàng, kệ các góc. Bạn sẽ gặp một trong bốn hình: một chấm, chữ L, đường thẳng hoặc đã có dấu thập.',
        'Only look at the edges on the yellow face and ignore the corners. You will see a dot, an L, a line, or a finished cross.',
      ),
      L(
        'Đường thẳng: để nằm ngang rồi làm F R U R\' U\' F\'. Chữ L: đặt ở góc sau bên trái, làm công thức để ra đường thẳng rồi làm thêm lần nữa. Một chấm: làm một lần là ra chữ L.',
        'Line: hold it horizontal and do F R U R\' U\' F\'. L shape: put it at the back-left, do the algorithm to get a line, then do it again. Dot: one go turns it into an L.',
      ),
    ],
    tips: [L("Cả bước chỉ dùng một công thức: F R U R' U' F'", "One algorithm for the whole step: F R U R' U' F'")],
    sheet: "F R U R' U' F'",
    demos: [
      { title: L('Từ đường thẳng', 'From a line'), pre: "R U R' U R U2 R'", alg: "F R U R' U' F'", mask: 'oll' },
      { title: L('Từ chữ L', 'From an L'), pre: "R U R' U R U2 R'", alg: "F R U R' U' F' U2 F R U R' U' F'", mask: 'oll' },
    ],
  },
  {
    id: 'yellow-face',
    title: L('Mặt vàng', 'Yellow face'),
    goal: L('Xoay 4 góc để cả mặt trên vàng.', 'Twist the corners so the whole top is yellow.'),
    body: [
      L(
        'Đếm số góc đã vàng ở mặt trên. Nếu đúng một góc vàng (trông như con cá), đặt nó ở trước bên trái rồi làm R U R\' U R U2 R\'. Công thức này có tên là Sune.',
        'Count the yellow corners on top. With exactly one (it looks like a fish), put it at the front-left and do R U R\' U R U2 R\'. This one is called Sune.',
      ),
      L(
        'Không có góc vàng nào: xoay sao cho góc trước bên trái có màu vàng quay sang trái. Có hai góc vàng: xoay sao cho màu vàng của góc trước bên trái quay ra trước. Làm Sune, bạn sẽ ra con cá, rồi làm tiếp.',
        'No yellow corners: turn the top so the front-left corner shows yellow on the left side. Two yellow corners: turn so the front-left corner shows yellow on the front. Do Sune, you will get the fish, then finish it off.',
      ),
    ],
    sheet: "R U R' U R U2 R'",
    demos: [
      { title: L('Con cá', 'The fish'), pre: "R U R' U' R' F R2 U' R' U' R U R' F'", alg: "R U R' U R U2 R'", mask: 'oll' },
      { title: L('Hai lần Sune', 'Sune twice'), pre: "R U R' U' R' F R2 U' R' U' R U R' F'", alg: "R U R' U R U2 R' U2 R U R' U R U2 R'", mask: 'oll' },
    ],
  },
  {
    id: 'yellow-corners',
    title: L('Góc vàng', 'Yellow corners'),
    goal: L('Đưa 4 góc vàng về đúng vị trí.', 'Move the yellow corners to their spots.'),
    body: [
      L(
        'Nhìn các mặt bên để tìm “đèn pha”: hai góc cạnh nhau có cùng một màu. Xoay U để đèn pha nằm ở mặt sau.',
        'Look around the sides for “headlights”: two neighbouring corners with the same colour. Turn U so the headlights are at the back.',
      ),
      L('Làm công thức đổi góc. Không thấy đèn pha thì cứ làm một lần, sau đó sẽ có.', 'Do the corner swap. No headlights anywhere? Do it once from any side and they will appear.'),
    ],
    tips: [L("R' F R' B2 R F' R' B2 R2", "R' F R' B2 R F' R' B2 R2")],
    sheet: "R' F R' B2 R F' R' B2 R2",
    demos: [{ title: L('Đèn pha phía sau', 'Headlights at the back'), pre: "R U' R U R U R U' R' U' R2", alg: "R' F R' B2 R F' R' B2 R2", mask: 'all' }],
  },
  {
    id: 'last-edges',
    title: L('Cạnh cuối', 'Last edges'),
    goal: L('Đổi chỗ các cạnh tầng trên là xong khối.', 'Cycle the top edges and you are done.'),
    body: [
      L('Tìm mặt bên đã hoàn chỉnh (ba viên cùng màu) và quay nó ra phía sau.', 'Find a side where the whole top row is one colour and put it at the back.'),
      L(
        'Làm công thức xoay 3 cạnh. Chưa xong thì làm thêm lần nữa. Nếu chưa có mặt nào hoàn chỉnh, làm một lần từ bất kỳ hướng nào để tạo ra nó.',
        'Do the three-edge cycle. If it is not solved yet, do it once more. No finished side? Do it once from anywhere and one will appear.',
      ),
    ],
    tips: [L("Ua: R U' R U R U R U' R' U' R2", "Ua: R U' R U R U R U' R' U' R2"), L("Ub: R2 U R U R' U' R' U' R' U R'", "Ub: R2 U R U R' U' R' U' R' U R'")],
    sheet: "R U' R U R U R U' R' U' R2",
    demos: [
      { title: L('Ngược chiều (Ua)', 'Counter-clockwise (Ua)'), alg: "R U' R U R U R U' R' U' R2", mask: 'all' },
      { title: L('Xuôi chiều (Ub)', 'Clockwise (Ub)'), alg: "R2 U R U R' U' R' U' R' U R'", mask: 'all' },
    ],
  },
]

export const TWO_LOOK = {
  eo: [
    { id: 'eo-line', name: L('Đường thẳng', 'Line'), alg: "F R U R' U' F'" },
    { id: 'eo-l', name: L('Chữ L', 'L shape'), alg: "f R U R' U' f'" },
    { id: 'eo-dot', name: L('Một chấm', 'Dot'), alg: "F R U R' U' F' f R U R' U' f'" },
  ],
  co: ['oll-21', 'oll-22', 'oll-23', 'oll-24', 'oll-25', 'oll-26', 'oll-27'],
  cp: [
    { id: 'cp-adj', name: L('Đèn pha (T-perm)', 'Headlights (T-perm)'), alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    { id: 'cp-diag', name: L('Đổi chéo (Y-perm)', 'Diagonal (Y-perm)'), alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  ],
  ep: ['pll-ua', 'pll-ub', 'pll-h', 'pll-z'],
}
