import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  TOO_MANY_REQUESTS_MESSAGE,
  httpStatus,
  serverMessage,
  validationMessage,
} from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { clearSessionNotice, readSessionNotice } from '@/lib/sessionNotice'

const schema = z.object({
  email: z.string().email('Introduza um email válido.'),
  password: z.string().min(1, 'A palavra-passe é obrigatória.'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Ex.: "A sua conta está desactivada…" quando a API terminou a sessão (401).
  const [serverError, setServerError] = useState<string | null>(readSessionNotice)
  useEffect(() => clearSessionNotice(), [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (isAuthenticated) {
    return <Navigate to={(location.state as { from?: string })?.from ?? '/'} replace />
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await login(values)
      navigate('/', { replace: true })
    } catch (error) {
      const status = httpStatus(error)
      if (status === 419) {
        // Sessão/CSRF expirada: a API devolve uma mensagem própria.
        setServerError(
          serverMessage(error) ?? 'A sessão expirou. Recarregue a página e tente novamente.',
        )
      } else if (status === 429) {
        setServerError(TOO_MANY_REQUESTS_MESSAGE)
      } else {
        // 422: credenciais erradas ou conta desactivada; a API explica qual em português.
        setServerError(
          validationMessage(error) ?? 'Credenciais inválidas. Verifique o email e a palavra-passe.',
        )
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Level-Soft · Gestão de Projectos &amp; Controlo de Software
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            {serverError && (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'A entrar…' : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Registar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
