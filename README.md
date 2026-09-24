# Gestão de Projectos & Controlo de Software — Level-Soft

Ferramenta interna da Level-Soft com dois módulos:

1. **Gestão de Projectos** — workspaces, projectos, quadros Kanban, sprints, tarefas/subtarefas, comentários.
2. **Controlo de Software** — inventário estruturado de clientes, produtos de software, módulos, máquinas/servidores, deployments, credenciais e políticas de backup (substitui o antigo documento manual de inventário).

Ver `specs/PRD.md`, `specs/ARCHITECTURE.md` e `specs/DATA_MODEL.md` para o desenho completo, e `.claude/CLAUDE.md` para as convenções de desenvolvimento.

## Stack

- **Backend**: Laravel 13 (PHP 8.4), Sanctum (auth SPA), spatie/laravel-permission (papéis/permissões), MySQL 8, Redis.
- **Frontend**: React 19 + TypeScript + Vite, TailwindCSS v4, TanStack Query, React Hook Form + Zod, dnd-kit.
- **Infra**: Docker + Docker Compose (nginx, php-fpm, mysql, redis, node/vite, mailhog).

## Arranque rápido (Docker)

Pré-requisito: Docker Desktop (ou equivalente) instalado e a correr. Não é necessário PHP/Node/Composer instalados na máquina — tudo corre em containers.

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --seed
```

Depois disto:

| Serviço | URL |
|---|---|
| Aplicação (frontend via nginx, com proxy para a API) | http://localhost |
| Frontend directo (Vite dev server, com HMR) | http://localhost:5173 |
| API | http://localhost/api |
| Mailhog (emails capturados em desenvolvimento) | http://localhost:8025 |
| MySQL (para ligar com um cliente externo, ex. HeidiSQL) | localhost:3306 |

O seeder (`php artisan migrate --seed`) cria:
- Papéis/permissões (`admin`, `project_manager`, `infra`, `member`, `client_viewer`).
- Quatro utilizadores de demonstração, um por papel principal (palavra-passe `password` em todos):

  | Email | Papel |
  |---|---|
  | admin@level-soft.local | admin |
  | infra@level-soft.local | infra |
  | gestor@level-soft.local | project_manager |
  | membro@level-soft.local | member |

- O inventário real de infraestrutura da Level-Soft (10 clientes, 10 produtos de software, 21 máquinas incluindo o servidor de backups, ~24 deployments) descrito em `specs/DATA_MODEL.md` (`DemoInfraSeeder`).
- Um workspace, projecto, quadro Kanban e 8 tarefas de exemplo no módulo de Gestão de Projectos (`ProjectsDemoSeeder`).

## Estrutura do repositório

```
backend/     Laravel 13 (API) — PHP 8.4
frontend/    React 19 + TypeScript + Vite
docker/      Dockerfiles e configs (nginx, php, frontend)
specs/       PRD, arquitectura, modelo de dados (ERD), roadmap
.claude/     Convenções do projecto e subagentes especializados
.github/     Workflows de CI (backend, frontend, build Docker)
```

## Desenvolvimento do dia-a-dia

Com os containers a correr (`docker compose up -d`):

```bash
# Backend
docker compose exec app php artisan migrate
docker compose exec app php artisan test
docker compose exec app php artisan pint
docker compose exec app vendor/bin/phpstan analyse
docker compose exec app php artisan tinker

# Frontend
docker compose exec frontend npm run lint
docker compose exec frontend npm run test
docker compose exec frontend npm run build
```

Alterações a `backend/` e `frontend/` reflectem-se automaticamente nos containers (bind mounts) — não é preciso reconstruir a imagem para editar código, só para alterar dependências (`composer.json`/`package.json`) ou os próprios Dockerfiles.

## Testes e qualidade

- Backend: `php artisan test` (PHPUnit/Pest), `vendor/bin/pint` (estilo PSR-12), `vendor/bin/phpstan analyse` (análise estática).
- Frontend: `npm run test` (Vitest + Testing Library), `npm run lint` (ESLint), `npm run build` (inclui `tsc -b`).

## CI/CD

Ver `.github/workflows/`:
- `backend-ci.yml` — Pint, Larastan, PHPUnit, em push/PR que toquem `backend/**`.
- `frontend-ci.yml` — ESLint, Vitest, build, em push/PR que toquem `frontend/**`.
- `docker-build.yml` — valida `docker compose build` em push/PR.

Deploy automatizado para o servidor da Level-Soft é um item de Fase 2 — ver `specs/ROADMAP.md`.

## Segurança de credenciais

Credenciais de infraestrutura (`Credential.secret`) são guardadas encriptadas (`encrypted` cast do Laravel) e **nunca** aparecem em texto simples em respostas de API por omissão. Só são reveladas através de um endpoint dedicado (`POST /api/infra/credentials/{id}/reveal`), restrito aos papéis `admin`/`infra`, e cada acesso fica registado em `credential_access_logs`.

## Notas para Windows / Laragon

Este repositório foi desenvolvido num ambiente Windows com Laragon. O PHP/Node instalados globalmente na máquina podem estar desactualizados face aos requisitos deste projecto (PHP 8.4, Node 20) — por isso todo o fluxo de trabalho assume Docker, não instalações locais. Se usar Git Bash e precisar de correr `docker run` pontualmente com bind mounts, defina `MSYS_NO_PATHCONV=1` antes do comando para evitar que o Git Bash reescreva os caminhos estilo Unix.
