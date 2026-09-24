import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <ShieldOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Sem acesso</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A sua conta não tem permissão para aceder a esta área. Se precisar de acesso, contacte um administrador.
      </p>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Voltar ao dashboard
      </Link>
    </div>
  )
}
