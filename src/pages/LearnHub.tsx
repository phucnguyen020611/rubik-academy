import { Link } from 'react-router-dom'
import { Box, Mountain, ScanLine, Target, Timer } from 'lucide-react'
import { PageHead, useLearned } from '../components/Shared'
import { IsoCube, LLDiagram, caseState } from '../cube/Diagrams'
import { stateFromAlg } from '../cube/engine'
import { OLL } from '../data/oll'
import { PLL } from '../data/pll'
import { F2L } from '../data/f2l'
import { useLang, L, type Tx } from '../i18n'
import { Badge, Button } from '../ui/Button'

interface Item {
  to: string
  title: Tx
  meta: Tx
  desc: Tx
  art: React.ReactNode
  badge?: Tx
}

const iso = (alg: string, mask?: Parameters<typeof IsoCube>[0]['mask']) => <IsoCube className="hub-art" state={stateFromAlg(3, alg)} mask={mask} />

const SECTIONS: { title: Tx; desc: Tx; items: Item[] }[] = [
  {
    title: L('Bắt đầu', 'Start here'),
    desc: L('Chưa giải được lần nào? Hai bài này là đủ.', 'Never solved one before? These two are all you need.'),
    items: [
      { to: '/learn/notation', title: L('Ký hiệu', 'Notation'), meta: L('10 phút', '10 min'), desc: L("R, U', F2, M, x và cách đọc một công thức.", "R, U', F2, M, x and how to read an algorithm."), art: iso("R U'"), badge: L('Bài 0', 'Lesson 0') },
      { to: '/learn/beginner', title: L('Phương pháp người mới', 'Beginner method'), meta: L('8 bước', '8 steps'), desc: L('Bông hoa, dấu thập, rồi đi từng tầng đến khi xong.', 'Daisy, cross, then layer by layer until it is solved.'), art: iso("R U R' U R U2 R' F R U R' U' F'", 'f2l') },
    ],
  },
  {
    title: L('Nhanh hơn với CFOP', 'Getting faster with CFOP'),
    desc: L('Phương pháp phần lớn người chơi tốc độ đang dùng. Đi lần lượt từ trái sang phải.', 'The method most speedcubers use. Work through it left to right.'),
    items: [
      { to: '/learn/intermediate', title: L('2-Look OLL/PLL', '2-Look OLL/PLL'), meta: L('16 công thức', '16 algs'), desc: L('Giải tầng cuối trong 4 lượt nhìn.', 'The last layer in four looks.'), art: <LLDiagram className="hub-art ll" state={caseState("R U R' U R U2 R'")} mask="oll" /> },
      { to: '/learn/cfop', title: L('Tổng quan CFOP', 'CFOP overview'), meta: L('4 bước', '4 stages'), desc: L('Cross, F2L, OLL, PLL và các mốc thời gian.', 'Cross, F2L, OLL, PLL and the time milestones.'), art: iso("U R U' R'", 'f2lcase') },
      { to: '/learn/f2l', title: L('F2L', 'F2L'), meta: L('41 ca', '41 cases'), desc: L('Ghép cặp góc, cạnh rồi chèn vào slot.', 'Pair a corner and edge, then slot them in.'), art: <IsoCube className="hub-art" state={caseState(F2L[8].alg)} mask="f2lcase" /> },
      { to: '/learn/oll', title: L('OLL', 'OLL'), meta: L('57 ca', '57 cases'), desc: L('Một công thức để mặt trên vàng hết.', 'One algorithm for an all-yellow top.'), art: <LLDiagram className="hub-art ll" state={caseState(OLL[44].alg)} mask="oll" /> },
      { to: '/learn/pll', title: L('PLL', 'PLL'), meta: L('21 ca', '21 cases'), desc: L('Đổi chỗ các viên tầng trên để hoàn thành.', 'Swap the top pieces to finish.'), art: <LLDiagram className="hub-art ll" state={caseState(PLL[7].alg)} arrows /> },
    ],
  },
  {
    title: L('Xem thêm', 'Go further'),
    desc: L('Phương pháp khác, kỹ thuật nâng cao và vài thứ cho vui.', 'Other methods, advanced ideas and a few fun extras.'),
    items: [
      { to: '/learn/roux', title: L('Phương pháp Roux', 'The Roux method'), meta: L('~48 nước', '~48 moves'), desc: L('Xây hai khối 1×2×3, rồi kết thúc bằng M và U.', 'Build two 1×2×3 blocks, then finish with M and U.'), art: iso("M' U M U2 M' U M") },
      { to: '/learn/iceberg', title: L('Tảng băng Rubik', 'The cubing iceberg'), meta: L('30 kỹ thuật', '30 ideas'), desc: L('Sledge, Xcross, Keyhole, OLLCP, ZBLL…', 'Sledge, Xcross, Keyhole, OLLCP, ZBLL…'), art: <div className="hub-art hub-ice"><Mountain size={64} strokeWidth={1.3} /></div>, badge: L('Mới', 'New') },
      { to: '/learn/patterns', title: L('Hoạ tiết', 'Patterns'), meta: L('8 mẫu', '8 patterns'), desc: L('Bàn cờ, superflip, khối trong khối…', 'Checkerboard, superflip, cube in a cube…'), art: <IsoCube className="hub-art" state={stateFromAlg(3, 'M2 E2 S2')} scheme="standard" /> },
    ],
  },
]

export default function LearnHub() {
  const { t } = useLang()
  const { learned } = useLearned()
  const total = OLL.length + PLL.length + F2L.length
  const done = [...OLL, ...PLL, ...F2L].filter((c) => learned[c.id]).length
  return (
    <div className="page">
      <div className="container">
        <PageHead eyebrow={t(L('Học', 'Learn'))} title={t(L('Học giải Rubik', 'Learn to solve the cube'))}>
          <p>{t(L('Đi từ bài người mới đến CFOP, bước nào cũng có khối 3D để xem. Tiến độ được lưu ngay trên trình duyệt của bạn.', 'From the beginner method to CFOP, with a 3D cube for every step. Your progress stays in your browser.'))}</p>
          <div className="row">
            <div className="progress" style={{ width: '12rem' }}>
              <div style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <span className="muted small">{t(L(`Đã thuộc ${done}/${total} công thức CFOP`, `${done}/${total} CFOP algorithms learned`))}</span>
          </div>
        </PageHead>
        {SECTIONS.map((s) => (
          <section key={s.title.en} style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{t(s.title)}</h2>
            <p className="text-2" style={{ marginBottom: '1rem' }}>
              {t(s.desc)}
            </p>
            <div className="hub-grid">
              {s.items.map((it) => (
                <Link key={it.to} to={it.to} className="card card-link hub-card">
                  <div className="hub-art-wrap">{it.art}</div>
                  <div className="hub-body">
                    <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Badge>{t(it.meta)}</Badge>
                      {it.badge && <Badge tone="gold">{t(it.badge)}</Badge>}
                    </div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{t(it.title)}</h3>
                    <p className="text-2 small" style={{ margin: 0 }}>
                      {t(it.desc)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <section className="card card-pad tool-strip">
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>{t(L('Công cụ luyện tập', 'Practice tools'))}</h3>
            <p className="text-2 small" style={{ margin: 0 }}>
              {t(L('Bấm giờ, luyện nhận diện và ôn công thức.', 'Time your solves, drill recognition, review algorithms.'))}
            </p>
          </div>
          <div className="row">
            <Button to="/timer" variant="primary" icon={Timer}>
              {t(L('Bấm giờ', 'Timer'))}
            </Button>
            <Button to="/trainer" variant="secondary" icon={Target}>
              {t(L('Luyện tập', 'Trainer'))}
            </Button>
            <Button to="/play" variant="secondary" icon={Box}>
              {t(L('Chơi tự do', 'Free play'))}
            </Button>
            <Button to="/scan" variant="secondary" icon={ScanLine}>
              {t(L('Quét khối', 'Scan a cube'))}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
