import { KeyRound, LogOut, Menu, Moon, Search, Sun, User as UserIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Avatar, AvatarFallback, initials } from '@/components/ui/Avatar'
import { NotificationsMenu } from './NotificationsMenu'

export function Topbar({
  onOpenMenu,
  menuOpen = false,
}: {
  /** Abre o menu em gaveta (só em ecrãs pequenos). */
  onOpenMenu?: () => void
  menuOpen?: boolean
}) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { register, handleSubmit } = useForm<{ q: string }>({ defaultValues: { q: '' } })

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 sm:gap-3 sm:px-4">
      {onOpenMenu && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={onOpenMenu}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}
      <form
        role="search"
        className="relative min-w-0 max-w-sm flex-1"
        onSubmit={handleSubmit(({ q }) => {
          const term = q.trim()
          if (term) navigate(`/search?q=${encodeURIComponent(term)}`)
        })}
      >
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Pesquisar tarefas…"
          className="pl-8"
          aria-label="Pesquisar"
          {...register('q')}
        />
      </form>

      <div className="ml-auto hidden sm:block" />

      <NotificationsMenu />

      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 sm:inline-flex"
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo escuro'}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
            aria-label="Menu do utilizador"
          >
            <Avatar>
              <AvatarFallback>
                {user ? initials(user.name) : <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <span
              className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline"
              title={user?.name}
            >
              {user?.name}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[calc(100vw-1rem)]">
          {user && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <p className="truncate font-medium text-foreground" title={user.name}>
                {user.name}
              </p>
              <p className="truncate" title={user.email}>
                {user.email}
              </p>
            </div>
          )}
          {/* Em ecrãs pequenos o botão do tema fica aqui, para caber tudo na barra. */}
          <DropdownMenuItem className="sm:hidden" onSelect={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              navigate('/change-password', {
                state: { from: `${location.pathname}${location.search}` },
              })
            }
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Alterar palavra-passe
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Terminar sessão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
