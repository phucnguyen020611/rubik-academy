import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Nav } from './components/Chrome'
import { useLang, L } from './i18n'

const Landing = lazy(() => import('./pages/Landing'))
const Play = lazy(() => import('./pages/Play'))
const LearnHub = lazy(() => import('./pages/LearnHub'))
const Notation = lazy(() => import('./pages/Notation'))
const Beginner = lazy(() => import('./pages/Beginner'))
const Intermediate = lazy(() => import('./pages/Intermediate'))
const Library = lazy(() => import('./pages/Library'))
const Iceberg = lazy(() => import('./pages/Iceberg'))
const Article = lazy(() => import('./pages/Article'))
const Patterns = lazy(() => import('./pages/Patterns'))
const Timer = lazy(() => import('./pages/Timer'))
const Trainer = lazy(() => import('./pages/Trainer'))
const Scan = lazy(() => import('./pages/Scan'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Loading() {
  const { t } = useLang()
  return (
    <div className="page container" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="muted">{t(L('Đang tải…', 'Loading…'))}</div>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isPlay = pathname.startsWith('/play')
  return (
    <>
      <ScrollTop />
      {!isLanding && <Nav />}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/play" element={<Play />} />
          <Route path="/learn" element={<LearnHub />} />
          <Route path="/learn/notation" element={<Notation />} />
          <Route path="/learn/beginner" element={<Beginner />} />
          <Route path="/learn/intermediate" element={<Intermediate />} />
          <Route path="/learn/f2l" element={<Library set="f2l" />} />
          <Route path="/learn/oll" element={<Library set="oll" />} />
          <Route path="/learn/pll" element={<Library set="pll" />} />
          <Route path="/learn/iceberg" element={<Iceberg />} />
          <Route path="/learn/cfop" element={<Article slug="cfop" />} />
          <Route path="/learn/roux" element={<Article slug="roux" />} />
          <Route path="/learn/patterns" element={<Patterns />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/trainer" element={<Trainer />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="*" element={<Article slug="404" />} />
        </Routes>
      </Suspense>
      {!isLanding && !isPlay && <Footer />}
    </>
  )
}
