import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Lang, Tx } from './i18n-core'
export { L } from './i18n-core'
export type { Lang, Tx } from './i18n-core'

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (x: Tx | string | undefined) => string
}

const LangCtx = createContext<Ctx>({ lang: 'vi', setLang: () => {}, t: (x) => (typeof x === 'string' ? x : (x?.vi ?? '')) })

function initial(): Lang {
  try {
    const s = localStorage.getItem('ra-lang')
    if (s === 'vi' || s === 'en') return s
  } catch {
    /* storage blocked */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'vi'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('ra-lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])
  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const t = useCallback((x: Tx | string | undefined) => (x === undefined ? '' : typeof x === 'string' ? x : x[lang]), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)
