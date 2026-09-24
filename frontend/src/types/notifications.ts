import type { PaginationMeta } from '@/api/pagination'

export type NotificationKind = 'task_assigned' | 'task_commented' | 'task_moved'

export interface NotificationActor {
  id: number
  name: string
}

export interface AppNotification {
  id: string
  kind: NotificationKind
  message: string
  task_id: number
  task_title: string
  project_id: number
  actor: NotificationActor
  read_at: string | null
  created_at: string
}

export interface NotificationsMeta extends PaginationMeta {
  unread_count: number
}

export interface NotificationsResponse {
  data: AppNotification[]
  meta: NotificationsMeta
}
