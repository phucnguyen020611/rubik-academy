import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme'
import { useLang, type Lang } from '../i18n'
import { IconButton } from './Button'
import { Select } from './Form'

/** The mark: a 3×3 face whose stickers form a four-leaf clover around a gold centre. */
export function LogoMark({ size = 30 }: { size?: number }) {
  const tile = (r: number, c: number) => {
    if (r === 1 && c === 1) return 'var(--gold)'
    if (r === 1 || c === 1) return 'var(--clover-300)'
    return 'var(--clover-500)'
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="logo-mark">
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="var(--clover-900)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="url(#lm-shine)" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={5.5 + c * 10} y={5.5 + r * 10} width="9" height="9" rx={r === 1 && c === 1 ? 4.5 : 2.6} fill={tile(r, c)} />),
      )}
      <defs>
        <linearGradient id="lm-shine" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Logo({ size = 30, to = '/' }: { size?: number; to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="Rubik Academy">
      <LogoMark size={size} />
      <span className="logo-word">
        Rubik<span>Academy</span>
      </span>
    </Link>
  )
}

export function ThemeToggle({ variant = 'ghost' }: { variant?: 'ghost' | 'secondary' }) {
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  return <IconButton icon={theme === 'dark' ? Sun : Moon} variant={variant} label={t({ vi: theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối', en: theme === 'dark' ? 'Light mode' : 'Dark mode' })} onClick={toggle} />
}

export function Flag({ code, size = 18 }: { code: Lang; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="flag" aria-hidden>
      <defs>
        <clipPath id={`flag-${code}`}>
          <circle cx="18" cy="18" r="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${code})`}>
        {code === 'vi' ? (
          <>
            <rect width="36" height="36" fill="#DA251D" />
            <path fill="#FFCD00" d="M18 8.2l2.33 7.17h7.54l-6.1 4.43 2.33 7.17L18 22.54l-6.1 4.43 2.33-7.17-6.1-4.43h7.54z" />
          </>
        ) : (
          <>
            <rect width="36" height="36" fill="#012169" />
            <path d="M0 0l36 36M36 0L0 36" stroke="#fff" strokeWidth="7" />
            <path d="M0 0l36 36M36 0L0 36" stroke="#C8102E" strokeWidth="2.6" />
            <path d="M18 0v36M0 18h36" stroke="#fff" strokeWidth="10" />
            <path d="M18 0v36M0 18h36" stroke="#C8102E" strokeWidth="6" />
          </>
        )}
      </g>
      <circle cx="18" cy="18" r="17.25" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1.5" />
    </svg>
  )
}

export function LangPicker({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { lang, setLang } = useLang()
  return (
    <Select<Lang>
      compact
      align={align}
      ariaLabel={lang === 'vi' ? 'Ngôn ngữ' : 'Language'}
      value={lang}
      onChange={setLang}
      options={[
        { value: 'vi', label: 'Tiếng Việt', short: 'VI', icon: <Flag code="vi" /> },
        { value: 'en', label: 'English', short: 'EN', icon: <Flag code="en" /> },
      ]}
    />
  )
}
