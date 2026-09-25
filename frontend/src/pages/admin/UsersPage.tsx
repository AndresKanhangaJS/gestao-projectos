import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { activateAdminUser, deactivateAdminUser, listAdminUsers, listRoles } from '@/api/adminUsers'
import { adminRolesKey, adminUsersKey } from '@/components/admin/queryKeys'
import { ResetPasswordDialog, UserFormDialog } from '@/components/admin/UserDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/context/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { mutationErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { HELP } from '@/lib/help'
import type { AdminUser, AdminUserStatus, RoleDefinition } from '@/types/admin'

const ALL = 'all'

type Dialogs =
  | { kind: 'form'; user: AdminUser | null }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'toggle'; user: AdminUser }
  | null

function RoleBadges({ roles, definitions }: { roles: string[]; definitions: RoleDefinition[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((name) => {
        const role = definitions.find((r) => r.name === name)
        const label = role?.label_pt ?? name
        return (
          <Tooltip key={name} content={role?.description_pt ?? label} side="bottom">
            <Badge
              variant={name === 'admin' ? 'default' : 'secondary'}
              tabIndex={0}
              aria-label={role ? `${label}: ${role.description_pt}` : label}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </Badge>
          </Tooltip>
        )
      })}
    </span>
  )
}

function StatusBadge({ user }: { user: AdminUser }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant={user.is_active ? 'success' : 'outline'}>
        {user.is_active ? 'Activo' : 'Inactivo'}
      </Badge>
      {user.must_change_password && (
        <Badge variant="warning" title="No próximo login terá de definir uma nova palavra-passe.">
          Tem de alterar a palavra-passe
        </Badge>
      )}
    </span>
  )
}

/**
 * Gestão de utilizadores (só admin): contas, papéis globais e estado. O próprio administrador
 * não vê as acções que o deixariam sem acesso (desactivar-se); a API aplica as mesmas regras.
 */
export default function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialog, setDialog] = useState<Dialogs>(null)

  const role = searchParams.get('role') ?? ''
  const statusParam = searchParams.get('status')
  const status: AdminUserStatus | '' =
    statusParam === 'active' || statusParam === 'inactive' ? statusParam : ''
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const term = useDebouncedValue(search.trim(), 300)

  function setParam(name: string, value: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (value) params.set(name, value)
        else params.delete(name)
        if (name !== 'page') params.delete('page')
        return params
      },
      { replace: true },
    )
  }

  const filters = {
    search: term || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
  }
  const usersQuery = useQuery({
    queryKey: [...adminUsersKey, filters],
    queryFn: () => listAdminUsers(filters),
    placeholderData: keepPreviousData,
  })
  const rolesQuery = useQuery({ queryKey: adminRolesKey, queryFn: listRoles })
  const roles = rolesQuery.data ?? []

  const toggleMutation = useMutation({
    mutationFn: (user: AdminUser) =>
      user.is_active ? deactivateAdminUser(user.id) : activateAdminUser(user.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersKey })
      setDialog(null)
    },
  })

  const users = usersQuery.data?.data ?? []
  const meta = usersQuery.data?.meta
  const lastPage = meta?.last_page ?? 1

  function actions(user: AdminUser) {
    const isSelf = user.id === me?.id
    return (
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${user.name}`}
          title="Editar"
          onClick={() => setDialog({ kind: 'form', user })}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Repor palavra-passe de ${user.name}`}
          title="Repor palavra-passe"
          onClick={() => setDialog({ kind: 'password', user })}
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </Button>
        {/* O próprio administrador não se pode desactivar. */}
        {!isSelf && (
          <Button
            variant="ghost"
            size="icon"
            className={user.is_active ? 'text-destructive' : undefined}
            aria-label={user.is_active ? `Desactivar ${user.name}` : `Activar ${user.name}`}
            title={user.is_active ? 'Desactivar' : 'Activar'}
            onClick={() => {
              toggleMutation.reset()
              setDialog({ kind: 'toggle', user })
            }}
          >
            {user.is_active ? (
              <PowerOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Power className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    )
  }

  const lastLogin = (user: AdminUser) =>
    user.last_login_at ? formatDateTime(user.last_login_at) : 'Nunca entrou'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold">Utilizadores</h1>
          <InfoTooltip {...HELP.globalRoles} />
        </div>
        <Button
          onClick={() => setDialog({ kind: 'form', user: null })}
          disabled={rolesQuery.isLoading}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo utilizador
        </Button>
      </div>

      <div
        role="search"
        aria-label="Filtrar utilizadores"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex w-full flex-col gap-1.5 sm:w-64">
          <Label htmlFor="users-search">Pesquisar</Label>
          <Input
            id="users-search"
            type="search"
            placeholder="Nome ou email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setParam('search', event.target.value.trim())
            }}
          />
        </div>
        <div className="flex w-[calc(50%-0.375rem)] flex-col gap-1.5 sm:w-48">
          <Label htmlFor="users-role">Papel</Label>
          <Select value={role || ALL} onValueChange={(v) => setParam('role', v === ALL ? '' : v)}>
            <SelectTrigger id="users-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os papéis</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.label_pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[calc(50%-0.375rem)] flex-col gap-1.5 sm:w-40">
          <div className="flex items-center gap-1">
            <Label htmlFor="users-status">Estado</Label>
            <InfoTooltip {...HELP.userStatus} />
          </div>
          <Select
            value={status || ALL}
            onValueChange={(v) => setParam('status', v === ALL ? '' : v)}
          >
            <SelectTrigger id="users-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {usersQuery.isLoading ? (
        <LoadingState label="A carregar utilizadores…" />
      ) : usersQuery.isError ? (
        <ErrorState message="Não foi possível carregar os utilizadores." />
      ) : users.length === 0 ? (
        <EmptyState
          title="Nenhum utilizador encontrado"
          description="Experimente outra pesquisa ou limpe os filtros."
        />
      ) : (
        <>
          {/* Mobile: cartões. */}
          <ul className="flex flex-col gap-2 md:hidden" aria-label="Utilizadores">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={user.name}>
                      {user.name}
                      {user.id === me?.id && <span className="text-muted-foreground"> (eu)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                  <StatusBadge user={user} />
                </div>
                <RoleBadges roles={user.roles} definitions={roles} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Último acesso: {lastLogin(user)}</span>
                  {actions(user)}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabela. */}
          <div className="hidden md:block">
            <Table aria-label="Utilizadores">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>
                    <span className="sr-only">Acções</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[16rem]">
                      <p className="truncate font-medium" title={user.name}>
                        {user.name}
                        {user.id === me?.id && <span className="text-muted-foreground"> (eu)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={user.email}>
                        {user.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <RoleBadges roles={user.roles} definitions={roles} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge user={user} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {lastLogin(user)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.workspaces_count}</TableCell>
                    <TableCell>{actions(user)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav
            aria-label="Paginação"
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted-foreground">
              {meta
                ? `${meta.total} utilizador(es) · página ${meta.current_page} de ${lastPage}`
                : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setParam('page', String(page + 1))}
              >
                Seguinte
              </Button>
            </div>
          </nav>
        </>
      )}

      {dialog?.kind === 'form' && (
        <UserFormDialog
          key={dialog.user?.id ?? 'new'}
          user={dialog.user}
          roles={roles}
          currentUserId={me?.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'password' && (
        <ResetPasswordDialog
          key={dialog.user.id}
          user={dialog.user}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === 'toggle'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={
          dialog?.kind === 'toggle'
            ? dialog.user.is_active
              ? `Desactivar ${dialog.user.name}?`
              : `Activar ${dialog.user.name}?`
            : ''
        }
        description={
          dialog?.kind === 'toggle'
            ? dialog.user.is_active
              ? 'A pessoa deixa de conseguir entrar. O histórico mantém-se e a conta pode ser reactivada.'
              : 'A pessoa volta a conseguir entrar com a palavra-passe actual.'
            : undefined
        }
        confirmLabel={
          dialog?.kind === 'toggle' && !dialog.user.is_active ? 'Activar' : 'Desactivar'
        }
        pendingLabel="A guardar…"
        confirmVariant={
          dialog?.kind === 'toggle' && !dialog.user.is_active ? 'default' : 'destructive'
        }
        onConfirm={() => dialog?.kind === 'toggle' && toggleMutation.mutate(dialog.user)}
        isPending={toggleMutation.isPending}
        error={
          toggleMutation.isError
            ? mutationErrorMessage(
                toggleMutation.error,
                'Não foi possível alterar o estado da conta.',
              )
            : null
        }
      />
    </div>
  )
}
