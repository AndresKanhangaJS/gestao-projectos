import { api } from './client'
import { fetchAllPages } from './pagination'
import type {
  BackupFrequency,
  BackupPolicy,
  Client,
  ClientPayload,
  ClientSoftware,
  ClientSoftwarePayload,
  CreateCredentialPayload,
  Credential,
  CredentialAccessLog,
  Deployment,
  DeploymentPayload,
  Machine,
  MachinePayload,
  PolymorphicTargetType,
  SoftwareModule,
  SoftwareModulePayload,
  SoftwareProduct,
  SoftwareProductPayload,
  UpdateClientSoftwarePayload,
  UpdateCredentialPayload,
} from '@/types/infra'

// Clientes
/** O endpoint é paginado — percorre todas as páginas. */
export async function listClients(): Promise<Client[]> {
  return fetchAllPages<Client>('/infra/clients')
}
export async function getClientOverview(
  clientId: number,
): Promise<{ client: Client; software: ClientSoftware[] }> {
  const { data } = await api.get<{ client: Client | { data: Client }; software: ClientSoftware[] }>(
    `/infra/clients/${clientId}/overview`,
  )
  return { client: unwrap(data.client), software: data.software }
}
export async function createClient(payload: ClientPayload): Promise<Client> {
  const { data } = await api.post<{ data: Client }>('/infra/clients', payload)
  return data.data
}
export async function updateClient(id: number, payload: Partial<ClientPayload>): Promise<Client> {
  const { data } = await api.put<{ data: Client }>(`/infra/clients/${id}`, payload)
  return data.data
}
export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/infra/clients/${id}`)
}

// Produtos de software
/** O endpoint é paginado — percorre todas as páginas. */
export async function listSoftwareProducts(): Promise<SoftwareProduct[]> {
  return fetchAllPages<SoftwareProduct>('/infra/software-products')
}
export async function getSoftwareProductOverview(
  productId: number,
): Promise<{ software_product: SoftwareProduct; instances: ClientSoftware[] }> {
  const { data } = await api.get<{
    software_product: SoftwareProduct | { data: SoftwareProduct }
    instances: ClientSoftware[]
  }>(`/infra/software-products/${productId}/overview`)
  return { software_product: unwrap(data.software_product), instances: data.instances }
}
export async function createSoftwareProduct(payload: SoftwareProductPayload): Promise<SoftwareProduct> {
  const { data } = await api.post<{ data: SoftwareProduct }>('/infra/software-products', payload)
  return data.data
}
export async function updateSoftwareProduct(
  id: number,
  payload: Partial<SoftwareProductPayload>,
): Promise<SoftwareProduct> {
  const { data } = await api.put<{ data: SoftwareProduct }>(`/infra/software-products/${id}`, payload)
  return data.data
}
export async function deleteSoftwareProduct(id: number): Promise<void> {
  await api.delete(`/infra/software-products/${id}`)
}

// Módulos de software
export async function listSoftwareModules(productId: number): Promise<SoftwareModule[]> {
  const { data } = await api.get<{ data: SoftwareModule[] }>(`/infra/software-products/${productId}/modules`)
  return data.data
}
export async function createSoftwareModule(
  productId: number,
  payload: SoftwareModulePayload,
): Promise<SoftwareModule> {
  const { data } = await api.post<{ data: SoftwareModule }>(
    `/infra/software-products/${productId}/modules`,
    payload,
  )
  return data.data
}
export async function updateSoftwareModule(
  id: number,
  payload: Partial<SoftwareModulePayload>,
): Promise<SoftwareModule> {
  const { data } = await api.put<{ data: SoftwareModule }>(`/infra/software-modules/${id}`, payload)
  return data.data
}
export async function deleteSoftwareModule(id: number): Promise<void> {
  await api.delete(`/infra/software-modules/${id}`)
}

// Instâncias cliente ↔ software
export async function listClientSoftware(): Promise<ClientSoftware[]> {
  return fetchAllPages<ClientSoftware>('/infra/client-software')
}
export async function createClientSoftware(payload: ClientSoftwarePayload): Promise<ClientSoftware> {
  const { data } = await api.post<{ data: ClientSoftware }>('/infra/client-software', payload)
  return data.data
}
export async function updateClientSoftware(
  id: number,
  payload: Partial<UpdateClientSoftwarePayload>,
): Promise<ClientSoftware> {
  const { data } = await api.put<{ data: ClientSoftware }>(`/infra/client-software/${id}`, payload)
  return data.data
}
export async function deleteClientSoftware(id: number): Promise<void> {
  await api.delete(`/infra/client-software/${id}`)
}
/** Sincroniza o estado (activo/inactivo) de todos os módulos da instância. */
export async function syncClientSoftwareModules(
  id: number,
  modules: { software_module_id: number; active: boolean }[],
): Promise<ClientSoftware> {
  const { data } = await api.put<{ data: ClientSoftware }>(`/infra/client-software/${id}/modules`, { modules })
  return data.data
}

// Máquinas
/** O endpoint é paginado (15 por página) — percorre todas as páginas. */
export async function listMachines(): Promise<Machine[]> {
  return fetchAllPages<Machine>('/infra/machines')
}
export async function getMachineOverview(
  machineId: number,
): Promise<{ machine: Machine; deployments: Deployment[] }> {
  const { data } = await api.get<{ machine: Machine | { data: Machine }; deployments: Deployment[] }>(
    `/infra/machines/${machineId}/overview`,
  )
  return { machine: unwrap(data.machine), deployments: data.deployments }
}
export async function createMachine(payload: MachinePayload): Promise<Machine> {
  const { data } = await api.post<{ data: Machine }>('/infra/machines', payload)
  return data.data
}
export async function updateMachine(id: number, payload: Partial<MachinePayload>): Promise<Machine> {
  const { data } = await api.put<{ data: Machine }>(`/infra/machines/${id}`, payload)
  return data.data
}
export async function deleteMachine(id: number): Promise<void> {
  await api.delete(`/infra/machines/${id}`)
}

// Deployments
/**
 * O endpoint é paginado — percorre todas as páginas. `machineId` usa o filtro server-side
 * `?machine_id=N`; mantemos um filtro defensivo no cliente (barato) para o caso de o backend
 * ainda não o suportar.
 */
export async function listDeployments(machineId?: number): Promise<Deployment[]> {
  const deployments = await fetchAllPages<Deployment>(
    '/infra/deployments',
    machineId != null ? { machine_id: machineId } : undefined,
  )
  return machineId != null ? deployments.filter((d) => d.machine_id === machineId) : deployments
}
export async function createDeployment(payload: DeploymentPayload): Promise<Deployment> {
  const { data } = await api.post<{ data: Deployment }>('/infra/deployments', payload)
  return data.data
}
export async function updateDeployment(id: number, payload: Partial<DeploymentPayload>): Promise<Deployment> {
  const { data } = await api.put<{ data: Deployment }>(`/infra/deployments/${id}`, payload)
  return data.data
}
export async function deleteDeployment(id: number): Promise<void> {
  await api.delete(`/infra/deployments/${id}`)
}

/**
 * Rótulo legível de um deployment: componente, porta, cliente/produto (quando o backend os inclui
 * via `client_software.client` / `client_software.software_product`) e máquina (opcional).
 */
export function deploymentLabel(deployment: Deployment, options: { machineName?: string } = {}): string {
  const port = deployment.port ? ` :${deployment.port}` : ''
  const instance = deployment.client_software
  const owner = [instance?.client?.name, instance?.software_product?.name].filter(Boolean).join(' / ')
  const machineName = options.machineName ?? deployment.machine?.name
  return [
    `${deployment.component}${port}`,
    owner ? ` — ${owner}` : '',
    machineName ? ` em ${machineName}` : '',
  ].join('')
}

// Referências polimórficas (credentialable_type / backupable_type)

/**
 * O backend devolve o nome completo da classe (ex.: `App\Models\Infra\Machine`) porque não há
 * morph map; nos pedidos aceita o alias curto (`machine`/`deployment`). Normaliza ambos os casos.
 */
export function toTargetType(morphType: string): PolymorphicTargetType | null {
  const short = morphType.split('\\').pop()?.toLowerCase()
  return short === 'machine' || short === 'deployment' ? short : null
}

// Credenciais

/** Filtros server-side suportados por `GET /infra/credentials`. */
export type CredentialFilter =
  | { machine_id: number }
  | { credentialable_type: PolymorphicTargetType; credentialable_id: number }

/**
 * Lista credenciais (sem segredo — ver CredentialResource) com filtro server-side, percorrendo
 * todas as páginas. `?machine_id=N` devolve as credenciais da máquina e dos seus deployments.
 */
export async function listCredentials(filter: CredentialFilter): Promise<Credential[]> {
  return fetchAllPages<Credential>('/infra/credentials', filter)
}

/** Credenciais de uma máquina e dos seus deployments (`?machine_id=N`). */
export async function listMachineCredentials(machineId: number): Promise<Credential[]> {
  return listCredentials({ machine_id: machineId })
}

/** Remove `secret` do payload quando vazio — o backend trata `null` como "apagar o segredo". */
function withoutEmptySecret<T extends { secret?: string }>(payload: T): T {
  if (payload.secret == null || payload.secret === '') {
    const rest = { ...payload }
    delete rest.secret
    return rest
  }
  return payload
}

export async function createCredential(payload: CreateCredentialPayload): Promise<Credential> {
  const { data } = await api.post<{ data: Credential }>('/infra/credentials', withoutEmptySecret(payload))
  return data.data
}

/** Na edição, um segredo vazio significa "manter o actual" — nunca é enviado. */
export async function updateCredential(id: number, payload: UpdateCredentialPayload): Promise<Credential> {
  const { data } = await api.put<{ data: Credential }>(`/infra/credentials/${id}`, withoutEmptySecret(payload))
  return data.data
}

export async function deleteCredential(id: number): Promise<void> {
  await api.delete(`/infra/credentials/${id}`)
}

/**
 * Pede o segredo em texto simples. Cada chamada fica registada em auditoria no backend.
 * Deve ser usado apenas via `useMutation` (nunca `useQuery`) para o segredo não ficar em cache.
 */
export async function revealCredential(id: number): Promise<{ secret: string | null }> {
  const { data } = await api.post<{ secret: string | null }>(`/infra/credentials/${id}/reveal`)
  return data
}

/** Histórico de revelações de uma credencial (apenas `admin`). */
export async function listCredentialAccessLogs(id: number): Promise<CredentialAccessLog[]> {
  return fetchAllPages<CredentialAccessLog>(`/infra/credentials/${id}/access-logs`)
}

// Políticas de backup

export interface BackupPolicyPayload {
  backupable_type: PolymorphicTargetType
  backupable_id: number
  frequency: BackupFrequency
  retention_count: number
  last_run_at?: string | null
  next_run_at?: string | null
}

export type UpdateBackupPolicyPayload = Omit<BackupPolicyPayload, 'backupable_type' | 'backupable_id'>

/** Sem argumento lista todas; com `target` usa o filtro server-side `?backupable_type=&backupable_id=`. */
export async function listBackupPolicies(target?: {
  type: PolymorphicTargetType
  id: number
}): Promise<BackupPolicy[]> {
  return fetchAllPages<BackupPolicy>(
    '/infra/backup-policies',
    target ? { backupable_type: target.type, backupable_id: target.id } : undefined,
  )
}
export async function createBackupPolicy(payload: BackupPolicyPayload): Promise<BackupPolicy> {
  const { data } = await api.post<{ data: BackupPolicy }>('/infra/backup-policies', payload)
  return data.data
}
export async function updateBackupPolicy(
  id: number,
  payload: UpdateBackupPolicyPayload,
): Promise<BackupPolicy> {
  const { data } = await api.put<{ data: BackupPolicy }>(`/infra/backup-policies/${id}`, payload)
  return data.data
}
export async function deleteBackupPolicy(id: number): Promise<void> {
  await api.delete(`/infra/backup-policies/${id}`)
}

// Alertas do dashboard de infra
export interface InfraAlerts {
  machines_tradicional: Machine[]
  software_without_backup: ClientSoftware[]
  deployments_not_recently_checked: Deployment[]
}
export async function getInfraAlerts(): Promise<InfraAlerts> {
  const { data } = await api.get<InfraAlerts>('/infra/alerts')
  return data
}

/** Os overviews embrulham resources dentro de `response()->json([...])`; aceita ambos os formatos. */
function unwrap<T extends object>(value: T | { data: T }): T {
  return 'data' in value && typeof value.data === 'object' && value.data !== null ? (value.data as T) : (value as T)
}
