import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  /** Texto secundário mostrado por baixo (ex.: IP da máquina); também entra na pesquisa. */
  description?: string
}

/** Minúsculas e sem acentos, para "maquina" encontrar "Máquina". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Selecção pesquisável para listas longas (máquinas, clientes, produtos, deployments…).
 *
 * Segue o padrão ARIA "combobox com listbox": clicar ou escrever abre e filtra; as setas abrem
 * a lista e movem a opção activa; Enter escolhe; Escape fecha (sem fechar o diálogo onde está);
 * Tab sai. A lista abre por baixo
 * do campo, com altura máxima e scroll (roda do rato, toque ou teclado). É desenhada dentro do
 * próprio formulário (sem portal), para funcionar dentro de diálogos modais.
 *
 * O valor é sempre uma string; `''` = nada escolhido (ou a opção `emptyLabel`, se indicada).
 */
export function Combobox({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Pesquise ou escolha…',
  emptyLabel,
  noResultsText = 'Sem resultados.',
  disabled,
  invalid,
  'aria-describedby': describedBy,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: ComboboxOption[]
  placeholder?: string
  /** Se indicado, acrescenta no topo uma opção para "nenhum" (valor `''`). */
  emptyLabel?: string
  noResultsText?: string
  disabled?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  className?: string
}) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const allOptions = useMemo<ComboboxOption[]>(
    () => (emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options),
    [emptyLabel, options],
  )
  const selected = allOptions.find((o) => o.value === value) ?? null
  const filtered = useMemo(() => {
    const term = normalise(query.trim())
    if (!term) return allOptions
    return allOptions.filter((o) => normalise(`${o.label} ${o.description ?? ''}`).includes(term))
  }, [allOptions, query])

  function openList() {
    if (disabled) return
    const index = filtered.findIndex((o) => o.value === value)
    setActiveIndex(index >= 0 ? index : 0)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setQuery('')
  }

  function choose(option: ComboboxOption) {
    onChange(option.value)
    close()
  }

  // Escape fecha só a lista: captura em `window`, antes do listener do diálogo (Radix) no `document`.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  // Mantém a opção activa visível ao navegar com as setas.
  useEffect(() => {
    if (!open) return
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    item?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, open])

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openList()
        return
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) =>
        Math.min(Math.max(index + delta, 0), Math.max(filtered.length - 1, 0)),
      )
    } else if (event.key === 'Home' && open) {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End' && open) {
      event.preventDefault()
      setActiveIndex(Math.max(filtered.length - 1, 0))
    } else if (event.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        event.preventDefault()
        choose(filtered[activeIndex])
      }
    }
  }

  const activeOption = open ? filtered[activeIndex] : undefined
  const optionId = (index: number) => `${listboxId}-option-${index}`

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          if (!open) setOpen(true)
        }}
        onClick={() => !open && openList()}
        onBlur={() => {
          close()
          onBlur?.()
        }}
        onKeyDown={onKeyDown}
        className="flex h-9 w-full rounded-md border border-border bg-card py-1 pl-3 pr-8 text-sm text-card-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Fechar lista de opções' : 'Mostrar opções'}
        disabled={disabled}
        // Mantém o foco no campo (senão o blur fecharia a lista).
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) close()
          else {
            inputRef.current?.focus()
            openList()
          }
        }}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground disabled:opacity-50"
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Opções"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 text-card-foreground shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">{noResultsText}</li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value === '' ? '__empty__' : option.value}
                  id={optionId(index)}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'relative flex cursor-pointer select-none flex-col rounded-sm py-1.5 pl-8 pr-2 text-sm',
                    index === activeIndex && 'bg-muted',
                    option.value === '' && 'text-muted-foreground',
                  )}
                >
                  {isSelected && (
                    <Check className="absolute left-2 top-2 h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
