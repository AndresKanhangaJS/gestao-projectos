import { Moon, Sun, Search, LogOut, User as UserIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
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

export function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm<{ q: string }>({ defaultValues: { q: '' } })

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <form
        role="search"
        className="relative flex-1 max-w-sm"
        onSubmit={handleSubmit(({ q }) => {
          const term = q.trim()
          if (term) navigate(`/search?q=${encodeURIComponent(term)}`)
        })}
      >
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input placeholder="Pesquisar tarefas…" className="pl-8" aria-label="Pesquisar" {...register('q')} />
      </form>

      <div className="ml-auto" />

      <NotificationsMenu />

      <Button
        variant="ghost"
        size="icon"
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo escuro'}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu do utilizador"
          >
            <Avatar>
              <AvatarFallback>{user ? initials(user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Terminar sessão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
