# PRD — Software de Gestão de Projectos & Controlo de Software (Level-Soft)

## 1. Visão

Ferramenta interna da Level-Soft que substitui (a) o uso disperso de ferramentas de gestão de tarefas e (b) o documento manual "Documentação das Máquinas no Servidor", por uma única plataforma web, auto-hospedada em Docker na infraestrutura da própria empresa.

Dois módulos, um só produto:

1. **Gestão de Projectos** — equivalente funcional a Jira + ClickUp + Asana para o essencial: workspaces, projectos, quadros Kanban, sprints, tarefas/subtarefas, comentários, prioridades.
2. **Controlo de Software** — inventário estruturado e pesquisável de clientes, produtos de software, módulos, instâncias por cliente, máquinas/servidores, deployments, credenciais e políticas de backup.

## 2. Problema

- O inventário de infraestrutura vive num documento Word/PDF estático, actualizado manualmente, sem histórico, sem pesquisa, sem controlo de acesso a credenciais.
- Não existe centralização do processo de deploy: parte dos sistemas corre em Docker, parte depende de execução manual (`php artisan serve`, `ng serve`) em máquinas Windows via acesso remoto.
- Não há ambiente de testes padronizado (apenas a Máquina 20 está dedicada a isso).
- A gestão de tarefas de desenvolvimento está fragmentada, sem um sistema único que ligue tarefas de projecto às instâncias de software que as originam.

## 3. Utilizadores-alvo e papéis

| Papel | Descrição | Acesso a credenciais |
|---|---|---|
| **Admin** | Gestão total do sistema, utilizadores, papéis, todas as entidades | Sim, com log de acesso |
| **Gestor de Projecto** | Cria/gere workspaces, projectos, sprints; gere equipa | Não |
| **Infra** | Gere Controlo de Software (máquinas, deployments, credenciais) | Sim, com log de acesso |
| **Membro** | Trabalha em tarefas atribuídas, comenta, actualiza estados | Não |
| **Cliente/Visualizador** | Acesso de leitura a projectos/tarefas partilhados com ele | Não |

Um utilizador pode ter mais do que um papel (via spatie/laravel-permission), com permissões refinadas ao nível de workspace/projecto.

## 4. Âmbito da Fase 1 (MVP)

Ver secções 4 e 5 do prompt original para a lista detalhada de funcionalidades. Resumo dos critérios de aceitação:

- Autenticação (registo/login/logout) via Sanctum (SPA cookie-based).
- Workspaces → Projectos → Quadros com colunas customizáveis.
- Tarefas com subtarefas, responsáveis múltiplos, etiquetas, comentários, relações (bloqueia/relacionada/duplica), anexos, watchers, histórico de actividade.
- Sprints com backlog do projecto vs backlog do sprint.
- Vistas Kanban (drag-and-drop), Lista, Backlog.
- Dashboard com contagens por estado/prioridade/atrasos/carga por responsável.
- Notificações in-app.
- Pesquisa simples por título/descrição/etiqueta.
- Controlo de Software: CRUD completo de Clientes, Produtos de Software, Módulos, instâncias Cliente↔Software (+ módulos activos), Máquinas, Deployments, Credenciais (encriptadas, acesso restrito e auditado), Políticas de Backup.
- Vistas cruzadas: por Cliente, por Software, por Máquina.
- Alertas: máquinas em ambiente "Tradicional", softwares sem backup, deployments sem verificação recente.
- Seed com os dados reais do inventário actual (secção 3 do prompt original).

## 5. Fora de âmbito da Fase 1

Ver `ROADMAP.md`: Gantt/Calendário, automações, time tracking, relatórios avançados (burndown/velocity/CFD), campos customizados, WebSockets/tempo real, integrações externas, templates de projecto.

## 6. Métricas de sucesso do MVP

- 100% do inventário actual (20 máquinas numeradas + computador de backups = 21 registos, clientes e softwares da secção 3) representado no sistema e consultável em < 3 cliques.
- Um utilizador consegue criar um projecto, um quadro e mover uma tarefa entre colunas sem consultar documentação.
- Nenhuma credencial de infraestrutura visível em texto simples em resposta de API ou ecrã sem pedido explícito e permissão adequada.
- `docker compose up -d --build` deixa o sistema operacional sem passos manuais adicionais além de `migrate --seed`.

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração de dados reais do inventário para o seeder introduzir erros | Seeder revisto linha a linha contra a tabela da secção 3 do prompt; nomes de máquinas/clientes/softwares como constantes nomeadas, não strings soltas |
| Exposição acidental de credenciais | Cast `encrypted` nos campos sensíveis, nunca incluídos em API Resources por omissão, campo só devolvido num endpoint dedicado com policy própria e log de auditoria |
| Complexidade do Kanban drag-and-drop | `dnd-kit` com optimistic update + rollback em caso de erro da API |
| Scope creep para features de Fase 2 | `ROADMAP.md` como fronteira explícita; qualquer pedido de feature de Fase 2 durante a Fase 1 é registado no roadmap, não implementado |
