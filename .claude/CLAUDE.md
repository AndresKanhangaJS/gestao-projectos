# CLAUDE.md — Convenções do projecto "Gestão de Projectos & Controlo de Software" (Level-Soft)

Este ficheiro orienta qualquer sessão do Claude Code neste repositório. Lê `specs/PRD.md`, `specs/ARCHITECTURE.md` e `specs/DATA_MODEL.md` antes de alterações estruturais.

## Visão geral do repositório

```
backend/     Laravel 13 (API) — PHP 8.4
frontend/    React 19 + TypeScript + Vite
docker/      Dockerfiles e configs (nginx, php, mysql, frontend)
specs/       PRD, arquitectura, modelo de dados, roadmap
.claude/     Este ficheiro e subagentes especializados
.github/     Workflows de CI
```

Dois módulos de negócio dentro do mesmo backend/frontend: **Gestão de Projectos** (`App\Models\Projects\*`, `App\Http\Controllers\Api\Projects\*`) e **Controlo de Software** (`App\Models\Infra\*`, `App\Http\Controllers\Api\Infra\*`). `App\Models\User` é partilhado pelos dois módulos. Não misturar entidades dos dois módulos no mesmo controller/pasta.

## Como correr o projecto

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --seed
```

Frontend em desenvolvimento: `http://localhost:5173` (Vite dev server, proxy `/api` → `app`). API: `http://localhost/api`. Mailhog: `http://localhost:8025`.

## Convenções de backend (Laravel)

- PHP 8.4 (requisito real do Laravel 13/Symfony 8, embora o pedido original fale em "8.3+" — `^8.4` está em conformidade), tipos estritos (`declare(strict_types=1)` em classes novas de `app/Services` e `app/Enums`).
- Controllers **finos**: recebem Form Request já validado, chamam Model/Service, devolvem API Resource. Nunca validação inline no controller.
- Um Form Request por acção (`StoreTaskRequest`, `UpdateTaskRequest`), nunca reutilizado entre store/update quando as regras diferem.
- Uma API Resource por modelo exposto; nunca devolver `Model::toJson()` directo numa rota.
- Policies para toda a autorização contextual; papéis globais (`admin`, `project_manager`, `infra`, `member`, `client_viewer`) via `spatie/laravel-permission`, nunca `if ($user->email === '...')`.
- Enums de domínio como PHP Enums nativos em `app/Enums` (ex.: `TaskPriority`, `TaskStatus`, `SoftwareEnvironment`), nunca strings mágicas espalhadas pelo código.
- Migrações: uma responsabilidade por migração, nomes descritivos (`create_tasks_table`, não `update_tables_2`). Nunca editar uma migração já mergeada em `main` — criar uma nova.
- Credenciais (`Credential.secret`) usam cast `encrypted`; nunca aparecem em `CredentialResource` por omissão, nunca em logs, nunca em mensagens de commit/PR.
- Testes: Feature tests para toda rota de API nova (autenticação incluída no request de teste via `Sanctum::actingAs`); Unit tests para lógica de serviço não trivial.
- `php artisan pint` antes de considerar uma alteração de backend terminada. `vendor/bin/phpstan analyse` deve passar (nível configurado em `phpstan.neon`).

## Convenções de frontend (React)

- TypeScript estrito (`strict: true`); evitar `any` — usar `unknown` + narrowing quando o tipo é genuinamente desconhecido.
- Estado de servidor **sempre** via TanStack Query (`useQuery`/`useMutation`); nunca `useEffect` + `fetch` + `useState` para dados vindos da API.
- Formulários **sempre** via React Hook Form + Zod resolver; mensagens de erro em português, junto ao campo.
- Componentes de UI genéricos em `frontend/src/components/ui` (design system interno); componentes de página/feature não devem reimplementar botões, inputs, etc.
- Um ficheiro de API por domínio em `frontend/src/api` (`tasks.ts`, `machines.ts`, ...), funções tipadas que devolvem os tipos de `frontend/src/types`.
- Nunca lógica de negócio duplicada entre frontend e backend — o frontend confia na resposta/validação da API; validação client-side é só UX (feedback imediato), nunca a única barreira.
- `npm run lint` e `npm run build` (que corre `tsc -b`) devem passar antes de considerar uma alteração de frontend terminada.

## Regras gerais (ambos os módulos)

- Não implementar nada listado em `specs/ROADMAP.md` como Fase 2/3 sem pedido explícito — registar a ideia no roadmap em vez de a construir "de passagem".
- Qualquer entidade nova do módulo de Controlo de Software que possa conter dados sensíveis (acessos, IPs, credenciais) segue o mesmo padrão de encriptação/auditoria já usado em `Credential`.
- Seeds de demonstração usam sempre os dados reais descritos em `specs/DATA_MODEL.md` / prompt original (`DemoInfraSeeder`) — não inventar clientes/máquinas fictícios adicionais sem marcar claramente como dados de exemplo.
- Mensagens de commit em português ou inglês consistente com o histórico existente; nunca incluir segredos/credenciais em commits.

## Subagentes disponíveis

Ver `.claude/agents/`: `backend-laravel`, `frontend-react`, `db-migrations`, `qa-reviewer`. Usa-os para separar trabalho de implementação por camada em vez de fazer tudo numa única sessão sem foco — cada um tem instruções e limites próprios no seu ficheiro.
