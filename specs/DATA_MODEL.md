# Modelo de Dados

## 1. ERD — Módulo Gestão de Projectos

```mermaid
erDiagram
    USERS ||--o{ WORKSPACE_USER : "pertence a"
    WORKSPACES ||--o{ WORKSPACE_USER : tem
    WORKSPACES ||--o{ PROJECTS : contem
    PROJECTS ||--o{ BOARDS : contem
    BOARDS ||--o{ BOARD_COLUMNS : tem
    PROJECTS ||--o{ SPRINTS : tem
    PROJECTS ||--o{ TASKS : contem
    BOARD_COLUMNS ||--o{ TASKS : "estado actual"
    SPRINTS ||--o{ TASKS : agrupa
    TASKS ||--o{ TASKS : "subtarefas (parent_id)"
    TASKS ||--o{ TASK_ASSIGNEES : tem
    USERS ||--o{ TASK_ASSIGNEES : atribuido
    TASKS ||--o{ TASK_LABELS : tem
    LABELS ||--o{ TASK_LABELS : aplicada
    TASKS ||--o{ TASK_COMMENTS : tem
    USERS ||--o{ TASK_COMMENTS : escreve
    TASKS ||--o{ TASK_RELATIONS : "origem"
    TASKS ||--o{ TASK_ATTACHMENTS : tem
    TASKS ||--o{ TASK_WATCHERS : observada_por
    USERS ||--o{ TASK_WATCHERS : observa
    TASKS ||--o{ ACTIVITY_LOGS : gera
    USERS ||--o{ NOTIFICATIONS : recebe

    USERS {
        bigint id PK
        string name
        string email UK
        string password
        timestamp email_verified_at
    }
    WORKSPACES {
        bigint id PK
        string name
        string slug UK
        text description
        bigint owner_id FK
    }
    WORKSPACE_USER {
        bigint workspace_id FK
        bigint user_id FK
        string role
    }
    PROJECTS {
        bigint id PK
        bigint workspace_id FK
        bigint software_product_id FK "nullable (Controlo de Software)"
        bigint client_id FK "nullable (Controlo de Software)"
        string key UK "ex: PROJ"
        string name
        text description
        string status "active/archived"
    }
    BOARDS {
        bigint id PK
        bigint project_id FK
        string name
        boolean is_default
    }
    BOARD_COLUMNS {
        bigint id PK
        bigint board_id FK
        string name
        integer position
        string color
        boolean is_done_column
    }
    SPRINTS {
        bigint id PK
        bigint project_id FK
        string name
        text goal
        date starts_at
        date ends_at
        string status "planned/active/completed"
    }
    TASKS {
        bigint id PK
        bigint project_id FK
        bigint board_column_id FK
        bigint sprint_id FK "nullable"
        bigint parent_id FK "nullable, subtarefa"
        bigint reporter_id FK
        string type "epic/story/task/bug"
        string priority "low/medium/high/urgent"
        string title
        longtext description
        decimal estimate
        date starts_at
        date due_at
        integer position
    }
    TASK_ASSIGNEES {
        bigint task_id FK
        bigint user_id FK
    }
    LABELS {
        bigint id PK
        bigint project_id FK
        string name
        string color
    }
    TASK_LABELS {
        bigint task_id FK
        bigint label_id FK
    }
    TASK_COMMENTS {
        bigint id PK
        bigint task_id FK
        bigint user_id FK
        text body
    }
    TASK_RELATIONS {
        bigint id PK
        bigint task_id FK "origem"
        bigint related_task_id FK "destino"
        string type "blocks/blocked_by/relates_to/duplicates"
    }
    TASK_ATTACHMENTS {
        bigint id PK
        bigint task_id FK
        bigint uploaded_by FK
        string path
        string original_name
    }
    TASK_WATCHERS {
        bigint task_id FK
        bigint user_id FK
    }
    ACTIVITY_LOGS {
        bigint id PK
        string subject_type
        bigint subject_id
        bigint causer_id FK
        string event
        json changes
    }
    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        string type
        json data
        timestamp read_at
    }
```

## 2. ERD — Módulo Controlo de Software

```mermaid
erDiagram
    CLIENTS ||--o{ CLIENT_SOFTWARE : possui
    SOFTWARE_PRODUCTS ||--o{ CLIENT_SOFTWARE : instanciado_em
    SOFTWARE_PRODUCTS ||--o{ SOFTWARE_MODULES : tem
    CLIENT_SOFTWARE ||--o{ CLIENT_SOFTWARE_MODULES : activa
    SOFTWARE_MODULES ||--o{ CLIENT_SOFTWARE_MODULES : usado_em
    CLIENT_SOFTWARE ||--o{ DEPLOYMENTS : implantado_em
    SOFTWARE_MODULES ||--o{ DEPLOYMENTS : "componente especifico (nullable)"
    MACHINES ||--o{ DEPLOYMENTS : hospeda
    MACHINES ||--o{ CREDENTIALS : "acesso a"
    DEPLOYMENTS ||--o{ CREDENTIALS : "acesso a"
    MACHINES ||--o{ BACKUP_POLICIES : tem
    DEPLOYMENTS ||--o{ BACKUP_POLICIES : tem
    USERS ||--o{ CREDENTIAL_ACCESS_LOGS : acede
    CREDENTIALS ||--o{ CREDENTIAL_ACCESS_LOGS : acedida_em

    CLIENTS {
        bigint id PK
        string name
        string contact_name
        string contact_email
        string contact_phone
        string status "active/inactive"
        text notes
    }
    SOFTWARE_PRODUCTS {
        bigint id PK
        string name
        string category
        text description
    }
    SOFTWARE_MODULES {
        bigint id PK
        bigint software_product_id FK
        string name
        text description
    }
    CLIENT_SOFTWARE {
        bigint id PK
        bigint client_id FK
        bigint software_product_id FK
        string status "desenvolvimento/testes/producao/manutencao/descontinuado"
        date activated_at
        text notes
    }
    CLIENT_SOFTWARE_MODULES {
        bigint client_software_id FK
        bigint software_module_id FK
        boolean active
    }
    MACHINES {
        bigint id PK
        string name UK "ex: Maquina 10"
        string ip_address
        string operating_system
        string access_type "ssh/rdp/web"
        string access_user
        string environment "docker/tradicional"
        text notes
    }
    DEPLOYMENTS {
        bigint id PK
        bigint client_software_id FK
        bigint software_module_id FK "nullable"
        bigint machine_id FK
        string component "frontend/backend/full/worker"
        integer port
        string stack "ex: Laravel 10.50.2"
        string database_engine
        string database_name
        string database_host
        string environment_type "docker/tradicional"
        text start_command "quando tradicional"
        string status "activo/testes/parado"
        timestamp last_checked_at
    }
    CREDENTIALS {
        bigint id PK
        string credentialable_type
        bigint credentialable_id
        string type "ssh/rdp/web/database"
        string username
        text secret "encrypted"
        text notes
    }
    CREDENTIAL_ACCESS_LOGS {
        bigint id PK
        bigint credential_id FK
        bigint user_id FK
        timestamp accessed_at
        string ip_address
    }
    BACKUP_POLICIES {
        bigint id PK
        string backupable_type
        bigint backupable_id
        string frequency "diario/semanal/mensal"
        integer retention_count
        timestamp last_run_at
        timestamp next_run_at
    }
```

## 2.1 Ligação entre módulos — Projecto ↔ Controlo de Software

```mermaid
erDiagram
    SOFTWARE_PRODUCTS ||--o{ PROJECTS : "projectos sobre (nullable)"
    CLIENTS ||--o{ PROJECTS : "projectos para (nullable)"
    PROJECTS ||--o{ PROJECT_SOFTWARE_MODULE : abrange
    SOFTWARE_MODULES ||--o{ PROJECT_SOFTWARE_MODULE : "abrangido por"

    PROJECT_SOFTWARE_MODULE {
        bigint id PK
        bigint project_id FK "cascade"
        bigint software_module_id FK "cascade"
    }
```

- Tudo opcional: `projects.software_product_id` e `projects.client_id` são FKs nullable com `nullOnDelete` (apagar o produto/cliente não apaga o projecto); `project_software_module` tem `unique(project_id, software_module_id)` e cascata nos dois lados.
- Coerência (validada em `Store/UpdateProjectRequest`): `client_id` exige `software_product_id` e uma instalação (`CLIENT_SOFTWARE`) desse produto nesse cliente; cada módulo pertence ao produto e, havendo cliente, tem de estar activo na instalação desse cliente.
- **"Todos os módulos"**: não há flag dedicada. Uma instalação `CLIENT_SOFTWARE` **sem linhas** em `CLIENT_SOFTWARE_MODULES` tem o software completo (todos os módulos activos); havendo linhas, só as com `active = true` contam (`ClientSoftware::activeModuleIds()`, `null` = todos).
- A ligação entre módulos existe só ao nível de models/relações (`Project::softwareProduct()/client()/modules()`); os controllers continuam separados. O formulário de projecto usa `GET /api/projects/link-options` (só ids/nomes), e os overviews de cliente/software do módulo Infra listam os projectos ligados visíveis ao utilizador.

## 3. Notas de modelação

- `CLIENT_SOFTWARE` é a tabela-chave que resolve "Level-School (Pitruca)" vs "Level-School (Bondo)": mesma `SOFTWARE_PRODUCT`, `CLIENT` diferente, uma linha por instância.
- `DEPLOYMENTS.software_module_id` é nulo quando o deployment cobre o software inteiro; preenchido quando front-end e back-end estão em máquinas diferentes (ex.: Máquina 7 = frontend Angular do Level-RH Pitruca; Máquina 10 = backend Laravel do mesmo).
- `CREDENTIALS` e `BACKUP_POLICIES` são polimórficas (`credentialable`/`backupable`) para poderem associar-se tanto a `MACHINES` como a `DEPLOYMENTS`, reflectindo casos como o computador dedicado a backups que cobre várias máquinas.
- `MACHINES.environment = 'tradicional'` alimenta o alerta de "a migrar para Docker" descrito no PRD.
- Nenhum campo de credencial é devolvido em texto simples por omissão em nenhuma API Resource; ver `ARCHITECTURE.md` §2.
- Enums (`priority`, `status`, `type`, `environment`, etc.) implementados como PHP Enums nativos (`app/Enums`), não strings soltas nem tabelas de lookup — mais simples para o volume de valores fixos do MVP.
