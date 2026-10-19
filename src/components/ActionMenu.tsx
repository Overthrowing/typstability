import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type Item = {
  label: string
  description?: string
  icon: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

type Props = {
  label: string
  icon?: ReactNode
  items: Item[]
  primary?: boolean
  compact?: boolean
  disabled?: boolean
  align?: 'left' | 'right'
}

export function ActionMenu({ label, icon, items, primary, compact, disabled, align = 'right' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const focusOutside = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('focusin', focusOutside)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('focusin', focusOutside)
    }
  }, [open])

  const close = () => { setOpen(false); trigger.current?.focus() }
  return <div className="action-menu" ref={root} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close() }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    const current = buttons.indexOf(globalThis.document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }}>
    <button ref={trigger} className={`menu-trigger ${primary ? 'is-primary' : ''} ${compact ? 'is-compact' : ''}`}
      aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      disabled={disabled} onClick={() => setOpen(!open)} onKeyDown={(event) => {
        if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setOpen(true) }
      }}>
      {icon}{!compact && <><span>{label}</span><ChevronDown size={14} /></>}
    </button>
    {open && <div className={`menu-panel align-${align}`} id={id} ref={menu} role="menu" aria-label={label}>
      {items.map((item) => <button key={item.label} role="menuitem" className={`menu-item ${item.danger ? 'is-danger' : ''}`}
        disabled={item.disabled} onClick={() => { item.onSelect(); setOpen(false) }}>
        {item.icon}<span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
      </button>)}
    </div>}
  </div>
}
