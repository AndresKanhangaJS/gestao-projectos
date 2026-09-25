import { useEffect, useState } from 'react'

/** Devolve `value` só depois de `delay` ms sem alterações (ex.: pesquisa enquanto se escreve). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
