import { useCallback, useState } from 'react'
import { CaseDrawer, PageHead } from '../components/Shared'
import { IsoCube } from '../cube/Diagrams'
import { stateFromAlg } from '../cube/engine'
import { PATTERNS } from '../data/patterns'
import { useLang, L } from '../i18n'

export default function Patterns() {
  const { t } = useLang()
  const [open, setOpen] = useState<(typeof PATTERNS)[number] | null>(null)
  const close = useCallback(() => setOpen(null), [])
  return (
    <div className="page">
      <div className="container">
        <PageHead crumbs={[{ to: '/learn', label: t(L('Học', 'Learn')) }]} eyebrow={t(L('Cho vui', 'Just for fun'))} title={t(L('Hoạ tiết Rubik', 'Cube patterns'))}>
          <p>{t(L('Làm theo từ một khối đã giải để tạo hoạ tiết. Mẹo nhỏ để khoe với bạn bè.', 'Start from a solved cube and follow the moves. A nice party trick.'))}</p>
        </PageHead>
        <div className="case-grid patterns-grid">
          {PATTERNS.map((p) => (
            <button key={p.id} type="button" className="case-card" onClick={() => setOpen(p)}>
              <IsoCube className="diagram" state={stateFromAlg(3, p.alg)} scheme="standard" />
              <div className="name">{t(p.name)}</div>
              <div className="text-2 small">{t(p.desc)}</div>
              <div className="alg">{p.alg}</div>
            </button>
          ))}
        </div>
      </div>
      <CaseDrawer c={open ? { id: `pat-${open.id}`, title: t(open.name), alg: open.alg, setup: '', scheme: 'standard', desc: t(open.desc) } : null} onClose={close} />
    </div>
  )
}
