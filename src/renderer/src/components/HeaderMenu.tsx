import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { t } from '@shared/i18n'
import { Icon } from './icons'

/** One line of the header's menu: a step, or a way into more lines (Mute's durations, Move to Project's projects). */
export interface HeaderMenuItem {
  key: string
  label: string
  title?: string
  danger?: boolean
  onClick?: () => void
  /** The lines this one opens, shown in the menu's place; read when it's picked. */
  items?: () => HeaderMenuItem[] | Promise<HeaderMenuItem[]>
  /** What to say while `items` is read, and when it has none. */
  loading?: string
  empty?: string
}

interface Open {
  /** Where it opens: its right edge under the button, or its left at a right-click. */
  x: number
  y: number
  fromRight?: boolean
  /** Opens upward, its bottom edge at `y`: from a control at the window's foot (the composer's Project chip). */
  above?: boolean
  /** The line whose lines are shown, with them once read. */
  inside?: { item: HeaderMenuItem; items: HeaderMenuItem[] | null }
}

/**
 * The open chat's own menu (issue 448): the steps its row in the chat list
 * offers, reached from the chat itself, so a hidden list or a chat in a
 * window of its own still has them. `useHeaderMenu` holds where it's open;
 * the header draws the button and the menu.
 */
export function useHeaderMenu() {
  const [open, setOpen] = useState<Open | null>(null)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [open !== null])
  return { open, setOpen }
}

export function HeaderMenuButton({ menu }: { menu: ReturnType<typeof useHeaderMenu> }) {
  return (
    <button
      className={`chat-head-toggle${menu.open ? ' on' : ''}`}
      aria-label={t('More')}
      aria-haspopup="menu"
      aria-expanded={!!menu.open}
      title={t('More')}
      onClick={e => {
        // The window's click closes the menu; this one opens it.
        e.stopPropagation()
        const box = e.currentTarget.getBoundingClientRect()
        menu.setOpen(current => (current ? null : { x: box.right, y: box.bottom + 6, fromRight: true }))
      }}
    >
      <Icon name="more" />
    </button>
  )
}

export interface HeaderMenuSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Shown when the filter leaves no lines. */
  empty?: string
}

export function HeaderMenu({ menu, items, title, search }: { menu: ReturnType<typeof useHeaderMenu>; items: HeaderMenuItem[]; title?: string; search?: HeaderMenuSearch }) {
  const { open, setOpen } = menu
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const [at, setAt] = useState<{ left: number; top: number } | null>(null)
  useEffect(() => {
    if (open && !open.inside) field.current?.focus()
  }, [open !== null, open?.inside])
  // Kept inside the window by its measured size, which changes as it shows another line's lines.
  useLayoutEffect(() => {
    if (!open) return setAt(null)
    const fit = () => {
      if (!box.current) return setAt(null)
      const { width, height } = box.current.getBoundingClientRect()
      setAt({
        left: Math.max(8, Math.min(open.fromRight ? open.x - width : open.x, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(open.above ? open.y - height : open.y, window.innerHeight - height - 8))
      })
    }
    fit()
    // A window made smaller while it's open keeps it inside.
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open])
  if (!open) return null
  const inside = open.inside
  const pick = (item: HeaderMenuItem, e: React.MouseEvent) => {
    if (!item.items) return item.onClick?.()
    e.stopPropagation()
    // This reading's own place: an answer that comes after the menu closed or went back fills nothing.
    const reading = { item, items: null }
    setOpen(current => (current ? { ...current, inside: reading } : current))
    void Promise.resolve()
      .then(item.items)
      .catch(() => [] as HeaderMenuItem[])
      .then(items => setOpen(current => (current?.inside === reading ? { ...current, inside: { item, items } } : current)))
  }
  const line = (item: HeaderMenuItem) => (
    <button key={item.key} role="menuitem" className={item.danger ? 'danger' : undefined} title={item.title} aria-haspopup={item.items ? 'menu' : undefined} onClick={e => pick(item, e)}>
      {item.items ? `${item.label} ›` : item.label}
    </button>
  )
  return (
    <div
      ref={box}
      className="host-menu row-menu header-menu"
      role="menu"
      style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      {inside ? (
        <>
          <button
            role="menuitem"
            onClick={e => {
              e.stopPropagation()
              setOpen(current => (current ? { ...current, inside: undefined } : current))
            }}
          >
            ‹ {inside.item.label}
          </button>
          {inside.items === null && inside.item.loading ? <div className="menu-note">{inside.item.loading}</div> : null}
          {inside.items && !inside.items.length && inside.item.empty ? <div className="menu-note">{inside.item.empty}</div> : null}
          {inside.items?.map(line)}
        </>
      ) : (
        <>
          {title ? <div className="menu-title">{title}</div> : null}
          {search ? (
            <div className="menu-search" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <Icon name="search" />
              <input
                ref={field}
                aria-label={search.placeholder ?? t('Search')}
                value={search.value}
                placeholder={search.placeholder ?? t('Search')}
                onChange={e => search.onChange(e.target.value)}
              />
            </div>
          ) : null}
          {items.map(line)}
          {!items.length && search?.value && search.empty ? <div className="menu-note">{search.empty}</div> : null}
        </>
      )}
    </div>
  )
}
