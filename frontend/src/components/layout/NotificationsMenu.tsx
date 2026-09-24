import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notifications'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/notifications'

/** Polling simples (Fase 1). Notificações em tempo real via WebSockets ficam para a Fase 2. */
export const NOTIFICATIONS_REFETCH_MS = 60_000
/** Quantas notificações mostrar no dropdown. */
const MAX_ITEMS = 10

const unreadKey = ['notifications', 'unread'] as const
const recentKey = ['notifications', 'recent'] as const

export function NotificationsMenu() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const unreadQuery = useQuery({
    queryKey: unreadKey,
    queryFn: () => listNotifications({ unread: true }),
    refetchInterval: NOTIFICATIONS_REFETCH_MS,
  })

  // A lista completa (lidas + não lidas) só é pedida quando o dropdown está aberto.
  const recentQuery = useQuery({
    queryKey: recentKey,
    queryFn: () => listNotifications(),
    enabled: open,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSettled: invalidate,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: invalidate,
  })

  const unreadCount = unreadQuery.data?.meta.unread_count ?? unreadQuery.data?.data.length ?? 0
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)
  const items = (recentQuery.data?.data ?? unreadQuery.data?.data ?? []).slice(0, MAX_ITEMS)

  function handleSelect(notification: AppNotification) {
    if (!notification.read_at) markReadMutation.mutate(notification.id)
    navigate(`/projects/${notification.project_id}`)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0 ? `Notificações (${unreadCount} por ler)` : 'Notificações (nenhuma por ler)'
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              data-testid="notifications-badge"
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
            >
              {badgeText}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-1.5 text-sm font-semibold">Notificações</div>
        <DropdownMenuItem
          disabled={unreadCount === 0 || markAllMutation.isPending}
          onSelect={(event) => {
            // Mantém o dropdown aberto para o utilizador ver a lista actualizada.
            event.preventDefault()
            markAllMutation.mutate()
          }}
          className="text-primary"
        >
          <CheckCheck className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Marcar todas como lidas
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {recentQuery.isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner /> A carregar…
          </div>
        ) : recentQuery.isError && items.length === 0 ? (
          <p className="p-4 text-center text-sm text-destructive">Não foi possível carregar as notificações.</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Sem notificações.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((notification) => {
              const unread = !notification.read_at
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => handleSelect(notification)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="flex w-full items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
                    />
                    <span className={cn('flex-1 text-sm', unread && 'font-medium')}>
                      {notification.message}
                      {unread && <span className="sr-only"> (por ler)</span>}
                    </span>
                  </span>
                  <span className="pl-4 text-xs text-muted-foreground">
                    {notification.task_title} · {formatDateTime(notification.created_at)}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
