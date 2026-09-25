import { api } from './client'
import type { Paginated, PaginationMeta } from './pagination'
import type { AdminUser, AdminUserFilters, RoleDefinition } from '@/types/admin'

export type AdminUsersPage = Paginated<AdminUser, PaginationMeta>

/** Lista paginada (20 por página) com pesquisa por nome/email e filtros por papel e estado. */
export async function listAdminUsers(filters: AdminUserFilters = {}): Promise<AdminUsersPage> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v != null && v !== ''),
  )
  const { data } = await api.get<AdminUsersPage>('/admin/users', { params })
  return data
}

/** Papéis globais que se podem atribuir, com rótulo e descrição em português. */
export async function listRoles(): Promise<RoleDefinition[]> {
  const { data } = await api.get<RoleDefinition[] | { data: RoleDefinition[] }>('/admin/roles')
  return Array.isArray(data) ? data : data.data
}

export interface CreateAdminUserPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  roles: string[]
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
  const { data } = await api.post<{ data: AdminUser }>('/admin/users', payload)
  return data.data
}

export interface UpdateAdminUserPayload {
  name?: string
  email?: string
  roles?: string[]
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload,
): Promise<AdminUser> {
  const { data } = await api.patch<{ data: AdminUser }>(`/admin/users/${id}`, payload)
  return data.data
}

export async function resetAdminUserPassword(
  id: number,
  payload: { password: string; password_confirmation: string },
): Promise<void> {
  await api.post(`/admin/users/${id}/password`, payload)
}

export async function deactivateAdminUser(id: number): Promise<AdminUser> {
  const { data } = await api.post<{ data: AdminUser }>(`/admin/users/${id}/deactivate`)
  return data.data
}

export async function activateAdminUser(id: number): Promise<AdminUser> {
  const { data } = await api.post<{ data: AdminUser }>(`/admin/users/${id}/activate`)
  return data.data
}
