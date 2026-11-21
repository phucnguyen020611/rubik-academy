import { useCallback, useState } from 'react'
import { CalendarDays, Star } from 'lucide-react'
import { CaseDrawer, PageHead, useLearned, type DrawerCase } from '../components/Shared'
import { LLDiagram, caseState } from '../cube/Diagrams'
import { TWO_LOOK } from '../data/beginner'
import { OLL } from '../data/oll'
import { PLL } from '../data/pll'
import { useLang, L, type Tx } from '../i18n'

const byId = (id: string) => [...OLL, ...PLL].find((c) => c.id === id)!

interface Sec {
  title: Tx
  desc: Tx
  mask?: 'oll'
  arrows?: boolean
  cases: { id: string; title: Tx | string; sub?: Tx; alg: string; alts?: string[]; trainer?: string }[]
}

const SECTIONS: Sec[] = [
  {
    title: L('1. Định hướng cạnh', '1. Orient the edges'),
    desc: L('Giống bước dấu thập vàng ở bài người mới, nhưng thêm f (xoay hai tầng) để giải chữ L chỉ trong một lần.', 'Like the yellow cross step from the beginner method, with f (a two-layer turn) to handle the L in one go.'),
    mask: 'oll',
    cases: TWO_LOOK.eo.map((c) => ({ id: c.id, title: c.name, alg: c.alg })),
  },
  {
    title: L('2. Định hướng góc', '2. Orient the corners'),
    desc: L('Có dấu thập vàng rồi thì chỉ còn 7 ca để làm vàng cả mặt. Sune và Anti-Sune là hai ca quan trọng nhất.', 'Once the cross is there, 7 cases remain to finish the yellow face. Sune and Anti-Sune matter most.'),
    mask: 'oll',
    cases: TWO_LOOK.co.map((id) => {
      const c = byId(id)
      return { id: c.id, title: c.nick ?? c.name, sub: L(c.name, c.name), alg: c.alg, alts: c.alts, trainer: 'oll' }
    }),
  },
  {
    title: L('3. Hoán vị góc', '3. Permute the corners'),
    desc: L('Tìm “đèn pha” (hai góc cạnh nhau cùng màu). Có đèn pha thì đặt nó bên trái và làm T-perm. Không có thì làm Y-perm.', 'Look for headlights (two neighbouring corners of one colour). If you see them, put them on the left and do a T-perm. If not, do a Y-perm.'),
    arrows: true,
    cases: TWO_LOOK.cp.map((c) => ({ id: c.id, title: c.name, alg: c.alg })),
  },
  {
    title: L('4. Hoán vị cạnh', '4. Permute the edges'),
    desc: L('Góc đã đúng, chỉ còn cạnh: Ua và Ub xoay 3 cạnh, H đổi hai cặp đối diện, Z đổi hai cặp kề nhau.', 'Corners are done, just edges left: Ua and Ub cycle three, H swaps opposite pairs, Z swaps neighbouring pairs.'),
    arrows: true,
    cases: TWO_LOOK.ep.map((id) => {
      const c = byId(id)
      return { id: c.id, title: c.name, sub: c.nick, alg: c.alg, alts: c.alts, trainer: 'pll' }
    }),
  },
]

const PLAN = [
  L('Ngày 1: 3 công thức định hướng cạnh (bạn đã quen một cái rồi).', 'Day 1: the 3 edge algorithms (you already know one).'),
  L('Ngày 2 và 3: Sune, Anti-Sune, rồi 5 ca OCLL còn lại.', 'Days 2 and 3: Sune, Anti-Sune, then the other 5 OCLLs.'),
  L('Ngày 4: T-perm và Y-perm.', 'Day 4: T-perm and Y-perm.'),
  L('Ngày 5: Ua, Ub, H, Z. Sau đó giải 20 lần liền chỉ dùng 2-Look.', 'Day 5: Ua, Ub, H, Z. Then do 20 solves using only 2-Look.'),
]

export default function Intermediate() {
  const { t } = useLang()
  const [open, setOpen] = useState<DrawerCase | null>(null)
  const { learned } = useLearned()
  const close = useCallback(() => setOpen(null), [])
  const str = (x: Tx | string) => (typeof x === 'string' ? x : t(x))
  return (
    <div className="page">
      <div className="container">
        <PageHead crumbs={[{ to: '/learn', label: t(L('Học', 'Learn')) }]} eyebrow={t(L('Cầu nối lên CFOP', 'The bridge to CFOP'))} title="2-Look OLL & PLL">
          <p>{t(L('Giải tầng cuối trong 4 lượt nhìn với 16 công thức thay vì 78. Thuộc xong bộ này, thời gian giải thường giảm từ khoảng 2 phút xuống dưới 1 phút.', 'Solve the last layer in four looks with 16 algorithms instead of 78. Once these stick, most people drop from about two minutes to under one.'))}</p>
          <div className="callout">
            <div className="callout-title">
              <CalendarDays size={16} />
              {t(L('Gợi ý lịch học 5 ngày', 'A 5-day plan'))}
            </div>
            <ul>
              {PLAN.map((p) => (
                <li key={p.en}>{t(p)}</li>
              ))}
            </ul>
          </div>
        </PageHead>
        {SECTIONS.map((s) => (
          <section key={s.title.en} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem' }}>{t(s.title)}</h2>
            <p className="text-2" style={{ maxWidth: '44rem' }}>
              {t(s.desc)}
            </p>
            <div className="case-grid">
              {s.cases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="case-card"
                  onClick={() => setOpen({ id: c.id, title: str(c.title), subtitle: c.sub ? str(c.sub) : undefined, alg: c.alg, alts: c.alts, mask: s.mask, trainerSet: c.trainer })}
                >
                  {learned[c.id] && <Star className="learned" size={15} fill="currentColor" />}
                  <LLDiagram className="diagram" state={caseState(c.alg)} mask={s.mask} arrows={s.arrows} />
                  <div className="name">{str(c.title)}</div>
                  <div className="alg">{c.alg}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <CaseDrawer c={open} onClose={close} />
    </div>
  )
}
