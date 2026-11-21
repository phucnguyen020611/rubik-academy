import { L } from '../i18n-core.ts'

export const PATTERNS = [
  { id: 'checker', name: L('Bàn cờ', 'Checkerboard'), alg: 'M2 E2 S2', desc: L('Hoạ tiết dễ nhất, chỉ 3 nước.', 'The easiest one, just 3 moves.') },
  { id: 'superflip', name: L('Superflip', 'Superflip'), alg: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", desc: L('Mọi cạnh bị lật ngược tại chỗ. Cần đúng 20 nước để giải.', 'Every edge flipped in place. It takes exactly 20 moves to solve.') },
  { id: 'spots', name: L('Sáu chấm', 'Six spots'), alg: "U D' R L' F B' U D'", desc: L('Tâm mỗi mặt mang màu khác phần còn lại.', 'Each centre wears a different colour from its face.') },
  { id: 'cubeincube', name: L('Khối trong khối', 'Cube in a cube'), alg: "F L F U' R U F2 L2 U' L' B D' B' L2 U", desc: L('Trông như có một khối 2×2 nằm lọt trong khối lớn.', 'Looks like a small 2×2 sitting inside the big cube.') },
  { id: 'tetris', name: L('Tetris', 'Tetris'), alg: "L R F B U' D' L' R'", desc: L('Những mảnh chữ S như trong trò xếp gạch.', 'S-shaped pieces like the falling-block game.') },
  { id: 'wire', name: L('Sợi dây', 'Wire'), alg: 'R L F B R L F B R L F B R2 B2 L2 R2 B2 L2', desc: L('Một vòng dây chạy quanh khối.', 'A loop of wire running round the cube.') },
  { id: 'cross4', name: L('Chữ thập', 'Plus signs'), alg: "R2 L2 U2 D2 F2 B2 U D' R L' F B' U D'", desc: L('Bàn cờ kết hợp sáu chấm.', 'Checkerboard meets six spots.') },
  { id: 'anaconda', name: L('Con trăn', 'Anaconda'), alg: "L U B' U' R L' B R' F B' D R D' F'", desc: L('Một con trăn uốn quanh bốn mặt.', 'A snake winding round four faces.') },
]
