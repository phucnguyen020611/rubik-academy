import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Box, Menu, Mountain, Target, Timer, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo, LangPicker, ThemeToggle } from '../ui/Brand'
import { Button, IconButton } from '../ui/Button'
import { useLang, L, type Tx } from '../i18n'

export const NAV_LINKS: { to: string; label: Tx; icon: LucideIcon }[] = [
  { to: '/play', label: L('Chơi tự do', 'Play'), icon: Box },
  { to: '/learn', label: L('Học', 'Learn'), icon: BookOpen },
  { to: '/learn/iceberg', label: L('Tảng băng', 'Iceberg'), icon: Mountain },
  { to: '/timer', label: L('Bấm giờ', 'Timer'), icon: Timer },
  { to: '/trainer', label: L('Luyện tập', 'Trainer'), icon: Target },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const { t } = useLang()
  useEffect(() => {
    setOpen(false)
  }, [loc.pathname])
  return (
    <>
      <header className="nav">
        <div className="container">
          <Logo />
          <nav className="nav-links" aria-label={t(L('Điều hướng chính', 'Main'))}>
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/learn'}>
                {t(l.label)}
              </NavLink>
            ))}
          </nav>
          <div className="spacer" />
          <LangPicker />
          <ThemeToggle />
          <Button to="/play" variant="primary" size="sm" className="nav-cta">
            {t(L('Chơi ngay', 'Start playing'))}
          </Button>
          <IconButton icon={open ? X : Menu} label={t(L('Menu', 'Menu'))} className="nav-burger" onClick={() => setOpen((o) => !o)} />
        </div>
      </header>
      {open && (
        <div className="mobile-menu">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              <l.icon size={18} strokeWidth={1.9} />
              {t(l.label)}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export function Footer() {
  const { t } = useLang()
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: '1rem', maxWidth: '20rem' }}>
              {t(L('Học giải Rubik bằng khối 3D, từ lần giải đầu tiên đến những kỹ thuật nâng cao.', 'Learn to solve the Rubik’s cube with a 3D cube, from your first solve to advanced techniques.'))}
            </p>
          </div>
          <div>
            <h4>{t(L('Học', 'Learn'))}</h4>
            <Link to="/learn/notation">{t(L('Ký hiệu', 'Notation'))}</Link>
            <Link to="/learn/beginner">{t(L('Người mới', 'Beginner'))}</Link>
            <Link to="/learn/intermediate">2-Look OLL/PLL</Link>
            <Link to="/learn/cfop">CFOP</Link>
            <Link to="/learn/roux">Roux</Link>
          </div>
          <div>
            <h4>{t(L('Thư viện', 'Library'))}</h4>
            <Link to="/learn/f2l">F2L</Link>
            <Link to="/learn/oll">OLL</Link>
            <Link to="/learn/pll">PLL</Link>
            <Link to="/learn/patterns">{t(L('Hoạ tiết', 'Patterns'))}</Link>
            <Link to="/learn/iceberg">{t(L('Tảng băng', 'Iceberg'))}</Link>
          </div>
          <div>
            <h4>{t(L('Công cụ', 'Tools'))}</h4>
            <Link to="/play">{t(L('Chơi tự do', 'Free play'))}</Link>
            <Link to="/timer">{t(L('Bấm giờ', 'Timer'))}</Link>
            <Link to="/trainer">{t(L('Luyện công thức', 'Algorithm trainer'))}</Link>
            <Link to="/scan">{t(L('Quét khối bằng camera', 'Scan your cube'))}</Link>
            <Link to="/about">{t(L('Giới thiệu', 'About'))}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Rubik Academy</span>
          <Link to="/about">{t(L('Thiết kế và phát triển bởi Phuc Nguyen Hoang', 'Designed and built by Phuc Nguyen Hoang'))}</Link>
        </div>
      </div>
    </footer>
  )
}
