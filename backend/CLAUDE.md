# backend/ — instruções para agentes

As convenções deste projecto estão em [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md) — lê esse ficheiro primeiro.

- Não instales PHP/Composer no host nem adiciones `laravel/boost`: todo o fluxo corre em Docker.
- Comandos: `docker compose exec -T app php artisan ...`, `docker compose exec -T app vendor/bin/pint`, `docker compose exec -T app vendor/bin/phpstan analyse`.
- Nunca corras `migrate:fresh`/`db:wipe` contra a BD de desenvolvimento; os testes usam SQLite em memória (forçado em `phpunit.xml`).
