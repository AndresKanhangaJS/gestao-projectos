import { useState } from 'react'
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Check, Circle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { changePassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/Card'
import { FieldError, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import { cn } from '@/lib/utils'

const MIN_LENGTH = 8

const schema = z
  .object({
    current_password: z.string().min(1, 'Indique a palavra-passe actual.'),
    password: z
      .string()
      .min(MIN_LENGTH, `A nova palavra-passe tem de ter pelo menos ${MIN_LENGTH} caracteres.`),
    password_confirmation: z.string().min(1, 'Confirme a nova palavra-passe.'),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ['password_confirmation'],
    message: 'As palavras-passe não coincidem.',
  })
  .refine((v) => v.password === '' || v.password !== v.current_password, {
    path: ['password'],
    message: 'A nova palavra-passe tem de ser diferente da actual.',
  })
type FormValues = z.infer<typeof schema>

/** Estado de navegação: para onde voltar depois de alterar (ou cancelar). */
interface ChangePasswordState {
  from?: string
}

/** Campo de palavra-passe com botão para mostrar/ocultar o texto. */
function PasswordField({
  id,
  label,
  error,
  autoComplete,
  registration,
}: {
  id: string
  label: string
  error?: { message?: string }
  autoComplete: string
  registration: UseFormRegisterReturn
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="pr-10"
          {...fieldA11y(id, error)}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error?.message} />
    </div>
  )
}

/**
 * Alterar a palavra-passe. Obrigatório (sem "Cancelar") quando a conta tem `must_change_password`
 * (conta nova ou palavra-passe reposta por um admin); opcional quando aberto pelo menu do
 * utilizador. Fica fora do layout da aplicação, como o ecrã de entrada.
 */
export default function ChangePasswordPage() {
  const { user, isLoading, isAuthenticated, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as ChangePasswordState | null)?.from
  const target = from && from !== '/change-password' ? from : '/'
  const forced = Boolean(user?.must_change_password)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })
  const [current, password, confirmation] = useWatch({
    control,
    name: ['current_password', 'password', 'password_confirmation'],
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => changePassword(values),
    onSuccess: (updated) => {
      updateUser(updated)
      navigate(target, { replace: true, state: { flash: 'A sua palavra-passe foi alterada.' } })
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['current_password', 'password', 'password_confirmation'],
        fallback: 'Não foi possível alterar a palavra-passe.',
      }),
  })

  if (isLoading) return <LoadingState label="A verificar sessão…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const requirements = [
    { ok: password.length >= MIN_LENGTH, text: `Pelo menos ${MIN_LENGTH} caracteres` },
    { ok: password !== '' && password !== current, text: 'Diferente da palavra-passe actual' },
    {
      ok: password !== '' && password === confirmation,
      text: 'Confirmação igual à nova palavra-passe',
    },
  ]

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="text-lg font-semibold leading-none">
              {forced ? 'Defina uma nova palavra-passe' : 'Alterar palavra-passe'}
            </h1>
          </div>
          <CardDescription>
            {forced
              ? 'Por segurança, defina uma nova palavra-passe antes de continuar.'
              : 'Escolha uma nova palavra-passe para a sua conta.'}
            {user?.email && <span className="mt-1 block truncate text-xs">{user.email}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <PasswordField
              id="current-password"
              label={forced ? 'Palavra-passe provisória' : 'Palavra-passe actual'}
              autoComplete="current-password"
              error={errors.current_password}
              registration={register('current_password')}
            />
            <PasswordField
              id="new-password"
              label="Nova palavra-passe"
              autoComplete="new-password"
              error={errors.password}
              registration={register('password')}
            />
            <PasswordField
              id="new-password-confirmation"
              label="Confirmar nova palavra-passe"
              autoComplete="new-password"
              error={errors.password_confirmation}
              registration={register('password_confirmation')}
            />
            <ul
              className="flex flex-col gap-1 text-xs"
              aria-label="Requisitos da nova palavra-passe"
            >
              {requirements.map((r) => (
                <li
                  key={r.text}
                  className={cn(
                    'flex items-center gap-1.5',
                    r.ok ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {r.ok ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {r.text}
                  <span className="sr-only">{r.ok ? ' (cumprido)' : ' (por cumprir)'}</span>
                </li>
              ))}
            </ul>
            <FormServerError message={errors.root?.server?.message} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'A guardar…' : 'Guardar nova palavra-passe'}
            </Button>
            <div className="flex flex-wrap justify-between gap-2">
              {!forced && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(target, { replace: true })}
                >
                  Cancelar
                </Button>
              )}
              <Button type="button" variant="link" className="ml-auto px-0" onClick={handleLogout}>
                Terminar sessão
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
