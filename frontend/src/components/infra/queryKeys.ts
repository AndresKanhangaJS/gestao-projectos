/** Chaves do TanStack Query do módulo de Controlo de Software. Invalidar `infraRootKey` refresca tudo. */
export const infraRootKey = ['infra'] as const
export const clientsKey = ['infra', 'clients'] as const
export const clientOverviewKey = (id: number) => ['infra', 'clients', id, 'overview'] as const
export const softwareProductsKey = ['infra', 'software-products'] as const
export const softwareProductOverviewKey = (id: number) => ['infra', 'software-products', id, 'overview'] as const
export const softwareModulesKey = (productId: number) => ['infra', 'software-products', productId, 'modules'] as const
export const clientSoftwareKey = ['infra', 'client-software'] as const
export const machinesKey = ['infra', 'machines'] as const
export const machineOverviewKey = (id: number) => ['infra', 'machines', id, 'overview'] as const
export const deploymentsKey = ['infra', 'deployments'] as const
export const credentialsKey = ['infra', 'credentials'] as const
export const credentialAccessLogsKey = (id: number) => ['infra', 'credentials', id, 'access-logs'] as const
