import { useCallback, useMemo, useState } from 'react'
import { Search, Star, Target } from 'lucide-react'
import { CaseDrawer, PageHead, useLearned } from '../components/Shared'
import { IsoCube, LLDiagram, caseState } from '../cube/Diagrams'
import { algLength } from '../cube/engine'
import { OLL, OLL_GROUPS, type AlgCase } from '../data/oll'
import { PLL, PLL_GROUPS } from '../data/pll'
import { F2L, F2L_GROUPS } from '../data/f2l'
import { useLang, L, type Tx } from '../i18n'
import { Button, Chip } from '../ui/Button'
import { TextInput } from '../ui/Form'

type SetName = 'oll' | 'pll' | 'f2l'

const META: Record<SetName, { title: Tx; eyebrow: string; intro: Tx; cases: AlgCase[]; groups: Record<string, Tx> }> = {
  oll: {
    title: L('OLL, 57 trường hợp', 'OLL, 57 cases'),
    eyebrow: 'Orientation of the Last Layer',
    intro: L('Sau F2L, dùng một công thức để cả mặt trên thành màu vàng. Hình chỉ tô màu các sticker vàng, phần xám là những màu chưa cần quan tâm ở bước này.', 'After F2L, one algorithm turns the whole top yellow. Diagrams only show the yellow stickers; grey means the colour does not matter yet.'),
    cases: OLL,
    groups: OLL_GROUPS,
  },
  pll: {
    title: L('PLL, 21 trường hợp', 'PLL, 21 cases'),
    eyebrow: 'Permutation of the Last Layer',
    intro: L('Mặt trên đã vàng, giờ chỉ cần đổi chỗ các viên để hoàn thành. Mũi tên cho biết mỗi viên sẽ đi đâu.', 'The top is already yellow; now the pieces just need to swap places. Arrows show where each piece goes.'),
    cases: PLL,
    groups: PLL_GROUPS,
  },
  f2l: {
    title: L('F2L, 41 trường hợp', 'F2L, 41 cases'),
    eyebrow: 'First Two Layers',
    intro: L('Mỗi ca là một cặp góc và cạnh cần chèn vào slot trước bên phải. Viên xám không liên quan. Cố hiểu vì sao công thức chạy được, đừng chỉ học thuộc.', 'Each case is a corner and edge pair going into the front-right slot. Grey pieces do not matter. Try to see why each one works instead of just memorising it.'),
    cases: F2L,
    groups: F2L_GROUPS,
  },
}

export default function Library({ set }: { set: SetName }) {
  const meta = META[set]
  const { t } = useLang()
  const { learned } = useLearned()
  const [group, setGroup] = useState<string>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const list = useMemo(
    () =>
      meta.cases.filter(
        (c) =>
          (group === 'all' || (group === 'learned' ? learned[c.id] : group === 'todo' ? !learned[c.id] : c.group === group)) &&
          (!q || `${c.name} ${c.nick?.vi ?? ''} ${c.nick?.en ?? ''} ${c.alg}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [meta, group, q, learned],
  )
  const learnedCount = meta.cases.filter((c) => learned[c.id]).length
  const mask = set === 'oll' ? 'oll' : set === 'f2l' ? 'f2lcase' : undefined
  const cur = open !== null ? list[open] : null
  const close = useCallback(() => setOpen(null), [])
  const prev = useCallback(() => setOpen((o) => (o !== null && o > 0 ? o - 1 : o)), [])
  const next = useCallback(() => setOpen((o) => (o !== null && o < list.length - 1 ? o + 1 : o)), [list.length])

  return (
    <div className="page">
      <div className="container">
        <PageHead
          crumbs={[
            { to: '/learn', label: t(L('Học', 'Learn')) },
            { to: '/learn/cfop', label: 'CFOP' },
          ]}
          eyebrow={meta.eyebrow}
          title={t(meta.title)}
        >
          <p>{t(meta.intro)}</p>
          <div className="row">
            <div className="progress">
              <div style={{ width: `${(learnedCount / meta.cases.length) * 100}%` }} />
            </div>
            <span className="muted small">{t(L(`Đã thuộc ${learnedCount}/${meta.cases.length}`, `${learnedCount}/${meta.cases.length} learned`))}</span>
            <Button to={`/trainer?set=${set}`} size="sm" variant="secondary" icon={Target}>
              {t(L('Luyện bộ này', 'Drill this set'))}
            </Button>
          </div>
        </PageHead>

        <div className="toolbar">
          <div className="tabs">
            <Chip active={group === 'all'} count={meta.cases.length} onClick={() => setGroup('all')}>
              {t(L('Tất cả', 'All'))}
            </Chip>
            {Object.entries(meta.groups).map(([k, label]) => {
              const n = meta.cases.filter((c) => c.group === k).length
              if (!n) return null
              return (
                <Chip key={k} active={group === k} count={n} onClick={() => setGroup(k)}>
                  {t(label)}
                </Chip>
              )
            })}
            <Chip active={group === 'todo'} onClick={() => setGroup('todo')}>
              {t(L('Chưa thuộc', 'Not learned'))}
            </Chip>
            <Chip active={group === 'learned'} onClick={() => setGroup('learned')}>
              {t(L('Đã thuộc', 'Learned'))}
            </Chip>
          </div>
          <TextInput icon={<Search size={15} />} placeholder={t(L('Tìm tên hoặc công thức', 'Search name or moves'))} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="case-grid">
          {list.map((c, i) => {
            const st = caseState(c.alg)
            return (
              <button key={c.id} type="button" className="case-card" onClick={() => setOpen(i)}>
                {learned[c.id] && <Star className="learned" size={15} fill="currentColor" />}
                {set === 'f2l' ? <IsoCube className="diagram" state={st} mask={mask} /> : <LLDiagram className="diagram" state={st} mask={mask} arrows={set === 'pll'} />}
                <div className="name">{c.name}</div>
                {c.nick && <div className="nick">{t(c.nick)}</div>}
                <div className="alg">{c.alg}</div>
                <div className="meta">
                  {t(meta.groups[c.group])} · {t(L(`${algLength(c.alg)} nước`, `${algLength(c.alg)} moves`))}
                </div>
              </button>
            )
          })}
        </div>
        {!list.length && <p className="muted">{t(L('Không có ca nào khớp bộ lọc.', 'Nothing matches that filter.'))}</p>}
      </div>
      <CaseDrawer
        c={cur ? { id: cur.id, title: cur.name, subtitle: cur.nick ? t(cur.nick) : t(meta.groups[cur.group]), alg: cur.alg, alts: cur.alts, mask, trainerSet: set } : null}
        onClose={close}
        onPrev={open !== null && open > 0 ? prev : undefined}
        onNext={open !== null && open < list.length - 1 ? next : undefined}
      />
    </div>
  )
}
