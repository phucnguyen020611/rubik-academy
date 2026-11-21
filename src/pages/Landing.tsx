import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Box, ChevronDown, ChevronLeft, ChevronRight, Hand, Info, PlayCircle, Timer } from 'lucide-react'
import { Footer } from '../components/Chrome'
import { Logo, LangPicker, ThemeToggle } from '../ui/Brand'
import { Button, IconButton } from '../ui/Button'
import { Modal } from '../ui/Overlay'
import { useTheme } from '../theme'
import { useLang, L } from '../i18n'
import type { PickTarget } from '../showroom/Showroom'
import { LLDiagram, caseState } from '../cube/Diagrams'
import { PLL } from '../data/pll'
import { OLL } from '../data/oll'
import { TIERS, ICEBERG } from '../data/iceberg'

const Showroom = lazy(() => import('../showroom/Showroom'))

const WALLS = [
  { tab: L('Kệ trưng bày', 'Shelf'), title: L('Kệ trưng bày', 'The shelf'), desc: L('Từ 2×2 đến 5×5. Bấm vào khối nào cũng được để chơi thử hoặc học cách giải.', 'From 2×2 to 5×5. Click any cube to play with it or learn how to solve it.'), cta: { to: '/play', label: L('Chơi khối 3×3', 'Play the 3×3') } },
  { tab: L('Học', 'Learn'), title: L('Góc học tập', 'Study corner'), desc: L('Bắt đầu từ bông hoa trắng, rồi lên CFOP khi bạn thấy sẵn sàng.', 'Start with the white daisy and move on to CFOP when you feel ready.'), cta: { to: '/learn', label: L('Vào học', 'Start learning') } },
  { tab: L('Chơi', 'Play'), title: L('Chơi tự do', 'Free play'), desc: L('Xoay, xáo, giải lại bao nhiêu lần cũng được. Bí quá thì bấm Giải giúp.', 'Turn, scramble and solve as often as you like. Stuck? Hit Solve.'), cta: { to: '/play', label: L('Chơi ngay', 'Play now') } },
  { tab: L('Luyện tập', 'Practice'), title: L('Bàn luyện tập', 'Practice desk'), desc: L('Bấm giờ theo luật thi đấu, luyện nhận diện OLL và PLL.', 'A competition-style timer plus OLL and PLL recognition drills.'), cta: { to: '/timer', label: L('Mở bộ bấm giờ', 'Open the timer') } },
]

function webglOk() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function Hero() {
  const { theme } = useTheme()
  const { t } = useLang()
  const navigate = useNavigate()
  const [wall, setWall] = useState(0)
  const [pick, setPick] = useState<Extract<PickTarget, { kind: 'cube' }> | null>(null)
  const [info, setInfo] = useState(false)
  const [inView, setInView] = useState(true)
  const ref = useRef<HTMLElement>(null)
  const gl = useMemo(webglOk, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 })
    io.observe(el)
    const vis = () => setInView((v) => (document.hidden ? false : v || el.getBoundingClientRect().bottom > 0))
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  const onPick = useCallback((x: PickTarget) => (x.kind === 'link' ? navigate(x.to) : setPick(x)), [navigate])
  const closePick = useCallback(() => setPick(null), [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!inView || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') setWall((w) => (w + 1) % 4)
      if (e.key === 'ArrowLeft') setWall((w) => (w + 3) % 4)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [inView])

  const w = WALLS[wall]
  const cubeBlurb: Record<number, ReturnType<typeof L>> = {
    2: L('Khối nhỏ nhất, chỉ có 8 viên góc. Hợp để làm quen.', 'The smallest one, just 8 corners. A gentle start.'),
    3: L('Khối kinh điển. Mọi bài học trên trang đều xoay quanh nó.', 'The classic. Every lesson on this site is built around it.'),
    4: L('Có thêm tâm và cạnh ghép đôi, đôi khi gặp parity.', 'Extra centres and paired edges, plus the occasional parity.'),
    5: L('98 viên. Cần kiên nhẫn hơn là công thức.', '98 pieces. Needs patience more than algorithms.'),
  }

  return (
    <section className="sr" ref={ref}>
      <div className="sr-canvas">
        {gl ? (
          <Suspense fallback={<div className="sr-loading">{t(L('Đang dọn phòng trưng bày…', 'Setting up the showroom…'))}</div>}>
            <Showroom wall={wall} dark={theme === 'dark'} active={inView} onPick={onPick} />
          </Suspense>
        ) : (
          <div className="sr-loading">{t(L('Trình duyệt này chưa hỗ trợ WebGL.', 'This browser does not support WebGL.'))}</div>
        )}
      </div>

      <header className="sr-top">
        <div className="sr-top-side">
          <Button to="/learn" variant="secondary" size="sm" icon={BookOpen} className="sr-glass-btn">
            {t(L('Học', 'Learn'))}
          </Button>
        </div>
        <Logo size={30} />
        <div className="sr-top-side right">
          <div className="sr-glass-pill">
            <LangPicker />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <IconButton icon={ChevronLeft} variant="secondary" size="lg" className="sr-arrow left" label={t(L('Bức tường trước', 'Previous wall'))} onClick={() => setWall((x) => (x + 3) % 4)} />
      <IconButton icon={ChevronRight} variant="secondary" size="lg" className="sr-arrow right" label={t(L('Bức tường sau', 'Next wall'))} onClick={() => setWall((x) => (x + 1) % 4)} />

      <div className="sr-caption" key={wall}>
        <span className="eyebrow">{wall + 1} / 4</span>
        <h2>{t(w.title)}</h2>
        <p>{t(w.desc)}</p>
        <Button to={w.cta.to} variant="primary" size="sm" iconRight={ArrowRight}>
          {t(w.cta.label)}
        </Button>
      </div>

      <nav className="sr-pill" aria-label={t(L('Chọn bức tường', 'Choose a wall'))}>
        {WALLS.map((x, i) => (
          <button key={i} type="button" className={i === wall ? 'active' : ''} onClick={() => setWall(i)}>
            {t(x.tab)}
          </button>
        ))}
        <span className="sr-sep" />
        <button type="button" className={`sr-info-btn ${info ? 'active' : ''}`} onClick={() => setInfo(true)} aria-label={t(L('Hướng dẫn', 'How it works'))}>
          <Info size={16} />
        </button>
      </nav>

      <a href="#explore" className="sr-scroll">
        {t(L('Cuộn xuống', 'Scroll'))}
        <ChevronDown size={15} />
      </a>

      <Modal open={info} onClose={() => setInfo(false)} title={t(L('Cách xem phòng', 'Getting around'))} width={420}>
        <ul className="plain-list">
          <li>{t(L('Bấm các tab bên dưới hoặc phím ← → để quay sang bức tường khác.', 'Use the tabs at the bottom or the ← → keys to turn to another wall.'))}</li>
          <li>{t(L('Rê chuột lên đồ vật để xem tên, bấm để mở.', 'Hover over anything to see what it is, click to open it.'))}</li>
          <li>{t(L('Thử chế độ tối để xem phòng lúc buổi tối.', 'Switch to dark mode to see the room at night.'))}</li>
        </ul>
      </Modal>

      <Modal
        open={!!pick}
        onClose={closePick}
        eyebrow={t(L('Bạn chọn', 'You picked'))}
        title={pick ? `${t(L('Khối', 'The'))} ${pick.label}${t(L('', ' cube'))}` : ''}
        footer={
          pick && (
            <>
              <Button variant="secondary" icon={BookOpen} onClick={() => navigate(pick.n === 3 ? '/learn/beginner' : '/learn')}>
                {t(L('Học cách giải', 'Learn to solve'))}
              </Button>
              <Button variant="primary" icon={Box} onClick={() => navigate(`/play?n=${pick.n}`)}>
                {t(L('Chơi thử', 'Play'))}
              </Button>
            </>
          )
        }
      >
        {pick && <p className="text-2" style={{ margin: 0 }}>{t(cubeBlurb[pick.n])}</p>}
      </Modal>
    </section>
  )
}

const FEATURES = [
  { icon: Box, title: L('Khối 3D như thật', 'A cube that feels real'), desc: L('Thân nhựa vát cạnh, sticker bo góc, có bóng đổ. Nhìn gần cũng không bị “giả”.', 'Bevelled plastic, rounded stickers, real shadows. It holds up close.') },
  { icon: Hand, title: L('Kéo hay bấm đều được', 'Drag it or tap it'), desc: L('Vuốt trên khối để xoay tầng, hoặc dùng bảng nút U, R, F nếu bạn quen ký hiệu.', 'Swipe on the cube to turn a layer, or use the U, R, F buttons if you know the notation.') },
  { icon: PlayCircle, title: L('Công thức có hình động', 'Algorithms you can watch'), desc: L('Tua từng nước, chỉnh tốc độ. Các viên chưa cần để ý được tô xám.', 'Step through each move at your own speed. Pieces you can ignore are greyed out.') },
  { icon: Timer, title: L('Bấm giờ và luyện tập', 'Timer and drills'), desc: L('Theo dõi Ao5, Ao12 và luyện lại những ca bạn hay quên.', 'Track your Ao5 and Ao12, and drill the cases you keep forgetting.') },
]

const PATH = [
  { to: '/learn/notation', step: '01', title: L('Ký hiệu', 'Notation'), meta: L('10 phút', '10 min'), desc: L('Đọc được R, U\', F2 là làm theo được mọi công thức.', 'Read R, U\' and F2 and you can follow any algorithm.') },
  { to: '/learn/beginner', step: '02', title: L('Người mới', 'Beginner'), meta: L('8 bước', '8 steps'), desc: L('Giải xong khối đầu tiên bằng cách đi từng tầng.', 'Finish your first solve, one layer at a time.') },
  { to: '/learn/intermediate', step: '03', title: '2-Look OLL/PLL', meta: L('16 công thức', '16 algs'), desc: L('Giải tầng cuối nhanh hơn, xuống dưới 1 phút.', 'A faster last layer that gets you under a minute.') },
  { to: '/learn/cfop', step: '04', title: L('CFOP đầy đủ', 'Full CFOP'), meta: '41 · 57 · 21', desc: L('Phương pháp mà phần lớn người chơi tốc độ đang dùng.', 'The method most speedcubers use.') },
  { to: '/learn/iceberg', step: '05', title: L('Tảng băng', 'The iceberg'), meta: L('30 kỹ thuật', '30 ideas'), desc: L('Xcross, OLLCP, ZBLL và những thứ sâu hơn nữa.', 'Xcross, OLLCP, ZBLL and deeper still.') },
]

const FAQ = [
  { q: L('Mình chưa giải được lần nào, nên bắt đầu từ đâu?', 'I have never solved one. Where do I start?'), a: L('Đọc trang Ký hiệu trước (khoảng 10 phút), rồi làm theo 8 bước của bài Người mới. Bước nào cũng có khối 3D để bạn xem chậm.', 'Read the Notation page first (about 10 minutes), then follow the 8 Beginner steps. Every step has a 3D cube you can slow down.') },
  { q: L('Bao lâu thì giải được?', 'How long until I can solve it?'), a: L('Phần lớn mọi người giải được sau vài ngày, mỗi ngày tập khoảng 30 phút. Xuống dưới 1 phút thường mất một đến hai tháng.', 'Most people get there in a few days of 30-minute sessions. Getting under a minute usually takes a month or two.') },
  { q: L('CFOP có khó không?', 'Is CFOP hard?'), a: L('Nhiều công thức nhưng có lộ trình rõ ràng. Học 2-Look trước (16 công thức), rồi bổ sung dần OLL và PLL đầy đủ.', 'There are a lot of algorithms, but the path is clear. Learn 2-Look first (16 algorithms), then add full OLL and PLL over time.') },
  { q: L('Tiến độ của mình có được lưu không?', 'Is my progress saved?'), a: L('Có. Những ca bạn đánh dấu đã thuộc và lịch sử bấm giờ được lưu ngay trên trình duyệt, không cần tài khoản.', 'Yes. Learned cases and your timer history stay in your browser. No account needed.') },
]

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="accordion">
      {items.map((it, i) => (
        <div key={it.q} className={`acc-item ${open === i ? 'open' : ''}`}>
          <button type="button" className="acc-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span>{it.q}</span>
            <ChevronDown size={18} className="acc-caret" />
          </button>
          <div className="acc-a">
            <div>
              <p>{it.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  const { t } = useLang()
  const show = useMemo(() => [...['pll-t', 'pll-ua', 'pll-jb', 'pll-y'].map((id) => PLL.find((p) => p.id === id)!), ...[27, 26, 45, 21].map((n) => OLL[n - 1])], [])
  return (
    <>
      <Hero />
      <main id="explore">
        <section className="section">
          <div className="container">
            <div className="intro">
              <div>
                <span className="eyebrow">Rubik Academy</span>
                <h2 style={{ marginTop: '0.5rem' }}>{t(L('Học Rubik dễ hơn nhiều khi bạn thấy từng nước xoay.', 'Learning the cube is easier when you can see every turn.'))}</h2>
              </div>
              <p className="lead">{t(L('Mỗi công thức ở đây đi kèm một khối 3D. Bạn có thể tua chậm, xoay ra phía sau để nhìn, rồi tự tay làm lại trên khối của mình.', 'Every algorithm here comes with a 3D cube. Slow it down, turn it round to look at the back, then try it on your own cube.'))}</p>
            </div>
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <div className="feature" key={f.title.en}>
                  <div className="feature-icon">
                    <f.icon size={20} strokeWidth={1.9} />
                  </div>
                  <h3>{t(f.title)}</h3>
                  <p className="text-2">{t(f.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section band">
          <div className="container">
            <span className="eyebrow">{t(L('Lộ trình', 'The path'))}</span>
            <h2 style={{ marginTop: '0.5rem' }}>{t(L('Từ chưa biết gì đến dưới 20 giây', 'From zero to sub-20'))}</h2>
            <div className="path">
              {PATH.map((p) => (
                <Link key={p.to} to={p.to} className="path-item card card-link">
                    <div className="row nowrap" style={{ justifyContent: 'space-between' }}>
                      <span className="path-step">{p.step}</span>
                      <span className="badge badge-neutral">{t(p.meta)}</span>
                    </div>
                    <h3>{t(p.title)}</h3>
                    <p className="text-2 small" style={{ margin: 0 }}>
                      {t(p.desc)}
                    </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container split">
            <div>
              <span className="eyebrow">{t(L('Thư viện công thức', 'Algorithm library'))}</span>
              <h2 style={{ marginTop: '0.5rem' }}>{t(L('119 trường hợp, ca nào cũng có hình động.', '119 cases, each one animated.'))}</h2>
              <p className="lead">{t(L('Hình nhận diện được vẽ ra từ chính công thức nên không bao giờ lệch. Đánh dấu những ca đã thuộc để biết mình còn bao nhiêu.', 'Each diagram is drawn from its own algorithm, so they never disagree. Mark the cases you know and see how many are left.'))}</p>
              <div className="stats">
                {[
                  ['41', 'F2L'],
                  ['57', 'OLL'],
                  ['21', 'PLL'],
                  ['4', t(L('cỡ khối', 'cube sizes'))],
                ].map(([n, l]) => (
                  <div key={l}>
                    <strong>{n}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: '1.5rem' }}>
                <Button to="/learn/pll" variant="primary" iconRight={ArrowRight}>
                  {t(L('Xem PLL', 'Browse PLL'))}
                </Button>
                <Button to="/learn/oll" variant="secondary">
                  {t(L('Xem OLL', 'Browse OLL'))}
                </Button>
              </div>
            </div>
            <div className="diagram-wall">
              {show.map((c, i) => {
                const pll = c.id.startsWith('pll')
                return (
                  <Link key={c.id} to={pll ? '/learn/pll' : '/learn/oll'} className="diagram-tile" style={{ animationDelay: `${i * 60}ms` }}>
                    <LLDiagram state={caseState(c.alg)} mask={pll ? undefined : 'oll'} arrows={pll} />
                    <span>{c.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section ice-band">
          <div className="container split">
            <div>
              <span className="eyebrow" style={{ color: '#9fdcff' }}>
                {t(L('Tảng băng Rubik', 'The cubing iceberg'))}
              </span>
              <h2 style={{ marginTop: '0.5rem', color: '#fff' }}>{t(L('Bạn đang ở tầng nào?', 'How deep have you gone?'))}</h2>
              <p className="lead" style={{ color: '#c7deee' }}>
                {t(L('Phía trên mặt nước là Cross, F2L, OLL, PLL. Lặn sâu hơn sẽ gặp Xcross, Keyhole, OLLCP, ZBLL. Mỗi mục đều có giải thích ngắn và khối 3D minh hoạ.', 'Above the water: Cross, F2L, OLL, PLL. Further down: Xcross, Keyhole, OLLCP, ZBLL. Each one has a short explanation and a 3D demo.'))}
              </p>
              <Button to="/learn/iceberg" variant="inverse" size="lg" iconRight={ArrowRight}>
                {t(L('Lặn xuống xem', 'Dive in'))}
              </Button>
            </div>
            <div className="ice-mini">
              {TIERS.map((tier, i) => (
                <div key={i} className="ice-tier" style={{ opacity: 1 - i * 0.1 }}>
                  <strong>{t(tier.name)}</strong>
                  <span>
                    {ICEBERG.filter((x) => x.tier === i)
                      .slice(0, 4)
                      .map((x) => x.name)
                      .join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container narrow">
            <span className="eyebrow">{t(L('Hỏi đáp', 'FAQ'))}</span>
            <h2 style={{ marginTop: '0.5rem' }}>{t(L('Vài câu hay được hỏi', 'Common questions'))}</h2>
            <Accordion items={FAQ.map((f) => ({ q: t(f.q), a: t(f.a) }))} />
          </div>
        </section>

        <section className="section-sm">
          <div className="container">
            <div className="cta-card">
              <div>
                <h2>{t(L('Thử xoay khối đầu tiên nhé?', 'Ready for your first turn?'))}</h2>
                <p>{t(L('Không cần đăng ký. Mở trình duyệt là chơi được.', 'No sign-up. It runs right in your browser.'))}</p>
              </div>
              <div className="row">
                <Button to="/learn/beginner" variant="inverse" size="lg">
                  {t(L('Bắt đầu học', 'Start learning'))}
                </Button>
                <Button to="/play" variant="ghost" size="lg" className="cta-ghost">
                  {t(L('Chơi tự do', 'Free play'))}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

