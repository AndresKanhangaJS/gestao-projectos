#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Producao (APP_ENV=production): nada de .env.example nem chave gerada
# automaticamente; configuracao vem das variaveis de ambiente (.env.production).
# ---------------------------------------------------------------------------
if [ "${APP_ENV:-}" = "production" ]; then
    # Gerar a chave e a unica operacao que tem de funcionar SEM APP_KEY:
    #   docker compose -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --show
    case "$*" in
        "php artisan key:generate"*) exec "$@" ;;
    esac

    if [ -z "${APP_KEY:-}" ]; then
        echo "ERRO: APP_KEY nao esta definida em .env.production." >&2
        echo "Gere uma chave com:" >&2
        echo "  docker compose -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --show" >&2
        echo "e copie o valor (base64:...) para APP_KEY em .env.production." >&2
        exit 1
    fi

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache

    # Migracoes apenas no processo principal (php-fpm) e so quando pedido;
    # queue/scheduler e comandos pontuais (`run --rm`) nunca migram.
    if [ "$1" = "php-fpm" ] && [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
        php artisan migrate --force
    fi

    exec "$@"
fi

# ---------------------------------------------------------------------------
# Desenvolvimento (comportamento original).
# ---------------------------------------------------------------------------
if [ ! -f /var/www/html/vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist --no-progress
fi

if [ ! -f /var/www/html/.env ] && [ -f /var/www/html/.env.example ]; then
    cp /var/www/html/.env.example /var/www/html/.env
    php artisan key:generate --force
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

exec "$@"
