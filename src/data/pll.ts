import { L, type Tx } from '../i18n-core.ts'
import type { AlgCase } from './oll.ts'

export const PLL_GROUPS: Record<string, Tx> = {
  edges: L('Chỉ đổi cạnh', 'Edges only'),
  corners: L('Chỉ đổi góc', 'Corners only'),
  adjacent: L('Đổi góc kề', 'Adjacent swap'),
  diagonal: L('Đổi góc chéo', 'Diagonal swap'),
}

const p = (name: string, group: string, alg: string, nick?: Tx, alts?: string[]): AlgCase => ({
  id: `pll-${name.toLowerCase()}`,
  name: `${name} Perm`,
  group,
  alg,
  nick,
  alts,
})

export const PLL: AlgCase[] = [
  p('Ua', 'edges', "R U' R U R U R U' R' U' R2", L('3 cạnh, ngược chiều', '3 edges, counter-clockwise'), ["M2 U M U2 M' U M2"]),
  p('Ub', 'edges', "R2 U R U R' U' R' U' R' U R'", L('3 cạnh, xuôi chiều', '3 edges, clockwise'), ["M2 U' M U2 M' U' M2"]),
  p('H', 'edges', 'M2 U M2 U2 M2 U M2', L('2 cặp cạnh đối diện', 'Opposite edge pairs')),
  p('Z', 'edges', "M' U M2 U M2 U M' U2 M2", L('2 cặp cạnh kề', 'Adjacent edge pairs')),
  p('Aa', 'corners', "x R' U R' D2 R U' R' D2 R2 x'", L('3 góc, xuôi chiều', '3 corners, clockwise')),
  p('Ab', 'corners', "x R2 D2 R U R' D2 R U' R x'", L('3 góc, ngược chiều', '3 corners, counter-clockwise')),
  p('E', 'corners', "x' R U' R' D R U R' D' R U R' D R U' R' D' x", L('2 cặp góc', 'Two corner pairs')),
  p('T', 'adjacent', "R U R' U' R' F R2 U' R' U' R U R' F'", L('Chữ T', 'T shape')),
  p('F', 'adjacent', "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"),
  p('Ja', 'adjacent', "R' U L' U2 R U' R' U2 R L"),
  p('Jb', 'adjacent', "R U R' F' R U R' U' R' F R2 U' R'"),
  p('Ra', 'adjacent', "R U' R' U' R U R D R' U' R D' R' U2 R'"),
  p('Rb', 'adjacent', "R2 F R U R U' R' F' R U2 R' U2 R"),
  p('Ga', 'adjacent', "R2 U R' U R' U' R U' R2 U' D R' U R D'"),
  p('Gb', 'adjacent', "R' U' R U D' R2 U R' U R U' R U' R2 D"),
  p('Gc', 'adjacent', "R2 U' R U' R U R' U R2 U D' R U' R' D"),
  p('Gd', 'adjacent', "R U R' U' D R2 U' R U' R' U R' U R2 D'"),
  p('V', 'diagonal', "R' U R' U' y R' F' R2 U' R' U R' F R F"),
  p('Y', 'diagonal', "F R U' R' U' R U R' F' R U R' U' R' F R F'"),
  p('Na', 'diagonal', "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'"),
  p('Nb', 'diagonal', "R' U R U' R' F' U' F R U R' F R' F' R U' R"),
]
