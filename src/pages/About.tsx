import { ArrowRight, BookOpen, Box, Camera, Heart, Layers, Mountain, ScanLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { IsoCube } from '../cube/Diagrams'
import { stateFromAlg } from '../cube/engine'
import { OLL } from '../data/oll'
import { PLL } from '../data/pll'
import { F2L } from '../data/f2l'
import { ICEBERG } from '../data/iceberg'
import { useLang, L, type Tx } from '../i18n'
import { Button } from '../ui/Button'
import { GithubMark } from '../ui/Brand'

const GITHUB = 'https://github.com/phucnguyen020611'
const REPO = 'https://github.com/phucnguyen020611/rubik-academy'

/**
 * Family photos. Drop the files into `public/about/` and set `src` (e.g. 'about/brothers.jpg').
 * Until then each slot shows a placeholder frame.
 */
const PHOTOS: { src: string | null; caption: Tx }[] = [
  { src: null, caption: L('Hai anh em với mấy khối Rubik đầu tiên', 'My brother and me with our first cubes') },
  { src: null, caption: L('Thi xem ai giải nhanh hơn', 'Seeing who can solve it faster') },
]

const STORY: Tx[] = [
  L(
    'Mình với em trai chơi Rubik cũng lâu rồi. Hồi đầu chỉ cầm xoay lung tung, sau đó tập giải theo hướng dẫn, tới giờ thì hay ngồi bấm giờ xem đứa nào nhanh hơn.',
    'My younger brother and I have been playing with Rubik’s cubes for a long time. At first we just twisted them around, then we learned to solve them from guides, and these days we mostly time each other to see who’s faster.',
  ),
  L(
    'Hồi học, mình đọc khá nhiều trang dạy giải Rubik, in bảng công thức ra giấy, xem video rồi tua đi tua lại. Khó nhất là nhìn mấy ký hiệu kiểu R U R′ U′ mà không hình dung ra khối sẽ xoay thế nào. Mỗi chỗ lại vẽ hình một kiểu, đọc qua đọc lại nhiều khi rối thêm.',
    'When we were learning, I read a lot of cube tutorials, printed out algorithm sheets and kept rewinding videos. The hardest part was looking at something like R U R′ U′ and not being able to picture what the cube would do. Every source drew its diagrams a bit differently too, which didn’t help.',
  ),
  L(
    'Nên mình làm trang này. Công thức nào cũng có khối 3D để bấm xem từng nước, muốn xoay qua lại nhìn kỹ cũng được. Hình minh hoạ được tạo ra từ chính công thức nên lúc nào cũng khớp.',
    'So I made this site. Every algorithm has a 3D cube you can step through move by move and turn around to look at. The diagrams are generated from the algorithms themselves, so they always match.',
  ),
  L(
    'Trang vẫn đang làm tiếp. Làm xong cái gì mình cũng đưa em trai thử trước, và nó chê cũng không ít.',
    'It’s still a work in progress. Whenever I finish something, my brother gets to try it first, and he’s never short of complaints.',
  ),
]

export default function About() {
  const { t } = useLang()
  const stats: { icon: LucideIcon; value: string; label: Tx }[] = [
    { icon: Layers, value: String(F2L.length + OLL.length + PLL.length), label: L('công thức CFOP có khối 3D', 'CFOP algorithms with a 3D cube') },
    { icon: Mountain, value: String(ICEBERG.length), label: L('kỹ thuật trong tảng băng', 'ideas on the iceberg') },
    { icon: Box, value: '2×2 – 5×5', label: L('khối để chơi tự do', 'cubes for free play') },
    { icon: ScanLine, value: '6', label: L('mặt quét bằng camera, rồi giải', 'faces to scan, then solve') },
  ]
  return (
    <div className="page">
      <div className="container about">
        <PageHead eyebrow={t(L('Giới thiệu', 'About'))} title={t(L('Về Rubik Academy', 'About Rubik Academy'))}>
          <p>{t(L('Chào bạn, mình là Phúc. Đây là trang mình tự làm, ban đầu chỉ để hai anh em trong nhà học Rubik cho tiện.', 'Hi, I’m Phuc. I made this site myself, at first just so my brother and I had an easier way to learn the cube.'))}</p>
        </PageHead>

        <section className="about-author card fade-up">
          <img className="about-avatar" src={`${GITHUB}.png?size=240`} alt="Phuc Nguyen Hoang" width={120} height={120} />
          <div className="about-author-body">
            <span className="eyebrow">{t(L('Tác giả', 'Made by'))}</span>
            <h2>Phuc Nguyen Hoang</h2>
            <p className="text-2">{t(L('Mình tự thiết kế, tự code và tự viết nội dung cho trang. Có góp ý gì thì cứ nhắn mình qua GitHub nhé.', 'I designed, coded and wrote everything on this site. If you have feedback, feel free to reach me on GitHub.'))}</p>
            <div className="row">
              <Button href={GITHUB} variant="primary" size="sm" icon={GithubMark} target="_blank" rel="noreferrer">
                GitHub
              </Button>
              <Button href={REPO} variant="secondary" size="sm" icon={BookOpen} target="_blank" rel="noreferrer">
                {t(L('Mã nguồn', 'Source code'))}
              </Button>
            </div>
          </div>
          <IsoCube className="about-cube" state={stateFromAlg(3, "R U R' U' R' F R2 U' R' U' R U R' F'")} scheme="standard" />
        </section>

        <div className="about-grid">
          <section className="about-story">
            <h2>{t(L('Câu chuyện', 'The story'))}</h2>
            {STORY.map((p, i) => (
              <p key={i}>{t(p)}</p>
            ))}
          </section>
          <section className="about-photos">
            {PHOTOS.map((ph, i) => (
              <figure key={i} className={`about-photo ${i % 2 ? 'tilt-r' : 'tilt-l'}`}>
                {ph.src ? (
                  <img src={`${import.meta.env.BASE_URL}${ph.src}`} alt={t(ph.caption)} loading="lazy" />
                ) : (
                  <div className="about-photo-empty">
                    <Camera size={28} strokeWidth={1.6} />
                    <span>{t(L('Ảnh sắp có', 'Photo coming soon'))}</span>
                  </div>
                )}
                <figcaption>{t(ph.caption)}</figcaption>
              </figure>
            ))}
          </section>
        </div>

        <section className="section-sm">
          <h2 className="about-h2">{t(L('Trong trang có gì', 'What’s inside'))}</h2>
          <div className="about-stats">
            {stats.map((s) => (
              <div key={s.label.en} className="card about-stat">
                <s.icon size={20} strokeWidth={1.8} />
                <strong>{s.value}</strong>
                <span className="text-2 small">{t(s.label)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-sm about-thanks card">
          <Heart size={20} strokeWidth={1.8} />
          <div>
            <h3>{t(L('Lời cảm ơn', 'Thanks'))}</h3>
            <p className="text-2">
              {t(
                L(
                  'Cảm ơn em trai mình đã chơi cùng và chịu khó thử giúp từ hồi trang còn chưa ra hình gì. Cảm ơn mọi người trong cộng đồng Rubik đã chia sẻ công thức và cách giải, phần lớn những gì mình biết là học từ đó.',
                  'Thanks to my brother for playing with me and testing things back when the site barely worked. And thanks to everyone in the cubing community who shares algorithms and methods; most of what I know I learned from them.',
                ),
              )}
            </p>
          </div>
          <Button to="/learn" variant="soft" size="sm" iconRight={ArrowRight}>
            {t(L('Vào học thôi', 'Start learning'))}
          </Button>
        </section>
      </div>
    </div>
  )
}
