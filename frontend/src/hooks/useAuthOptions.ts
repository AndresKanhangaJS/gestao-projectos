import { useQuery } from '@tanstack/react-query'
import { getAuthOptions } from '@/api/auth'

export const authOptionsQueryKey = ['auth', 'options'] as const

/** Opções públicas de autenticação (ex.: registo aberto). Mudam só com a configuração do servidor. */
export function useAuthOptions() {
  return useQuery({
    queryKey: authOptionsQueryKey,
    queryFn: getAuthOptions,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
