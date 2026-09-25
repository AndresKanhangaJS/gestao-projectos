import { api, ensureCsrfCookie } from './client'
import type { ChangePasswordPayload, LoginPayload, RegisterPayload, User } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<User> {
  await ensureCsrfCookie()
  await api.post('/login', payload)
  return me()
}

export async function register(payload: RegisterPayload): Promise<User> {
  await ensureCsrfCookie()
  await api.post('/register', payload)
  return me()
}

export async function logout(): Promise<void> {
  await api.post('/logout')
}

/** Altera a palavra-passe do próprio utilizador; devolve o utilizador actualizado (formato `/me`). */
export async function changePassword(payload: ChangePasswordPayload): Promise<User> {
  const { data } = await api.put<User>('/me/password', payload)
  return data
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>('/me')
  return data
}
