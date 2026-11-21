import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { AlgPlayer } from '../cube/AlgPlayer'
import { BEGINNER } from '../data/beginner'
import { IsoCube, caseState } from '../cube/Diagrams'
import { useLang, L } from '../i18n'
import { Button } from '../ui/Button'
import { Segmented } from '../ui/Form'

export default function Beginner() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const stepIdx = Math.min(BEGINNER.length - 1, Math.max(0, Number(params.get('step') ?? 1) - 1))
  const [demoIdx, setDemoIdx] = useState(0)
  const step = BEGINNER[stepIdx]
  const demo = step.demos[Math.min(demoIdx, step.demos.length - 1)]
  const go = (i: number) => {
    setParams({ step: String(i + 1) })
    setDemoIdx(0)
  }

  return (
    <div className="page">
      <div className="container">
        <PageHead crumbs={[{ to: '/learn', label: t(L('Học', 'Learn')) }]} eyebrow={t(L('Phương pháp người mới', 'Beginner method'))} title={t(L('Giải khối 3×3 trong 8 bước', 'Solve the 3×3 in 8 steps'))}>
          <p>
            {t(L('Cầm khối với tâm vàng ở trên, tâm trắng ở dưới. Các viên chưa cần quan tâm được tô xám để bạn dễ tập trung. Chưa quen ký hiệu thì xem ', 'Hold the cube with yellow on top and white on the bottom. Pieces you do not need yet are greyed out. New to the letters? Read '))}
            <Link to="/learn/notation">{t(L('bài Ký hiệu', 'the notation page'))}</Link>
            {t(L(' trước nhé.', ' first.'))}
          </p>
        </PageHead>

        <div className="lesson">
          <nav className="lesson-steps" aria-label={t(L('Các bước', 'Steps'))}>
            {BEGINNER.map((s, i) => (
              <button key={s.id} type="button" className={`lesson-step ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`} onClick={() => go(i)}>
                <span className="num">{i + 1}</span>
                <span className="lesson-step-text">
                  <strong>{t(s.title)}</strong>
                  <small>{t(s.goal)}</small>
                </span>
              </button>
            ))}
          </nav>

          <article className="lesson-body fade-up" key={step.id}>
            <span className="eyebrow">{t(L(`Bước ${stepIdx + 1} / ${BEGINNER.length}`, `Step ${stepIdx + 1} of ${BEGINNER.length}`))}</span>
            <h2 style={{ margin: '0.5rem 0 0.5rem' }}>{t(step.title)}</h2>
            <p className="lead" style={{ marginBottom: '1rem' }}>
              {t(step.goal)}
            </p>
            {step.demos.length > 1 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <Segmented size="sm" value={demoIdx} onChange={setDemoIdx} ariaLabel={t(L('Ví dụ', 'Example'))} options={step.demos.map((d, i) => ({ value: i, label: t(d.title) }))} />
              </div>
            )}
            <AlgPlayer alg={demo.alg} pre={demo.pre} mask={demo.mask} scheme="yellowTop" />
            <div className="lesson-text">
              {step.body.map((b) => (
                <p key={b.en}>{t(b)}</p>
              ))}
              {step.tips && (
                <div className="callout">
                  <div className="callout-title">
                    <Lightbulb size={16} />
                    {t(L('Ghi nhớ', 'Remember'))}
                  </div>
                  <ul>
                    {step.tips.map((tip) => (
                      <li key={tip.en}>{t(tip)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="lesson-nav">
              <Button variant="secondary" icon={ArrowLeft} disabled={stepIdx === 0} onClick={() => go(stepIdx - 1)}>
                {t(L('Bước trước', 'Previous'))}
              </Button>
              {stepIdx < BEGINNER.length - 1 ? (
                <Button variant="primary" iconRight={ArrowRight} onClick={() => go(stepIdx + 1)}>
                  {t(L('Bước tiếp', 'Next step'))}
                </Button>
              ) : (
                <Button variant="primary" iconRight={ArrowRight} to="/learn/intermediate">
                  {t(L('Học tiếp 2-Look', 'On to 2-Look'))}
                </Button>
              )}
            </div>
          </article>
        </div>

        <section style={{ marginTop: '4rem' }}>
          <h2>{t(L('Tóm tắt cả 8 bước', 'All 8 steps at a glance'))}</h2>
          <p className="text-2">{t(L('Chụp lại màn hình này để mang theo khi tập.', 'Screenshot this to keep next to you while you practise.'))}</p>
          <div className="sheet">
            {BEGINNER.map((s, i) => (
              <button key={s.id} type="button" className="sheet-row card" onClick={() => go(i)}>
                <IsoCube className="sheet-iso" state={caseState('', s.demos[0].pre ?? '')} mask={s.demos[0].mask} />
                <div style={{ minWidth: 0 }}>
                  <strong>
                    {i + 1}. {t(s.title)}
                  </strong>
                  <div className="muted small">{t(s.goal)}</div>
                  <div className="alg small" style={{ marginTop: '0.25rem' }}>
                    {s.sheet}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
