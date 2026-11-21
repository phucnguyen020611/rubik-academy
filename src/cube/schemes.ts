import type { Face, Vec } from './engine'
import type { MaskName } from '../data/beginner'

/** a named colour scheme, or explicit colours per home face (e.g. from a scanned cube) */
export type SchemeName = 'standard' | 'yellowTop' | Record<Face, string>

export const COLORS = {
  white: '#f5f6f1',
  yellow: '#ffd60a',
  green: '#00a35c',
  blue: '#0a5bd6',
  red: '#d7263d',
  orange: '#ff7a00',
  grey: '#5d625f',
}

/** colour of each home face */
export const SCHEMES: Record<'standard' | 'yellowTop', Record<Face, string>> = {
  standard: { U: COLORS.white, D: COLORS.yellow, F: COLORS.green, B: COLORS.blue, R: COLORS.red, L: COLORS.orange },
  yellowTop: { U: COLORS.yellow, D: COLORS.white, F: COLORS.green, B: COLORS.blue, R: COLORS.orange, L: COLORS.red },
}

export type MaskFn = (home: Vec, homeFace: Face, n: number) => boolean

const nz = (h: Vec) => h.filter((v) => v !== 0).length

export function maskFn(name: MaskName | undefined): MaskFn {
  switch (name) {
    case 'centers':
      return (h) => nz(h) === 1
    case 'daisy':
    case 'cross':
      return (h, _f, n) => nz(h) === 1 || (h[1] === -(n - 1) && nz(h) === 2)
    case 'firstLayer':
      return (h, _f, n) => nz(h) === 1 || h[1] === -(n - 1)
    case 'f2l':
      return (h, _f, n) => nz(h) === 1 || h[1] < n - 1
    case 'oll':
      return (h, f, n) => nz(h) === 1 || h[1] < n - 1 || f === 'U'
    case 'f2lcase':
    case 'xcross':
      return (h, _f, n) => {
        const l = n - 1
        if (nz(h) === 1) return true
        if (h[1] === -l && nz(h) === 2) return true
        if (h[0] === l && h[2] === l && h[1] <= 0) return true
        return false
      }
    default:
      return () => true
  }
}

export function schemeColors(s: SchemeName): Record<Face, string> {
  return typeof s === 'string' ? SCHEMES[s] : s
}

/** the six sticker colours, in a fixed order used by the scanner */
export const PALETTE = [COLORS.white, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.red, COLORS.orange]
