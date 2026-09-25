import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CheckCircle2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { LoadingState } from '@/components/ui/Spinner'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export const SIDEBAR_STORAGE_KEY = 'layout.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    // Sem localStorage (modo privado, quota): o estado só não fica lembrado.
  }
}

/** Não intercepta o atalho enquanto se escreve num campo. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Menu em gaveta para ecrãs pequenos (< 768px): overlay, foco preso dentro da gaveta, fecha com
 * Escape, ao tocar fora ou ao escolher uma opção.
 */
function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-lg focus:outline-none md:hidden"
          aria-describedby={undefined}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Level-Soft
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <Sidebar variant="drawer" onNavigate={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // Mensagem de sucesso passada pela navegação (ex.: depois de alterar a palavra-passe).
  const flash = (location.state as { flash?: string } | null)?.flash
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      writeCollapsed(!current)
      return !current
    })
  }, [])

  // Ctrl+B (ou Cmd+B) mostra/oculta o menu lateral.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'b' &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleCollapsed])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <LoadingState label="A verificar sessão…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Palavra-passe provisória: nada na aplicação fica acessível até ser alterada.
  if (user?.must_change_password) {
    return (
      <Navigate
        to="/change-password"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <MobileNavDrawer open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenMenu={() => setMobileOpen(true)} menuOpen={mobileOpen} />
        <main className="relative min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {flash && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span className="flex-1">{flash}</span>
              <button
                type="button"
                aria-label="Fechar mensagem"
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
                }
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
