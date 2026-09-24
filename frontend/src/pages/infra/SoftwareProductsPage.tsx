import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteSoftwareProduct, listSoftwareProducts } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { SoftwareProductFormDialog } from '@/components/infra/SoftwareProductFormDialog'
import { infraRootKey, softwareProductsKey } from '@/components/infra/queryKeys'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { useInfraPermissions } from '@/hooks/useHasRole'
import type { SoftwareProduct } from '@/types/infra'

export default function SoftwareProductsPage() {
  const queryClient = useQueryClient()
  const { canWrite } = useInfraPermissions()
  const [editing, setEditing] = useState<{ product: SoftwareProduct | null } | null>(null)
  const [toDelete, setToDelete] = useState<SoftwareProduct | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: softwareProductsKey, queryFn: listSoftwareProducts })

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message="Não foi possível carregar os produtos de software." />

  const products = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Softwares</h1>
        {canWrite && (
          <Button onClick={() => setEditing({ product: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo software
          </Button>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState title="Ainda não existem produtos de software" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <CardTitle>
                    <Link
                      to={`/infra/software/${product.id}`}
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {product.name}
                    </Link>
                  </CardTitle>
                  {product.category && <CardDescription>{product.category}</CardDescription>}
                </div>
                {canWrite && (
                  <div className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${product.name}`}
                      onClick={() => setEditing({ product })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Apagar ${product.name}`}
                      onClick={() => setToDelete(product)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {product.modules?.length ? (
                  product.modules.map((module) => (
                    <Badge key={module.id} variant="outline">
                      {module.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Sem módulos.</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SoftwareProductFormDialog
          key={editing.product?.id ?? 'new'}
          open
          product={editing.product}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title={`Apagar “${toDelete?.name ?? ''}”?`}
        description="As instalações deste software em clientes podem ser afectadas."
        remove={(p) => deleteSoftwareProduct(p.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível apagar o produto. Verifique se ainda está instalado em clientes."
      />
    </div>
  )
}
