import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const GAP = 8
const MARGIN = 8

/**
 * Dica curta ao passar o rato ou ao dar foco (teclado) ao elemento envolvido: por exemplo, o nome
 * de cada opção do menu lateral quando está colapsado. Não é interactiva e fica num portal com
 * posição fixa, sempre dentro do ecrã. É só visual: o elemento envolvido tem de ter o seu próprio
 * nome acessível (ex.: `aria-label`).
 *
 * Para explicações mais longas, acessíveis também por toque, usar `InfoTooltip`.
 */
export function Tooltip({
  content,
  side = 'right',
  disabled = false,
  children,
  className,
}: {
  content: ReactNode
  side?: 'right' | 'bottom'
  /** Desliga a dica sem mudar a estrutura (ex.: menu expandido, onde o nome já é visível). */
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  function show() {
    if (disabled) return
    // O invólucro usa `display: contents` (não tem caixa): mede-se o elemento envolvido.
    const rect = wrapperRef.current?.firstElementChild?.getBoundingClientRect()
    if (!rect) return
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    if (side === 'right') {
      setPosition({
        top: rect.top + rect.height / 2,
        left: Math.min(rect.right + GAP, viewportWidth - MARGIN),
      })
    } else {
      setPosition({ top: rect.bottom + GAP, left: Math.max(rect.left, MARGIN) })
    }
  }

  const hide = () => setPosition(null)
  const open = !disabled && position != null

  return (
    <span
      ref={wrapperRef}
      className={cn('contents', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => event.key === 'Escape' && hide()}
    >
      {children}
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform: side === 'right' ? 'translateY(-50%)' : undefined,
              maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
            }}
            className="pointer-events-none z-[60] whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-card-foreground shadow-md"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  )
}
