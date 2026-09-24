import { api } from './client'
import type { AppNotification, NotificationsResponse } from '@/types/notifications'

export async function listNotifications(options: { unread?: boolean } = {}): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>('/notifications', {
    params: options.unread ? { unread: 1 } : undefined,
  })
  return data
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await api.post<AppNotification | { data: AppNotification }>(
    `/notifications/${encodeURIComponent(id)}/read`,
  )
  // Aceita tanto a notificação "crua" como embrulhada num API Resource (`{ data: ... }`).
  return 'data' in data ? data.data : data
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all')
}
