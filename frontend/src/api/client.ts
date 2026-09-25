import axios from 'axios'
import { saveSessionNotice } from '@/lib/sessionNotice'

export const PASSWORD_CHANGE_REQUIRED = 'password_change_required'
export const CHANGE_PASSWORD_PATH = '/change-password'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
  },
})

export async function ensureCsrfCookie(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', { baseURL: '/', withCredentials: true })
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Palavra-passe provisória: a API recusa tudo (403) até ser alterada. Não redirecciona se já
    // estiver na página de alteração (evita ciclos).
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === PASSWORD_CHANGE_REQUIRED &&
      !window.location.pathname.startsWith(CHANGE_PASSWORD_PATH)
    ) {
      window.location.assign(CHANGE_PASSWORD_PATH)
    }
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      // Sessão terminada pela API (ex.: conta desactivada): a mensagem aparece no ecrã de entrada.
      // O redireccionamento recarrega a aplicação, o que limpa o estado local (utilizador e cache).
      saveSessionNotice(error.response?.data?.message)
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)
