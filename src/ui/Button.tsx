import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'inverse'
export type Size = 'sm' | 'md' | 'lg'

interface Common {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
  className?: string
  children?: ReactNode
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined }
type LinkProps = Common & { to: string; href?: undefined; onClick?: () => void; title?: string; 'aria-label'?: string }
type AnchorProps = Common & { href: string; to?: undefined; download?: string; onClick?: () => void; title?: string; target?: string; rel?: string }

const ICON = { sm: 15, md: 17, lg: 19 }

function cls({ variant = 'secondary', size = 'md', block, className, children, icon }: Common) {
  return ['btn', `btn-${variant}`, `btn-${size}`, block ? 'btn-block' : '', !children && icon ? 'btn-icon' : '', className ?? ''].filter(Boolean).join(' ')
}

function Inner({ icon: Icon, iconRight: IconR, size = 'md', children }: Common) {
  return (
    <>
      {Icon && <Icon size={ICON[size]} strokeWidth={2} aria-hidden />}
      {children !== undefined && children !== null && <span className="btn-label">{children}</span>}
      {IconR && <IconR size={ICON[size]} strokeWidth={2} aria-hidden />}
    </>
  )
}

/** One button for every situation: renders a <button>, a router <Link> (to) or an <a> (href). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps | LinkProps | AnchorProps>(function Button(props, ref) {
  const { variant, size, icon, iconRight, block, className, children, ...rest } = props as Common & Record<string, unknown>
  const c = cls({ variant, size, block, className, children, icon })
  const inner = <Inner icon={icon} iconRight={iconRight} size={size}>{children}</Inner>
  if (typeof rest.to === 'string') {
    const { to, ...r } = rest as { to: string }
    return (
      <Link to={to} className={c} {...r}>
        {inner}
      </Link>
    )
  }
  if (typeof rest.href === 'string') {
    return (
      <a className={c} {...(rest as object)}>
        {inner}
      </a>
    )
  }
  const btn = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button ref={ref} type={btn.type ?? 'button'} className={c} {...btn}>
      {inner}
    </button>
  )
})

/** Square icon-only button; label is required for accessibility and shown as a tooltip. */
export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className, ...rest }: { icon: LucideIcon; label: string; variant?: Variant; size?: Size } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn btn-${variant} btn-${size} btn-icon ${className ?? ''}`} aria-label={label} data-tip={label} {...rest}>
      <Icon size={ICON[size]} strokeWidth={2} aria-hidden />
    </button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Badge({ children, tone = 'green', icon: Icon }: { children: ReactNode; tone?: 'green' | 'gold' | 'neutral'; icon?: LucideIcon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {Icon && <Icon size={12} strokeWidth={2.4} aria-hidden />}
      {children}
    </span>
  )
}

export function Chip({ active, children, count, onClick, mono }: { active?: boolean; children: ReactNode; count?: number; onClick?: () => void; mono?: boolean }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''} ${mono ? 'mono' : ''}`} onClick={onClick} aria-pressed={active}>
      <span>{children}</span>
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  )
}
