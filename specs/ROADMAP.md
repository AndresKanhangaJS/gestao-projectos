# Roadmap

## Fase 1 — MVP (âmbito deste documento de implementação inicial)

Ver `PRD.md` §4. Entregue nesta ronda de trabalho — checklist de aceitação em `PRD.md` §6 e no `README.md`.

## Fase 2 — Gestão de Projectos avançada

- Vista de Gantt/Timeline e vista de Calendário para tarefas e sprints.
- Automações "quando X então Y" (ex.: mover para "Concluído" quando todas as subtarefas fecham; notificar responsável ao aproximar-se o prazo).
- Registo de tempo (time tracking) por tarefa, com relatórios de horas por projecto/pessoa.
- Relatórios avançados: burndown chart, velocidade do sprint, cumulative flow diagram.
- Campos customizados por projecto (à semelhança do ClickUp).
- Notificações em tempo real via WebSockets (Laravel Reverb + Laravel Echo) e emails transaccionais.
- Integrações externas: Slack, email de entrada, webhooks de saída.
- Templates de projecto reutilizáveis.

## Fase 2 — Controlo de Software avançado

- Verificação automática periódica do estado dos deployments (health check agendado, actualiza `last_checked_at` e `status` sozinho).
- Rotação/expiração de credenciais com alertas.
- Integração com um cofre externo (ex. HashiCorp Vault ou Bitwarden Secrets Manager) em vez de encriptação apenas ao nível da base de dados, caso a equipa/infra cresça.
- Execução de backups orquestrada pelo próprio sistema (hoje é só registo da política, não execução).
- Gráfico/mapa visual da topologia de máquinas e deployments.

## CI/CD — evolução

**Fase 1 (implementado):**
- `backend-ci.yml`: Pint (lint), Larastan (análise estática), PHPUnit (testes), em push/PR.
- `frontend-ci.yml`: ESLint, `tsc --noEmit`, Vitest, `vite build`, em push/PR.
- `docker-build.yml`: valida `docker compose build` em push para `main`.

**Fase 2:**
- Deploy automático para o servidor interno (self-hosted GitHub Actions runner na rede da Level-Soft, ou webhook + script de pull/rebuild) após merge em `main`, com aprovação manual (environment protection rule).
- Publicação de imagens Docker versionadas num registry privado (ex. GitHub Container Registry) em vez de build local no servidor.
- Migrações de base de dados como passo explícito e reversível do pipeline de deploy (`migrate --force` com plano de rollback documentado).
- Testes de fumo pós-deploy (smoke tests) a correr contra o ambiente real após cada deploy.

## Fase 3 — ideias em aberto (não compromissadas)

- App mobile ou PWA para consulta rápida de tarefas/estado de infraestrutura em campo.
- SSO corporativo (se a Level-Soft vier a adoptar um IdP).
- Exportação de relatórios em PDF/Excel.
