import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminUser, resetAdminUserPassword, updateAdminUser } from '@/api/adminUsers'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FieldError, FormField, FormServerError } from '@/components/ui/FormField'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import { HELP } from '@/lib/help'
import type { AdminUser, RoleDefinition } from '@/types/admin'
import { adminUsersKey } from './queryKeys'

const MIN_PASSWORD = 8

const passwordFields = {
  password: z
    .string()
    .min(MIN_PASSWORD, `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD} caracteres.`),
  password_confirmation: z.string(),
}
const passwordsMatch = (v: { password: string; password_confirmation: string }) =>
  v.password === v.password_confirmation

const baseFields = {
  name: z.string().trim().min(1, 'O nome é obrigatório.').max(255, 'Máximo de 255 caracteres.'),
  email: z.string().trim().min(1, 'O email é obrigatório.').email('Indique um email válido.'),
  roles: z.array(z.string()).min(1, 'Escolha pelo menos um papel.'),
}

/** Na edição não há palavra-passe (repõe-se num diálogo próprio): os campos ficam vazios e livres. */
function userSchema(editing: boolean) {
  return z
    .object({
      ...baseFields,
      password: editing ? z.string() : passwordFields.password,
      password_confirmation: z.string(),
    })
    .refine((v) => editing || passwordsMatch(v), {
      path: ['password_confirmation'],
      message: 'As palavras-passe não coincidem.',
    })
}
type CreateValues = z.infer<ReturnType<typeof userSchema>>

/** Papéis globais como caixas de selecção, cada uma com a descrição do que permite. */
function RolesField({
  roles,
  value,
  onChange,
  lockedRoles,
  lockedReason,
  error,
}: {
  roles: RoleDefinition[]
  value: string[]
  onChange: (roles: string[]) => void
  /** Papéis que não se podem retirar (ex.: o admin a editar-se a si próprio). */
  lockedRoles: string[]
  lockedReason?: string
  error?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 flex items-center gap-1 text-sm font-medium">
        Papéis <InfoTooltip {...HELP.globalRoles} />
      </legend>
      <ul className="flex flex-col gap-2">
        {roles.map((role) => {
          const id = `user-role-${role.name}`
          const locked = lockedRoles.includes(role.name) && value.includes(role.name)
          return (
            <li key={role.name} className="flex items-start gap-2">
              <Checkbox
                id={id}
                className="mt-0.5"
                checked={value.includes(role.name)}
                disabled={locked}
                aria-describedby={`${id}-description`}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true ? [...value, role.name] : value.filter((r) => r !== role.name),
                  )
                }
              />
              <div className="flex min-w-0 flex-col">
                <Label htmlFor={id}>{role.label_pt}</Label>
                <span id={`${id}-description`} className="text-xs text-muted-foreground">
                  {role.description_pt}
                  {locked && lockedReason ? ` ${lockedReason}` : ''}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <FieldError id="user-roles-error" message={error} />
    </fieldset>
  )
}

/** Criar (sem `user`) ou editar um utilizador (nome, email e papéis globais). */
export function UserFormDialog({
  user,
  roles,
  currentUserId,
  onClose,
}: {
  user: AdminUser | null
  roles: RoleDefinition[]
  currentUserId: number | undefined
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const editing = user != null
  const isSelf = editing && user.id === currentUserId

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(userSchema(editing)),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      roles: user?.roles ?? ['member'],
      password: '',
      password_confirmation: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CreateValues) =>
      user
        ? updateAdminUser(user.id, { name: values.name, email: values.email, roles: values.roles })
        : createAdminUser({
            name: values.name,
            email: values.email,
            password: values.password,
            password_confirmation: values.password_confirmation,
            roles: values.roles,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersKey })
      onClose()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'email', 'password', 'password_confirmation', 'roles'],
        fallback: editing
          ? 'Não foi possível guardar o utilizador.'
          : 'Não foi possível criar o utilizador.',
      }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar utilizador' : 'Novo utilizador'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Altere o nome, o email ou os papéis globais. A palavra-passe repõe-se na acção própria.'
              : 'A pessoa entra com este email e esta palavra-passe provisória, e terá de a mudar no primeiro login. Para lhe dar acesso a projectos, adicione-a depois aos workspaces.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="user-name" label="Nome" error={errors.name}>
            <Input
              autoComplete="off"
              {...fieldA11y('user-name', errors.name)}
              {...register('name')}
            />
          </FormField>
          <FormField id="user-email" label="Email" error={errors.email}>
            <Input
              type="email"
              autoComplete="off"
              {...fieldA11y('user-email', errors.email)}
              {...register('email')}
            />
          </FormField>
          {!editing && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="user-password" label="Palavra-passe" error={errors.password}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...fieldA11y('user-password', errors.password)}
                  {...register('password')}
                />
              </FormField>
              <FormField
                id="user-password-confirmation"
                label="Confirmar palavra-passe"
                error={errors.password_confirmation}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...fieldA11y('user-password-confirmation', errors.password_confirmation)}
                  {...register('password_confirmation')}
                />
              </FormField>
            </div>
          )}
          <Controller
            control={control}
            name="roles"
            render={({ field }) => (
              <RolesField
                roles={roles}
                value={field.value}
                onChange={field.onChange}
                lockedRoles={isSelf ? ['admin'] : []}
                lockedReason="Não pode retirar a si próprio o papel de administrador."
                error={errors.roles?.message}
              />
            )}
          />
          <FormServerError message={errors.root?.server?.message} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? 'A guardar…'
                : editing
                  ? 'Guardar alterações'
                  : 'Criar utilizador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const resetSchema = z.object(passwordFields).refine(passwordsMatch, {
  path: ['password_confirmation'],
  message: 'As palavras-passe não coincidem.',
})
type ResetValues = z.infer<typeof resetSchema>

/** Define uma nova palavra-passe para o utilizador (comunicada por fora da aplicação). */
export function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', password_confirmation: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ResetValues) => resetAdminUserPassword(user.id, values),
    onSuccess: onClose,
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['password', 'password_confirmation'],
        fallback: 'Não foi possível repor a palavra-passe.',
      }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repor palavra-passe</DialogTitle>
          <DialogDescription>
            Palavra-passe provisória para {user.name}. Comunique-a por um canal seguro: no próximo
            login a pessoa terá de definir uma nova.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="reset-password" label="Nova palavra-passe" error={errors.password}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y('reset-password', errors.password)}
              {...register('password')}
            />
          </FormField>
          <FormField
            id="reset-password-confirmation"
            label="Confirmar palavra-passe"
            error={errors.password_confirmation}
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y('reset-password-confirmation', errors.password_confirmation)}
              {...register('password_confirmation')}
            />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'A guardar…' : 'Repor palavra-passe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
