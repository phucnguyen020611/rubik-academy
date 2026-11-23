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
  { src: null, caption: L('Hai anh em và mấy khối Rubik đầu tiên', 'My brother and me with our first cubes') },
  { src: null, caption: L('Những buổi thi xem ai giải nhanh hơn', 'Racing to see who solves it first') },
]

const STORY: Tx[] = [
  L(
    'Tôi và em trai mê Rubik từ hồi còn nhỏ. Ban đầu chỉ là xoay cho vui, rồi thành những buổi tối ngồi thi xem ai giải nhanh hơn, ai thuộc thêm được một công thức mới.',
    'My younger brother and I have loved the Rubik’s cube since we were kids. It started as something to fidget with, then turned into evenings spent racing each other and trading every new algorithm we learned.',
  ),
  L(
    'Để học, hai anh em đọc đủ thứ: các trang dạy giải Rubik, bảng công thức in ra giấy, video quay chậm từng bước. Cái khó nhất luôn là hình dung. Nhìn một dãy ký hiệu như R U R′ U′ trên giấy rất khó biết khối sẽ xoay thế nào, và mỗi nguồn lại vẽ hình theo một kiểu khác nhau.',
    'To learn, we read everything we could find: cube-solving websites, printed algorithm sheets, slowed-down videos. The hard part was always picturing it. A string like R U R′ U′ on paper doesn’t tell you what the cube will actually do, and every source drew its diagrams differently.',
  ),
  L(
    'Nên tôi tự dựng Rubik Academy: một chỗ bằng tiếng Việt, nơi công thức nào cũng chạy được trên khối 3D, có thể tua từng nước, xoay quanh để xem, và hình minh hoạ luôn khớp với công thức vì chúng được tính ra từ chính công thức đó.',
    'So I built Rubik Academy: one place, in Vietnamese and English, where every algorithm plays on a 3D cube you can step through and turn around, and where every diagram matches its algorithm because it is computed from it.',
  ),
  L(
    'Trang này vẫn đang được làm tiếp. Em trai tôi là người thử đầu tiên cho mọi tính năng, và cũng là người chê thẳng nhất.',
    'It is still a work in progress. My brother tests every feature first, and he is also its harshest critic.',
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
        <PageHead eyebrow={t(L('Giới thiệu', 'About'))} title={t(L('Hai anh em và một khối Rubik', 'Two brothers and a cube'))}>
          <p>{t(L('Rubik Academy bắt đầu từ một sở thích chung trong nhà, rồi lớn dần thành một trang học Rubik đầy đủ.', 'Rubik Academy started as a hobby we shared at home and slowly grew into a full place to learn the cube.'))}</p>
        </PageHead>

        <section className="about-author card fade-up">
          <img className="about-avatar" src={`${GITHUB}.png?size=240`} alt="Phuc Nguyen Hoang" width={120} height={120} />
          <div className="about-author-body">
            <span className="eyebrow">{t(L('Tác giả', 'Made by'))}</span>
            <h2>Phuc Nguyen Hoang</h2>
            <p className="text-2">{t(L('Thiết kế, lập trình và viết toàn bộ nội dung. Thích Rubik, thích làm sản phẩm, và thích những thứ được làm kỹ.', 'Design, code and every word of the content. Into cubes, building products and things made with care.'))}</p>
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
                  'Cảm ơn em trai tôi, người cùng chơi và cùng học từ những ngày đầu. Cảm ơn cộng đồng Rubik đã chia sẻ công thức, ký hiệu và phương pháp một cách rộng rãi; phần lớn những gì tôi biết đều học từ đó.',
                  'Thanks to my brother, who has played and learned alongside me from the start. And thanks to the cubing community for sharing algorithms, notation and methods so freely; most of what I know came from them.',
                ),
              )}
            </p>
          </div>
          <Button to="/learn" variant="soft" size="sm" iconRight={ArrowRight}>
            {t(L('Bắt đầu học', 'Start learning'))}
          </Button>
        </section>
      </div>
    </div>
  )
}
