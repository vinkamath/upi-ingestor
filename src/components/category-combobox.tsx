'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MonarchCategoryOption } from '@/lib/monarch-categories'

type CategoryComboboxProps = {
  value: string
  onChange: (value: string) => void
  pinned: MonarchCategoryOption[]
  rest: MonarchCategoryOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

function filterByQuery(items: MonarchCategoryOption[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((c) => c.name.toLowerCase().includes(q))
}

export function CategoryCombobox({
  value,
  onChange,
  pinned,
  rest,
  placeholder = 'Select category',
  disabled = false,
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const filtered = useMemo(
    () => ({
      pinned: filterByQuery(pinned, value),
      rest: filterByQuery(rest, value),
    }),
    [pinned, rest, value]
  )

  const totalMatches = filtered.pinned.length + filtered.rest.length

  const updatePanelPosition = () => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
      zIndex: 50,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePanelPosition()
    const onLayout = () => updatePanelPosition()
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      const panel = document.getElementById(listId)
      if (rootRef.current?.contains(target) || panel?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, listId])

  function selectCategory(name: string) {
    onChange(name)
    setOpen(false)
    inputRef.current?.blur()
  }

  const listbox =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={listId}
            role="listbox"
            className="max-h-[220px] overflow-y-auto rounded-lg border border-border bg-background shadow-md"
            style={panelStyle}
          >
            {totalMatches === 0 ? (
              <p className="px-3 py-3 text-center text-[12px] text-muted-foreground">
                No matching categories
              </p>
            ) : (
              <>
                {filtered.pinned.length > 0 && (
                  <>
                    <div className="sticky top-0 border-b border-border/60 bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Quick categories
                    </div>
                    {filtered.pinned.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={value === c.name}
                        className={cn(
                          'flex w-full px-2.5 py-1.5 text-left text-[12px] text-foreground hover:bg-primary/10',
                          value === c.name && 'bg-primary/10'
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCategory(c.name)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </>
                )}
                {filtered.rest.length > 0 && (
                  <>
                    <div className="sticky top-0 border-b border-border/60 bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {filtered.pinned.length > 0 ? 'All categories' : 'Categories'}
                    </div>
                    {filtered.rest.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={value === c.name}
                        className={cn(
                          'flex w-full px-2.5 py-1.5 text-left text-[12px] text-foreground hover:bg-primary/10',
                          value === c.name && 'bg-primary/10'
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCategory(c.name)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>,
          document.body
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          className={cn(
            'h-7 w-full rounded-lg border border-border bg-background pr-7 pl-2 text-[12px] text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
      {listbox}
    </div>
  )
}
