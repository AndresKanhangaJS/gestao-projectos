import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register as registerUser } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useQueryClient } from '@tanstack/react-query'

const schema = z
  .object({
    name: z.string().min(2, 'Indique o seu nome.'),
    email: z.string().email('Introduza um email válido.'),
    password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'As palavras-passe não coincidem.',
    path: ['password_confirmation'],
  })
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user)
      navigate('/', { replace: true })
    },
    onError: () => setServerError('Não foi possível concluir o registo. Verifique os dados.'),
  })

  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Level-Soft · Gestão de Projectos &amp; Controlo de Software
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => {
              setServerError(null)
              mutation.mutate(values)
            })}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" autoComplete="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
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
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password_confirmation">Confirmar palavra-passe</Label>
              <Input
                id="password_confirmation"
                type="password"
                autoComplete="new-password"
                {...register('password_confirmation')}
              />
              {errors.password_confirmation && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>
            {serverError && (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'A criar conta…' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
