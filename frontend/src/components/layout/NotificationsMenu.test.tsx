import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppNotification, NotificationsResponse } from '@/types/notifications'

const listNotificationsMock = vi.fn()
const markNotificationReadMock = vi.fn()
const markAllNotificationsReadMock = vi.fn()

vi.mock('@/api/notifications', () => ({
  listNotifications: (...args: unknown[]) => listNotificationsMock(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
}))

import { NotificationsMenu, NOTIFICATIONS_REFETCH_MS } from './NotificationsMenu'

const notification: AppNotification = {
  id: '9b1c-uuid',
  kind: 'task_assigned',
  message: 'Ana atribuiu-lhe a tarefa "Migrar servidor"',
  task_id: 11,
  task_title: 'Migrar servidor',
  project_id: 5,
  actor: { id: 2, name: 'Ana' },
  read_at: null,
  created_at: '2026-09-20T10:00:00Z',
}

function response(unreadCount: number, data: AppNotification[] = []): NotificationsResponse {
  return {
    data,
    meta: {
      unread_count: unreadCount,
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: data.length,
      from: 1,
      to: data.length,
    },
  }
}

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NotificationsMenu />} />
          <Route path="/projects/:projectId" element={<p>Página do projecto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NotificationsMenu', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('mostra o badge com o número de notificações por ler', async () => {
    listNotificationsMock.mockResolvedValue(response(3, [notification]))
    renderMenu()

    expect(await screen.findByTestId('notifications-badge')).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: 'Notificações (3 por ler)' })).toBeInTheDocument()
    expect(listNotificationsMock).toHaveBeenCalledWith({ unread: true })
  })

  it('não mostra badge quando não há notificações por ler', async () => {
    listNotificationsMock.mockResolvedValue(response(0))
    renderMenu()

    expect(await screen.findByRole('button', { name: /nenhuma por ler/i })).toBeInTheDocument()
    expect(screen.queryByTestId('notifications-badge')).not.toBeInTheDocument()
  })

  it('limita o texto do badge a 99+', async () => {
    listNotificationsMock.mockResolvedValue(response(150))
    renderMenu()

    expect(await screen.findByTestId('notifications-badge')).toHaveTextContent('99+')
  })

  it('actualiza o badge por polling', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    listNotificationsMock.mockResolvedValueOnce(response(1, [notification])).mockResolvedValue(response(4))
    renderMenu()

    expect(await screen.findByTestId('notifications-badge')).toHaveTextContent('1')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTIFICATIONS_REFETCH_MS)
    })
    await waitFor(() => expect(screen.getByTestId('notifications-badge')).toHaveTextContent('4'))
  })

  it('marca como lida e navega para o projecto ao clicar numa notificação', async () => {
    listNotificationsMock.mockResolvedValue(response(1, [notification]))
    markNotificationReadMock.mockResolvedValue({ ...notification, read_at: '2026-09-21T10:00:00Z' })
    const user = userEvent.setup()
    renderMenu()

    await user.click(await screen.findByRole('button', { name: /notificações \(1 por ler\)/i }))
    await user.click(await screen.findByRole('menuitem', { name: /migrar servidor/i }))

    await waitFor(() => expect(markNotificationReadMock).toHaveBeenCalledWith('9b1c-uuid'))
    expect(await screen.findByText('Página do projecto')).toBeInTheDocument()
  })

  it('marca todas como lidas', async () => {
    listNotificationsMock.mockResolvedValue(response(1, [notification]))
    markAllNotificationsReadMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderMenu()

    await user.click(await screen.findByRole('button', { name: /notificações \(1 por ler\)/i }))
    await user.click(await screen.findByRole('menuitem', { name: /marcar todas como lidas/i }))

    await waitFor(() => expect(markAllNotificationsReadMock).toHaveBeenCalledTimes(1))
  })
})
