export interface User {
  id: number
  name: string
  email: string
  roles?: string[]
  /** Conta activa (`/api/me`); contas desactivadas não conseguem entrar. */
  is_active?: boolean
  /** Conta criada ou palavra-passe reposta por um admin: tem de definir uma nova antes de continuar. */
  must_change_password?: boolean
}

export interface ChangePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}
