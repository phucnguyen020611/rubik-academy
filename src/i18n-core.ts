export type Lang = 'vi' | 'en'
/** A bilingual string. */
export type Tx = { vi: string; en: string }
export const L = (vi: string, en: string): Tx => ({ vi, en })
