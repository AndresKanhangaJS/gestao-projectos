import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOLTIP_WIDTH = 288 // 18rem
const VIEWPORT_MARGIN = 8

interface Position {
  top: number
  left: number
}

/**
 * Ícone de ajuda "?" com uma explicação curta.
 *
 * Acessível por rato (passar por cima), teclado (foco; Escape fecha) e toque (tocar abre/fecha).
 * O texto é ligado ao botão por `aria-describedby` enquanto está visível e fica num portal com
 * posição fixa, para não ser cortado por contentores com scroll (diálogos, colunas do Kanban).
 *
 * Nunca colocar dentro de outro botão ou de um `<label>`: usar ao lado (ex.: prop `help` do FormField).
 */
export function InfoTooltip({
  label,
  text,
  icon = 'help',
  className,
}: {
  /** Tema da ajuda; o botão fica com o nome acessível "Ajuda: <label>". */
  label: string
  text: ReactNode
  /** `lock` para explicar porque uma acção está indisponível (falta de permissão). */
  icon?: 'help' | 'lock'
  className?: string
}) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const open = hovered || focused || pinned

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const width = Math.min(TOOLTIP_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2)
    const centre = rect.left + rect.width / 2
    const left = Math.min(
      Math.max(centre - width / 2, VIEWPORT_MARGIN),
      viewportWidth - width - VIEWPORT_MARGIN,
    )
    setPosition({ top: rect.bottom + 6, left })
  }, [])

  const close = useCallback(() => {
    setHovered(false)
    setFocused(false)
    setPinned(false)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Captura em `window` (antes do `document`): o Escape fecha só o tooltip, não o diálogo.
        event.stopPropagation()
        close()
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (
        triggerRef.current &&
        event.target instanceof Node &&
        triggerRef.current.contains(event.target)
      )
        return
      setPinned(false)
    }
    function onViewportChange() {
      updatePosition()
    }
    window.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [open, close, updatePosition])

  const Icon = icon === 'lock' ? Lock : CircleHelp

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={icon === 'lock' ? `Porque não está disponível: ${label}` : `Ajuda: ${label}`}
        aria-describedby={open ? tooltipId : undefined}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        onMouseEnter={() => {
          updatePosition()
          setHovered(true)
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          updatePosition()
          setFocused(true)
        }}
        onBlur={() => {
          setFocused(false)
          setPinned(false)
        }}
        onClick={(event) => {
          // Não activa cartões/linhas clicáveis onde o ícone esteja inserido.
          event.stopPropagation()
          event.preventDefault()
          if (pinned) {
            close()
          } else {
            updatePosition()
            setPinned(true)
          }
        }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              maxWidth: `min(${TOOLTIP_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
            }}
            className="pointer-events-none z-[60] rounded-md border border-border bg-card px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-card-foreground shadow-lg"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}
