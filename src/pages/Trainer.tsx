import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Eye, Flame, RotateCcw, X } from 'lucide-react'
import { PageHead, useLearned } from '../components/Shared'
import { IsoCube, LLDiagram, caseState } from '../cube/Diagrams'
import { stateFromAlg, invertAlg } from '../cube/engine'
import { OLL, type AlgCase } from '../data/oll'
import { PLL } from '../data/pll'
import { F2L } from '../data/f2l'
import { TWO_LOOK } from '../data/beginner'
import { useStored } from '../theme'
import { useLang, L } from '../i18n'
import { Badge, Button, Kbd } from '../ui/Button'
import { Checkbox, Segmented } from '../ui/Form'

const SETS: Record<string, { label: string; cases: AlgCase[] }> = {
  pll: { label: 'PLL', cases: PLL },
  oll: { label: 'OLL', cases: OLL },
  '2look': { label: '2-Look', cases: [...OLL.filter((c) => TWO_LOOK.co.includes(c.id)), ...PLL.filter((c) => TWO_LOOK.ep.includes(c.id))] },
  f2l: { label: 'F2L', cases: F2L },
}
const AUF = ['', 'U', 'U2', "U'"]

interface Score {
  ok: number
  miss: number
}

export default function Trainer() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const setKey = SETS[params.get('set') ?? ''] ? params.get('set')! : 'pll'
  const set = SETS[setKey]
  const { learned, toggle } = useLearned()
  const [onlyTodo, setOnlyTodo] = useState(false)
  const [scores, setScores] = useStored<Record<string, Score>>('ra-trainer', {})
  const pool = useMemo(() => {
    const p = onlyTodo ? set.cases.filter((c) => !learned[c.id]) : set.cases
    return p.length ? p : set.cases
  }, [set, onlyTodo, learned])

  const pick = useCallback(() => {
    const w = pool.map((c) => {
      const s = scores[c.id] ?? { ok: 0, miss: 0 }
      return 1 + (s.miss * 2) / (1 + s.ok)
    })
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    let i = 0
    while (r > w[i] && i < w.length - 1) r -= w[i++]
    return { c: pool[i], auf: setKey === 'f2l' ? '' : AUF[Math.floor(Math.random() * 4)] }
  }, [pool, scores, setKey])

  const [cur, setCur] = useState(pick)
  const [reveal, setReveal] = useState(false)
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    setCur(pick())
    setReveal(false)
  }, [setKey, onlyTodo]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(
    (ok: boolean | null) => {
      if (ok !== null) {
        setScores((s) => {
          const o = s[cur.c.id] ?? { ok: 0, miss: 0 }
          return { ...s, [cur.c.id]: ok ? { ...o, ok: o.ok + 1 } : { ...o, miss: o.miss + 1 } }
        })
        setStreak((x) => (ok ? x + 1 : 0))
      }
      setCur(pick())
      setReveal(false)
    },
    [cur, pick, setScores],
  )

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (!reveal) setReveal(true)
        else next(true)
      } else if (reveal && e.key.toLowerCase() === 'x') next(false)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [reveal, next])

  const state = useMemo(() => stateFromAlg(3, `${invertAlg(cur.c.alg)} ${cur.auf}`), [cur])
  const mask = setKey === 'oll' ? 'oll' : setKey === 'f2l' ? 'f2lcase' : undefined
  const s = scores[cur.c.id]
  const totalOk = set.cases.reduce((a, c) => a + (scores[c.id]?.ok ?? 0), 0)
  const totalMiss = set.cases.reduce((a, c) => a + (scores[c.id]?.miss ?? 0), 0)

  return (
    <div className="page">
      <div className="container">
        <PageHead eyebrow={t(L('Công cụ', 'Tools'))} title={t(L('Luyện công thức', 'Algorithm trainer'))}>
          <p>{t(L('Nhìn hình, nhớ lại công thức trong đầu, rồi lật đáp án. Ca nào bạn hay quên sẽ xuất hiện thường xuyên hơn.', 'Look at the case, recall the algorithm, then reveal the answer. Cases you miss come back more often.'))}</p>
        </PageHead>
        <div className="toolbar">
          <Segmented value={setKey} onChange={(v) => setParams({ set: v })} ariaLabel={t(L('Bộ công thức', 'Algorithm set'))} options={Object.entries(SETS).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Checkbox checked={onlyTodo} onChange={setOnlyTodo} label={t(L('Chỉ những ca chưa thuộc', 'Only cases I have not learned'))} />
        </div>
        <div className="trainer">
          <div className="card trainer-card">
            <div className="panel-row" style={{ width: '100%' }}>
              <Badge tone={streak >= 5 ? 'gold' : 'green'} icon={Flame}>
                {t(L(`Chuỗi ${streak}`, `Streak ${streak}`))}
              </Badge>
              <span className="muted small truncate">{s ? t(L(`Nhớ ${s.ok} lần, quên ${s.miss} lần`, `Got it ${s.ok}×, missed ${s.miss}×`)) : t(L('Lần đầu gặp ca này', 'First time seeing this one'))}</span>
            </div>
            {setKey === 'f2l' ? <IsoCube className="trainer-diagram" state={state} mask={mask} /> : <LLDiagram className="trainer-diagram" state={state} mask={mask} />}
            {!reveal ? (
              <Button variant="primary" size="lg" icon={Eye} onClick={() => setReveal(true)}>
                {t(L('Xem đáp án', 'Show answer'))} <Kbd>Space</Kbd>
              </Button>
            ) : (
              <div className="trainer-answer fade-up">
                <h2 style={{ marginBottom: '0.25rem' }}>{cur.c.name}</h2>
                {cur.c.nick && <div className="muted small">{t(cur.c.nick)}</div>}
                <div className="alg trainer-alg">
                  {cur.auf && <span className="muted">({invertAlg(cur.auf)}) </span>}
                  {cur.c.alg}
                </div>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Button variant="secondary" icon={X} onClick={() => next(false)}>
                    {t(L('Quên rồi', 'Missed it'))} <Kbd>X</Kbd>
                  </Button>
                  <Button variant="primary" icon={Check} onClick={() => next(true)}>
                    {t(L('Nhớ', 'Got it'))} <Kbd>Space</Kbd>
                  </Button>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <Checkbox checked={!!learned[cur.c.id]} onChange={() => toggle(cur.c.id)} label={t(L('Đánh dấu đã thuộc', 'Mark as learned'))} />
                </div>
              </div>
            )}
          </div>
          <aside className="card card-pad">
            <h4 className="section-title">{t(L(`Thống kê ${set.label}`, `${set.label} stats`))}</h4>
            <div className="stat-grid">
              <div>
                <span>{t(L('Nhớ', 'Correct'))}</span>
                <strong>{totalOk}</strong>
              </div>
              <div>
                <span>{t(L('Quên', 'Missed'))}</span>
                <strong>{totalMiss}</strong>
              </div>
              <div>
                <span>{t(L('Đã thuộc', 'Learned'))}</span>
                <strong>
                  {set.cases.filter((c) => learned[c.id]).length}/{set.cases.length}
                </strong>
              </div>
              <div>
                <span>{t(L('Chính xác', 'Accuracy'))}</span>
                <strong>{totalOk + totalMiss ? Math.round((totalOk / (totalOk + totalMiss)) * 100) + '%' : '–'}</strong>
              </div>
            </div>
            <div className="mini-cases">
              {set.cases.map((c) => {
                const sc = scores[c.id]
                const tone = !sc ? '' : sc.ok >= sc.miss * 2 && sc.ok >= 2 ? 'good' : sc.miss > sc.ok ? 'bad' : 'mid'
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`mini-case ${tone} ${c.id === cur.c.id ? 'current' : ''}`}
                    data-tip={c.name}
                    aria-label={c.name}
                    onClick={() => {
                      setCur({ c, auf: '' })
                      setReveal(false)
                    }}
                  >
                    {setKey === 'f2l' ? <IsoCube state={caseState(c.alg)} mask="f2lcase" /> : <LLDiagram state={caseState(c.alg)} mask={mask} />}
                  </button>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              style={{ marginTop: '0.75rem' }}
              onClick={() => setScores((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !set.cases.some((c) => c.id === k))))}
            >
              {t(L('Đặt lại thống kê', 'Reset stats'))}
            </Button>
          </aside>
        </div>
      </div>
    </div>
  )
}
