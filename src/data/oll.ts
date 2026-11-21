import { L, type Tx } from '../i18n-core.ts'

export interface AlgCase {
  id: string
  name: string
  group: string
  nick?: Tx
  alg: string
  alts?: string[]
  note?: string
}

export const OLL_GROUPS: Record<string, Tx> = {
  cross: L('Có chữ thập', 'Cross'),
  dot: L('Chấm', 'Dot'),
  line: L('Chữ I', 'I shape'),
  corners: L('Góc đã xong', 'Corners done'),
  square: L('Hình vuông', 'Square'),
  slight: L('Tia chớp nhỏ', 'Small lightning'),
  fish: L('Con cá', 'Fish'),
  knight: L('Quân mã', 'Knight'),
  awkward: L('Khó nhìn', 'Awkward'),
  p: L('Chữ P', 'P shape'),
  t: L('Chữ T', 'T shape'),
  c: L('Chữ C', 'C shape'),
  w: L('Chữ W', 'W shape'),
  blight: L('Tia chớp lớn', 'Big lightning'),
  sl: L('Chữ L nhỏ', 'Small L'),
}

const o = (num: number, group: string, alg: string, nick?: Tx, alts?: string[]): AlgCase => ({
  id: `oll-${num}`,
  name: `OLL ${num}`,
  group,
  alg,
  nick,
  alts,
})

export const OLL: AlgCase[] = [
  o(1, 'dot', "R U2 R2 F R F' U2 R' F R F'", L('Chấm 1', 'Dot 1')),
  o(2, 'dot', "F R U R' U' F' f R U R' U' f'", L('Chấm 2', 'Dot 2'), ["r U r' U2 R U2 R' U2 r U' r'"]),
  o(3, 'dot', "f R U R' U' f' U' F R U R' U' F'", L('Chấm 3', 'Dot 3')),
  o(4, 'dot', "f R U R' U' f' U F R U R' U' F'", L('Chấm 4', 'Dot 4')),
  o(5, 'square', "r' U2 R U R' U r", L('Hình vuông trái', 'Left square')),
  o(6, 'square', "r U2 R' U' R U' r'", L('Hình vuông phải', 'Right square')),
  o(7, 'slight', "r U R' U R U2 r'", L('Tia chớp 1', 'Lightning 1')),
  o(8, 'slight', "r' U' R U' R' U2 r", L('Tia chớp 2', 'Lightning 2')),
  o(9, 'fish', "R U R' U' R' F R2 U R' U' F'", L('Cá 1', 'Fish 1')),
  o(10, 'fish', "R U R' U R' F R F' R U2 R'", L('Cá 2', 'Fish 2')),
  o(11, 'slight', "r U R' U R' F R F' R U2 r'", L('Tia chớp 3', 'Lightning 3')),
  o(12, 'slight', "M' R' U' R U' R' U2 R U' M", L('Tia chớp 4', 'Lightning 4')),
  o(13, 'knight', "F U R U' R2 F' R U R U' R'", L('Mã 1', 'Knight 1')),
  o(14, 'knight', "R' F R U R' F' R F U' F'", L('Mã 2', 'Knight 2')),
  o(15, 'knight', "r' U' r R' U' R U r' U r", L('Mã 3', 'Knight 3')),
  o(16, 'knight', "r U r' R U R' U' r U' r'", L('Mã 4', 'Knight 4')),
  o(17, 'dot', "R U R' U R' F R F' U2 R' F R F'", L('Chấm 5', 'Dot 5')),
  o(18, 'dot', "r U R' U R U2 r2 U' R U' R' U2 r", L('Chấm 6', 'Dot 6')),
  o(19, 'dot', "M U R U R' U' M' R' F R F'", L('Chấm 7', 'Dot 7')),
  o(20, 'dot', "r U R' U' M2 U R U' R' U' M'", L('Chấm X', 'Dot X')),
  o(21, 'cross', "R U2 R' U' R U R' U' R U' R'", L('Chữ H', 'H'), ["R U R' U R U' R' U R U2 R'"]),
  o(22, 'cross', "R U2 R2 U' R2 U' R2 U2 R", L('Pi', 'Pi')),
  o(23, 'cross', "R2 D' R U2 R' D R U2 R", L('Đèn pha (U)', 'Headlights')),
  o(24, 'cross', "r U R' U' r' F R F'", L('Chữ T (tắc kè hoa)', 'Chameleon')),
  o(25, 'cross', "F' r U R' U' r' F R", L('Nơ (L)', 'Bowtie')),
  o(26, 'cross', "R U2 R' U' R U' R'", L('Anti-Sune', 'Anti-Sune')),
  o(27, 'cross', "R U R' U R U2 R'", L('Sune', 'Sune')),
  o(28, 'corners', "r U R' U' r' R U R U' R'", L('Góc đúng, cạnh kề', 'Corners only, adjacent')),
  o(29, 'awkward', "R U R' U' R U' R' F' U' F R U R'", L('Khó 1', 'Awkward 1')),
  o(30, 'awkward', "F R' F R2 U' R' U' R U R' F2", L('Khó 2', 'Awkward 2')),
  o(31, 'p', "R' U' F U R U' R' F' R", L('Chữ P phải', 'Right P')),
  o(32, 'p', "L U F' U' L' U L F L'", L('Chữ P trái', 'Left P')),
  o(33, 't', "R U R' U' R' F R F'", L('Chữ T 1', 'T 1')),
  o(34, 'c', "R U R2 U' R' F R U R U' F'", L('Chữ C 1', 'C 1')),
  o(35, 'fish', "R U2 R2 F R F' R U2 R'", L('Cá 3', 'Fish 3')),
  o(36, 'w', "L' U' L U' L' U L U L F' L' F", L('Chữ W 1', 'W 1')),
  o(37, 'fish', "F R' F' R U R U' R'", L('Cá 4', 'Fish 4')),
  o(38, 'w', "R U R' U R U' R' U' R' F R F'", L('Chữ W 2', 'W 2')),
  o(39, 'blight', "L F' L' U' L U F U' L'", L('Tia chớp lớn 1', 'Big lightning 1')),
  o(40, 'blight', "R' F R U R' U' F' U R", L('Tia chớp lớn 2', 'Big lightning 2')),
  o(41, 'awkward', "R U R' U R U2 R' F R U R' U' F'", L('Khó 3', 'Awkward 3')),
  o(42, 'awkward', "R' U' R U' R' U2 R F R U R' U' F'", L('Khó 4', 'Awkward 4')),
  o(43, 'p', "F' U' L' U L F", L('Chữ P 3', 'P 3'), ["R' U' F' U F R"]),
  o(44, 'p', "F U R U' R' F'", L('Chữ P 4', 'P 4')),
  o(45, 't', "F R U R' U' F'", L('Chữ T 2', 'T 2')),
  o(46, 'c', "R' U' R' F R F' U R", L('Chữ C 2', 'C 2')),
  o(47, 'sl', "R' U' R' F R F' R' F R F' U R", L('Chữ L nhỏ 1', 'Small L 1')),
  o(48, 'sl', "F R U R' U' R U R' U' F'", L('Chữ L nhỏ 2', 'Small L 2')),
  o(49, 'sl', "r U' r2 U r2 U r2 U' r", L('Chữ L nhỏ 3', 'Small L 3')),
  o(50, 'sl', "r' U r2 U' r2 U' r2 U r'", L('Chữ L nhỏ 4', 'Small L 4')),
  o(51, 'line', "F U R U' R' U R U' R' F'", L('Chữ I 1', 'I 1')),
  o(52, 'line', "R U R' U R U' B U' B' R'", L('Chữ I 2', 'I 2')),
  o(53, 'sl', "r' U' R U' R' U R U' R' U2 r", L('Chữ L nhỏ 5', 'Small L 5')),
  o(54, 'sl', "r U R' U R U' R' U R U2 r'", L('Chữ L nhỏ 6', 'Small L 6')),
  o(55, 'line', "R' F R U R U' R2 F' R2 U' R' U R U R'", L('Chữ I 3', 'I 3'), ["R U2 R2 U' R U' R' U2 F R F'"]),
  o(56, 'line', "r' U' r U' R' U R U' R' U R r' U r", L('Chữ I 4', 'I 4')),
  o(57, 'corners', "R U R' U' M' U R U' r'", L('Góc đúng, chữ H', 'Corners only, H')),
]
