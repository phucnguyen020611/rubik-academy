import { useState } from 'react'
import { ArrowRight, Home, Lightbulb } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { AlgPlayer } from '../cube/AlgPlayer'
import type { MaskName } from '../data/beginner'
import { useLang, L, type Tx } from '../i18n'
import { Button } from '../ui/Button'

interface Stage {
  name: string
  title: Tx
  body: Tx
  alg: string
  pre?: string
  mask?: MaskName
  link?: { to: string; label: Tx }
}

const CFOP: Stage[] = [
  { name: 'C', title: L('Cross, dấu thập', 'Cross'), body: L('Giải 4 cạnh trắng ở mặt đáy ngay từ đầu, không qua bông hoa. Cố lên kế hoạch cả dấu thập trong 15 giây quan sát và làm trong 8 nước trở xuống.', 'Solve the four white edges on the bottom straight away, no daisy. Aim to plan the whole cross during the 15-second inspection and finish it in 8 moves or fewer.'), alg: 'U F2 U R2 U2 B2 U L2', mask: 'cross', link: { to: '/learn/beginner?step=2', label: L('Ôn lại dấu thập', 'Review the cross') } },
  { name: 'F', title: L('F2L, hai tầng đầu', 'F2L'), body: L('Ghép một góc trắng với cạnh tầng giữa của nó thành cặp, rồi chèn cả cặp vào slot. Bốn cặp là xong hai tầng. Đây là bước tốn thời gian nhất.', 'Pair a white corner with its middle-layer edge and insert them together. Four pairs and two layers are done. This is where most of the time goes.'), alg: "U R U' R' U' F' U F", pre: "R U R' U R U2 R'", mask: 'f2lcase', link: { to: '/learn/f2l', label: L('41 ca F2L', '41 F2L cases') } },
  { name: 'O', title: L('OLL, định hướng tầng cuối', 'OLL'), body: L('Một công thức làm vàng cả mặt trên. Bắt đầu với 2-Look (10 công thức), rồi học dần cho đủ 57.', 'One algorithm turns the whole top yellow. Start with 2-Look (10 algorithms) and build up to all 57.'), alg: "R U R' U' R' F R F'", mask: 'oll', link: { to: '/learn/oll', label: L('Thư viện OLL', 'OLL library') } },
  { name: 'P', title: L('PLL, hoán vị tầng cuối', 'PLL'), body: L('Một công thức đổi chỗ các viên tầng trên để hoàn thành khối. Có 21 ca, ca nào cũng có tên riêng.', 'One algorithm moves the top pieces into place. There are 21 cases, each with its own name.'), alg: "R U R' U' R' F R2 U' R' U' R U R' F'", link: { to: '/learn/pll', label: L('Thư viện PLL', 'PLL library') } },
]

const ROUX: Stage[] = [
  { name: 'FB', title: L('Khối thứ nhất', 'First block'), body: L('Xây một khối 1×2×3 ở bên trái, gồm đáy và tầng giữa. Hoàn toàn dựa vào trực giác, dùng nhiều R, r, U, M.', 'Build a 1×2×3 block on the left covering the bottom and middle. Fully intuitive, lots of R, r, U and M.'), alg: "F' U' L2 D' L'", pre: "R U r' U2 M' U R' U' r2 U", mask: 'all' },
  { name: 'SB', title: L('Khối thứ hai', 'Second block'), body: L('Xây khối 1×2×3 thứ hai bên phải mà không phá khối đầu, chỉ dùng R, r, U, M.', 'Build the matching block on the right without breaking the first, using only R, r, U and M.'), alg: "R U' R' U2 r U r'", pre: "U M' U2 M U' M2 U", mask: 'all' },
  { name: 'CMLL', title: L('Bốn góc trên', 'CMLL'), body: L('Định hướng và hoán vị 4 góc tầng trên cùng lúc. Có 42 ca, hoặc chia làm 2 bước với ít công thức hơn. Không cần giữ các cạnh trên.', 'Orient and permute the four top corners together. 42 cases, or a two-step version with fewer. The top edges can be ignored.'), alg: "R U R' U R U2 R'", pre: "M U2 M' U2", mask: 'all' },
  { name: 'LSE', title: L('Sáu cạnh cuối', 'Last six edges'), body: L('Giải 6 cạnh còn lại chỉ bằng M và U: định hướng, đặt UL và UR, rồi hoàn tất tầng giữa. Rất nhanh và gần như không phải đổi tay.', 'Solve the last six edges with nothing but M and U: orient, place UL and UR, then finish the middle. Very fast, barely any regrips.'), alg: "M' U M U2 M' U M", mask: 'all' },
]

const MILESTONES: [string, Tx][] = [
  ['2:00+', L('Phương pháp người mới', 'Beginner method')],
  ['~1:00', L('2-Look OLL/PLL, F2L trực giác', '2-Look and intuitive F2L')],
  ['~0:30', L('Đủ PLL, F2L gọn, nhìn trước cặp tiếp theo', 'Full PLL, clean F2L, look-ahead')],
  ['<0:20', L('Đủ OLL, dấu thập 8 nước, F2L không ngắt quãng', 'Full OLL, 8-move cross, smooth F2L')],
  ['<0:12', L('Xcross, nhìn trước nhiều cặp, ZBLL', 'Xcross, multi-pair look-ahead, ZBLL')],
]

const METHODS: [string, string, Tx, Tx][] = [
  ['CFOP', '~55', L('78 + F2L', '78 + F2L'), L('Dễ nhận diện, nhiều tài liệu', 'Easy recognition, lots of material')],
  ['Roux', '~48', L('42 CMLL', '42 CMLL'), L('Ít nước, ít xoay khối', 'Few moves, few rotations')],
  ['ZZ', '~55', L('OCLL hoặc ZBLL', 'OCLL or ZBLL'), L('F2L chỉ dùng R, U, L', 'F2L with only R, U, L')],
  ['Petrus', '~50', L('Ít', 'Few'), L('Xây khối, tiết kiệm nước', 'Block building, move-efficient')],
]

function Stages({ stages }: { stages: Stage[] }) {
  const { t } = useLang()
  const [i, setI] = useState(0)
  const s = stages[i]
  return (
    <div className="split" style={{ alignItems: 'start', marginTop: '0.75rem' }}>
      <AlgPlayer key={s.name} alg={s.alg} pre={s.pre} mask={s.mask} scheme="yellowTop" />
      <div className="grid" style={{ gap: '0.5rem' }}>
        {stages.map((x, k) => (
          <div key={x.name} role="button" tabIndex={0} className={`stage-card card ${k === i ? 'active' : ''}`} onClick={() => setI(k)} onKeyDown={(e) => e.key === 'Enter' && setI(k)}>
            <span className="stage-letter">{x.name}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{t(x.title)}</strong>
              <p className="text-2 small" style={{ margin: '0.25rem 0 0' }}>
                {t(x.body)}
              </p>
              {x.link && k === i && (
                <Button to={x.link.to} size="sm" variant="primary" iconRight={ArrowRight} className="stage-link">
                  {t(x.link.label)}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Article({ slug }: { slug: 'cfop' | 'roux' | '404' }) {
  const { t } = useLang()
  const learn = { to: '/learn', label: t(L('Học', 'Learn')) }
  if (slug === 'cfop')
    return (
      <div className="page">
        <div className="container">
          <PageHead crumbs={[learn]} eyebrow="Cross · F2L · OLL · PLL" title="CFOP">
            <p>{t(L('CFOP là phương pháp được dùng nhiều nhất trong các giải đấu. Bản đầy đủ có 119 trường hợp, nhưng bạn có thể bắt đầu nhanh với 2-Look và F2L trực giác.', 'CFOP is the most used method in competition. The full version has 119 cases, but you can get going quickly with 2-Look and intuitive F2L.'))}</p>
          </PageHead>
          <Stages stages={CFOP} />
          <section className="section-sm">
            <h2>{t(L('Các mốc thời gian', 'Time milestones'))}</h2>
            <div className="milestones">
              {MILESTONES.map(([time, d]) => (
                <div key={time} className="card card-pad">
                  <strong className="milestone-time">{time}</strong>
                  <p className="text-2 small" style={{ margin: '0.25rem 0 0' }}>
                    {t(d)}
                  </p>
                </div>
              ))}
            </div>
            <h2 style={{ marginTop: '2.5rem' }}>{t(L('So với các phương pháp khác', 'Compared with other methods'))}</h2>
            <div className="table-wrap card">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t(L('Phương pháp', 'Method'))}</th>
                    <th>{t(L('Số nước', 'Moves'))}</th>
                    <th>{t(L('Công thức', 'Algorithms'))}</th>
                    <th>{t(L('Điểm mạnh', 'Strength'))}</th>
                  </tr>
                </thead>
                <tbody>
                  {METHODS.map(([m, n, a, s]) => (
                    <tr key={m}>
                      <td>
                        <strong>{m}</strong>
                      </td>
                      <td className="mono">{n}</td>
                      <td>{t(a)}</td>
                      <td>{t(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    )
  if (slug === 'roux')
    return (
      <div className="page">
        <div className="container">
          <PageHead crumbs={[learn]} eyebrow={t(L('Phương pháp xây khối', 'A block-building method'))} title="Roux">
            <p>{t(L('Roux giải trung bình khoảng 48 nước, ít hơn CFOP, và gần như không phải xoay cả khối. Bước cuối chỉ dùng M và U nên tay rất thoải mái.', 'Roux averages around 48 moves, fewer than CFOP, and hardly ever rotates the cube. The last step is just M and U, which feels great in the hands.'))}</p>
          </PageHead>
          <Stages stages={ROUX} />
          <div className="callout" style={{ marginTop: '2rem', maxWidth: '44rem' }}>
            <div className="callout-title">
              <Lightbulb size={16} />
              {t(L('Khi nào nên thử Roux?', 'When to try Roux'))}
            </div>
            <p style={{ margin: 0 }}>{t(L('Nếu bạn thích suy nghĩ hơn học thuộc và muốn ít nước. Thử xây khối đầu tiên ở trang Chơi tự do, không cần công thức nào cả.', 'If you would rather think than memorise and want fewer moves. Try building the first block in Free play; no algorithms needed.'))}</p>
          </div>
        </div>
      </div>
    )
  return (
    <div className="page container not-found">
      <h1>404</h1>
      <p className="text-2">{t(L('Viên này lạc khỏi khối mất rồi.', 'This piece fell off the cube.'))}</p>
      <Button to="/" variant="primary" icon={Home}>
        {t(L('Về trang chủ', 'Back home'))}
      </Button>
    </div>
  )
}
