export type ClientStatus = 'active' | 'inactive'
export type ClientSoftwareStatus =
  | 'desenvolvimento'
  | 'desenvolvimento_local'
  | 'testes'
  | 'producao'
  | 'manutencao'
  | 'descontinuado'
export type MachineAccessType = 'ssh' | 'rdp' | 'web'
export type MachineEnvironment = 'docker' | 'tradicional'
export type DeploymentComponent = 'frontend' | 'backend' | 'full' | 'worker'
export type DeploymentStatus = 'activo' | 'testes' | 'parado'
export type CredentialType = 'ssh' | 'rdp' | 'web' | 'database'
export type BackupFrequency = 'diario' | 'semanal' | 'mensal'
/** Alias curto aceite pela API para `credentialable_type` / `backupable_type`. */
export type PolymorphicTargetType = 'machine' | 'deployment'

export interface Client {
  id: number
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  status: ClientStatus
  notes: string | null
}

export interface SoftwareModule {
  id: number
  software_product_id: number
  name: string
  description: string | null
}

export interface SoftwareProduct {
  id: number
  name: string
  category: string | null
  description: string | null
  modules?: SoftwareModule[]
}

export interface ClientSoftware {
  id: number
  client_id: number
  software_product_id: number
  status: ClientSoftwareStatus
  activated_at: string | null
  notes: string | null
  client?: Client
  software_product?: SoftwareProduct
  modules?: (SoftwareModule & { active?: boolean })[]
  deployments?: Deployment[]
}

export interface Machine {
  id: number
  name: string
  ip_address: string | null
  operating_system: string | null
  access_type: MachineAccessType | null
  access_user: string | null
  environment: MachineEnvironment
  notes: string | null
}

export interface Deployment {
  id: number
  client_software_id: number
  software_module_id: number | null
  machine_id: number
  component: DeploymentComponent
  port: number | null
  stack: string | null
  database_engine: string | null
  database_name: string | null
  database_host: string | null
  environment_type: MachineEnvironment
  start_command: string | null
  status: DeploymentStatus
  last_checked_at: string | null
  machine?: Machine
  client_software?: ClientSoftware
  software_module?: SoftwareModule | null
}

/** Nunca contém o segredo — esse só é obtido via `POST /infra/credentials/{id}/reveal`. */
export interface Credential {
  id: number
  /** Nome completo da classe no backend (ex.: `App\Models\Infra\Machine`). */
  credentialable_type: string
  credentialable_id: number
  type: CredentialType
  username: string | null
  notes: string | null
  created_at?: string
}

/** Registo de auditoria de cada revelação de segredo (`GET /infra/credentials/{id}/access-logs`, só admin). */
export interface CredentialAccessLog {
  id: number
  credential_id?: number
  user?: { id: number; name: string } | null
  accessed_at?: string | null
  ip_address: string | null
  created_at?: string
}

// Payloads de escrita

export interface ClientPayload {
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  status: ClientStatus
  notes: string | null
}

export interface MachinePayload {
  name: string
  ip_address: string | null
  operating_system: string | null
  access_type: MachineAccessType | null
  access_user: string | null
  environment: MachineEnvironment
  notes: string | null
}

export interface SoftwareProductPayload {
  name: string
  category: string | null
  description: string | null
}

export interface SoftwareModulePayload {
  name: string
  description: string | null
}

export interface ClientSoftwarePayload {
  client_id: number
  software_product_id: number
  status: ClientSoftwareStatus
  activated_at: string | null
  notes: string | null
}

export type UpdateClientSoftwarePayload = Omit<ClientSoftwarePayload, 'client_id' | 'software_product_id'>

export interface DeploymentPayload {
  client_software_id: number
  software_module_id: number | null
  machine_id: number
  component: DeploymentComponent
  port: number | null
  stack: string | null
  database_engine: string | null
  database_name: string | null
  database_host: string | null
  environment_type: MachineEnvironment
  start_command: string | null
  status: DeploymentStatus
  last_checked_at: string | null
}

export interface CreateCredentialPayload {
  credentialable_type: PolymorphicTargetType
  credentialable_id: number
  type: CredentialType
  username: string | null
  notes: string | null
  /** Omitido quando vazio. */
  secret?: string
}

/** Na edição o segredo só é enviado quando o utilizador escreve um novo (vazio = manter o actual). */
export type UpdateCredentialPayload = Omit<CreateCredentialPayload, 'credentialable_type' | 'credentialable_id'>

export interface BackupPolicy {
  id: number
  /** Nome completo da classe no backend (ex.: `App\Models\Infra\Deployment`). */
  backupable_type: string
  backupable_id: number
  frequency: BackupFrequency
  retention_count: number
  last_run_at: string | null
  next_run_at: string | null
}
