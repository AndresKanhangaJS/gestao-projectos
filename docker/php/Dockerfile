# syntax=docker/dockerfile:1

# Imagem PHP-FPM multi-stage:
#   base       - PHP 8.4 + extensoes (comum a dev e producao)
#   vendor     - composer install --no-dev (so para construir a imagem de producao)
#   production - codigo copiado para a imagem, sem ferramentas de build (docker-compose.prod.yml)
#   dev        - igual ao que existia antes, usada por docker-compose.yml com bind mounts
# A stage "dev" fica em ULTIMO para que um `docker build` sem --target continue a dar a imagem de dev.

FROM php:8.4-fpm-alpine AS base

RUN apk add --no-cache \
        libpng \
        libzip \
        oniguruma \
        icu-libs \
        freetype \
        libjpeg-turbo \
        libwebp \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        libpng-dev \
        libzip-dev \
        oniguruma-dev \
        icu-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libwebp-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /tmp/pear

WORKDIR /var/www/html

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]


# ---------------------------------------------------------------------------
# Dependencias de producao (sem require-dev), autoloader optimizado.
FROM base AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --no-progress

COPY backend/ ./
RUN composer dump-autoload --no-dev --optimize --no-interaction \
    && rm -rf tests .env .env.example bootstrap/cache/*.php


# ---------------------------------------------------------------------------
# Producao: codigo dentro da imagem (sem bind mount), sem git/composer/bash.
FROM base AS production

# fcgi: cliente FastCGI minimo para o healthcheck (ping do php-fpm).
RUN apk add --no-cache fcgi \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php/opcache-prod.ini /usr/local/etc/php/conf.d/99-zz-production.ini
COPY docker/php/fpm-production.conf /usr/local/etc/php-fpm.d/zz-production.conf

COPY --from=vendor /var/www/html /var/www/html

# Codigo pertence ao root (so leitura para o php-fpm); apenas storage e
# bootstrap/cache sao gravaveis pelo www-data.
RUN chown root:root /var/www/html && chmod 755 /var/www/html \
    && mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

# Valor por omissao seguro: sem APP_ENV explicito a imagem comporta-se como producao.
ENV APP_ENV=production

USER www-data


# ---------------------------------------------------------------------------
# Desenvolvimento (docker-compose.yml): comportamento inalterado.
FROM base AS dev

RUN apk add --no-cache bash git curl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --no-progress || true

COPY backend/ ./

RUN composer install --no-interaction --prefer-dist --no-progress \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
