import { useCallback, useState } from 'react'
import { ArrowRight, Box, Skull } from 'lucide-react'
import { CaseDrawer, PageHead } from '../components/Shared'
import { ICEBERG, TIERS, type IcebergItem } from '../data/iceberg'
import { useLang, L } from '../i18n'
import { Badge, Button } from '../ui/Button'
import { Drawer } from '../ui/Overlay'

export default function Iceberg() {
  const { t } = useLang()
  const [open, setOpen] = useState<IcebergItem | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const desc = (item: IcebergItem) => (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>{t(item.desc)}</p>
      <Badge tone="neutral">{t(TIERS[item.tier].name)}</Badge>
      {item.link && (
        <div style={{ marginTop: '1rem' }}>
          <Button to={item.link} size="sm" variant="primary" iconRight={ArrowRight}>
            {t(L('Đọc kỹ hơn', 'Read more'))}
          </Button>
        </div>
      )}
    </div>
  )
  return (
    <div className="page ice-page">
      <div className="container">
        <PageHead crumbs={[{ to: '/learn', label: t(L('Học', 'Learn')) }]} eyebrow={t(L('Tảng băng Rubik', 'The cubing iceberg'))} title={t(L('Bạn lặn được tới đâu?', 'How deep can you go?'))}>
          <p>{t(L('Phần nổi là bốn bước CFOP ai cũng biết. Càng xuống sâu, kỹ thuật càng hiếm và càng dành cho người muốn phá kỷ lục. Bấm vào từng mục để đọc giải thích.', 'The tip is the four CFOP steps everybody knows. The deeper you go, the rarer the technique and the closer you get to record territory. Click anything to read about it.'))}</p>
        </PageHead>
      </div>
      <div className="iceberg">
        <div className="ice-sky" />
        {TIERS.map((tier, ti) => (
          <section key={ti} className={`ice-layer ice-l${ti}`}>
            <div className="container">
              <div className="ice-label">
                <strong>{t(tier.name)}</strong>
                <span>{t(tier.hint)}</span>
              </div>
              <div className={`ice-items ${ti === 0 ? 'tip' : ''}`}>
                {ICEBERG.filter((x) => x.tier === ti).map((x, i) => (
                  <button key={x.id} type="button" className="ice-item" style={{ animationDelay: `${i * 60}ms` }} onClick={() => setOpen(x)}>
                    {x.name}
                    {x.alg && <Box size={13} className="ice-3d" aria-label="3D" />}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ))}
        <div className="ice-skulls">
          <Skull size={26} />
          <Skull size={26} />
          <Skull size={26} />
        </div>
      </div>
      <CaseDrawer c={open && open.alg ? { id: `ice-${open.id}`, title: t(open.title), subtitle: open.name, alg: open.alg, pre: open.pre, mask: open.mask, desc: desc(open) } : null} onClose={close} />
      <Drawer open={!!open && !open.alg} onClose={close} eyebrow={open?.name} title={open ? t(open.title) : ''}>
        {open && desc(open)}
      </Drawer>
    </div>
  )
}
