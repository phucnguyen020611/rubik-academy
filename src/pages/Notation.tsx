import { useState } from 'react'
import { ArrowRight, Box } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { AlgPlayer } from '../cube/AlgPlayer'
import { useLang, L } from '../i18n'
import { Button, Chip, Kbd } from '../ui/Button'

const GROUPS = [
  { title: L('Xoay một mặt', 'Face turns'), desc: L('Một chữ cái là xoay mặt đó 90° theo chiều kim đồng hồ, khi bạn nhìn thẳng vào mặt đó.', 'A letter means turn that face 90° clockwise, as if you were looking straight at it.'), moves: ['R', 'L', 'U', 'D', 'F', 'B'] },
  { title: L('Ngược chiều và nửa vòng', 'Prime and double'), desc: L("Dấu ' nghĩa là xoay ngược chiều kim đồng hồ. Số 2 là xoay nửa vòng (180°).", "A ' means anticlockwise. A 2 means a half turn (180°)."), moves: ["R'", "U'", "F'", 'R2', 'U2', 'F2'] },
  { title: L('Tầng giữa', 'Slice moves'), desc: L('M xoay theo chiều của L, E theo chiều của D, S theo chiều của F.', 'M follows L, E follows D, S follows F.'), moves: ['M', "M'", 'E', 'S'] },
  { title: L('Xoay hai tầng', 'Wide moves'), desc: L('Chữ thường (r, u, f…) hoặc Rw nghĩa là xoay hai tầng cùng lúc.', 'Lowercase letters (r, u, f…) or Rw turn two layers together.'), moves: ['r', 'u', 'f', "l'"] },
  { title: L('Xoay cả khối', 'Whole-cube rotations'), desc: L('x theo chiều R, y theo chiều U, z theo chiều F. Chỉ đổi góc cầm, không làm xáo khối.', 'x follows R, y follows U, z follows F. They change your grip, not the cube.'), moves: ['x', 'y', 'z'] },
]

const LETTERS = [
  ['R', L('Right, mặt phải', 'Right')],
  ['L', L('Left, mặt trái', 'Left')],
  ['U', L('Up, mặt trên', 'Up')],
  ['D', L('Down, mặt dưới', 'Down')],
  ['F', L('Front, mặt trước', 'Front')],
  ['B', L('Back, mặt sau', 'Back')],
] as const

export default function Notation() {
  const { t } = useLang()
  const [move, setMove] = useState('R')
  return (
    <div className="page">
      <div className="container">
        <PageHead crumbs={[{ to: '/learn', label: t(L('Học', 'Learn')) }]} eyebrow={t(L('Bài 0 · 10 phút', 'Lesson 0 · 10 min'))} title={t(L('Ký hiệu Rubik', 'Cube notation'))}>
          <p>{t(L('Mọi công thức đều được viết bằng chữ cái. Bấm một nước xoay bên dưới để xem nó trên khối.', 'Every algorithm is written with letters. Click a move below to watch it on the cube.'))}</p>
        </PageHead>
        <div className="split" style={{ alignItems: 'start' }}>
          <div>
            <AlgPlayer key={move} alg={move} setup="" scheme="standard" autoPlay />
            <p className="muted small" style={{ marginTop: '0.5rem' }}>
              {t(L('Màu chuẩn: trắng ở trên, xanh lá phía trước, đỏ bên phải.', 'Standard colours: white on top, green in front, red on the right.'))}
            </p>
          </div>
          <div className="grid" style={{ gap: '0.75rem' }}>
            {GROUPS.map((g) => (
              <div key={g.title.en} className="card card-pad">
                <h3 style={{ marginBottom: '0.25rem' }}>{t(g.title)}</h3>
                <p className="text-2 small">{t(g.desc)}</p>
                <div className="row" style={{ gap: '0.5rem' }}>
                  {g.moves.map((m) => (
                    <Chip key={m} mono active={m === move} onClick={() => setMove(m)}>
                      {m}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="section-sm">
          <h2>{t(L('Khối Rubik gồm những gì', 'What the cube is made of'))}</h2>
          <div className="feature-grid" style={{ marginTop: '1rem' }}>
            {[
              [L('6 viên tâm', '6 centres'), L('Tâm không bao giờ đổi chỗ với nhau, nên chúng quyết định màu của từng mặt. Trắng đối vàng, xanh lá đối xanh dương, đỏ đối cam.', 'Centres never move relative to each other, so they decide each face’s colour. White opposite yellow, green opposite blue, red opposite orange.')],
              [L('12 viên cạnh', '12 edges'), L('Mỗi cạnh có 2 màu. Cạnh trắng–xanh lá luôn nằm giữa tâm trắng và tâm xanh lá khi khối đã giải.', 'Each edge has two colours. On a solved cube the white–green edge sits between the white and green centres.')],
              [L('8 viên góc', '8 corners'), L('Mỗi góc có 3 màu. Giải Rubik thực ra là đưa 20 viên cạnh và góc về đúng chỗ, đúng hướng.', 'Each corner has three colours. Solving is really just putting 20 edges and corners back in place, the right way round.')],
            ].map(([a, b]) => (
              <div className="feature" key={a.en}>
                <h3 style={{ marginTop: 0 }}>{t(a)}</h3>
                <p className="text-2">{t(b)}</p>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ marginTop: '1rem' }}>
            <h3>{t(L('Tên các mặt', 'Face names'))}</h3>
            <div className="letters">
              {LETTERS.map(([l, d]) => (
                <div key={l} className="row nowrap">
                  <Kbd>{l}</Kbd>
                  <span className="text-2">{t(d)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="row" style={{ marginTop: '1.5rem' }}>
            <Button to="/learn/beginner" variant="primary" iconRight={ArrowRight}>
              {t(L('Sang bài Người mới', 'On to the beginner method'))}
            </Button>
            <Button to="/play" variant="secondary" icon={Box}>
              {t(L('Tự tay thử', 'Try it yourself'))}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
