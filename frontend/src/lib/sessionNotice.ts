/**
 * Mensagem a mostrar no ecrã de entrada depois de a sessão terminar por iniciativa da API
 * (ex.: 401 "A sua conta está desactivada. Contacte um administrador."). Guardada em
 * sessionStorage porque o redireccionamento recarrega a página.
 */
const KEY = 'auth.sessionNotice'

/** Mensagem genérica do Laravel para pedidos sem sessão: não vale a pena mostrá-la. */
const GENERIC_401 = 'Unauthenticated.'

export function saveSessionNotice(message: unknown): void {
  if (typeof message !== 'string' || message === '' || message === GENERIC_401) return
  try {
    window.sessionStorage.setItem(KEY, message)
  } catch {
    // Sem sessionStorage: o utilizador vê só o ecrã de entrada.
  }
}

export function readSessionNotice(): string | null {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearSessionNotice(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Ignorar.
  }
}
