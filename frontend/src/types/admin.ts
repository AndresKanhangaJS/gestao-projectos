/** Utilizador na gestão de utilizadores (`AdminUserResource`, só admin). */
export interface AdminUser {
  id: number
  name: string
  email: string
  /** Papéis globais (spatie/laravel-permission), ex.: `admin`, `infra`. */
  roles: string[]
  is_active: boolean
  last_login_at: string | null
  created_at: string
  workspaces_count: number
  /** Tem de definir uma nova palavra-passe no próximo login (conta nova ou reposta por um admin). */
  must_change_password?: boolean
}

/** Papel global atribuível (`GET /admin/roles`). */
export interface RoleDefinition {
  name: string
  label_pt: string
  description_pt: string
}

export type AdminUserStatus = 'active' | 'inactive'

export interface AdminUserFilters {
  search?: string
  role?: string
  status?: AdminUserStatus
  page?: number
}
