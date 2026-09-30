# Guia de deploy em produção (servidor interno Level-Soft)

Este guia descreve, passo a passo, como pôr a aplicação **Gestão de Projectos & Controlo de Software** a correr num servidor interno com Docker, como a actualizar, e como fazer e restaurar backups.

A stack de produção está em `docker-compose.prod.yml` e é **independente** do `docker-compose.yml` de desenvolvimento (que continua a servir só para desenvolver: Vite, bind mounts, Mailhog).

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Requisitos do servidor](#2-requisitos-do-servidor)
3. [Primeira instalação](#3-primeira-instalação)
4. [Verificar a saúde da aplicação](#4-verificar-a-saúde-da-aplicação)
5. [Actualizar para uma nova versão](#5-actualizar-para-uma-nova-versão)
6. [Backups e restauro](#6-backups-e-restauro)
7. [Logs](#7-logs)
8. [Servidor atrás de um reverse proxy](#8-servidor-atrás-de-um-reverse-proxy)
9. [Resolução de problemas](#9-resolução-de-problemas)
10. [Checklist de segurança](#10-checklist-de-segurança)

---

## 1. Arquitectura

| Serviço | Imagem | Função |
|---|---|---|
| `web` | `gestao-projectos/web` (nginx + build estático da SPA, Node 24) | Portas 80/443. Serve a SPA, redirecciona HTTP para HTTPS, encaminha `/api`, `/sanctum` e `/up` para o php-fpm. |
| `app` | `gestao-projectos/app` (PHP 8.4 FPM, código dentro da imagem) | API Laravel. No arranque faz `config:cache`, `route:cache`, `view:cache`, `event:cache` e (se `RUN_MIGRATIONS=true`) `migrate --force`. |
| `queue` | mesma imagem que `app` | `php artisan queue:work` (notificações por email, etc.). |
| `scheduler` | mesma imagem que `app` | `php artisan schedule:work`. |
| `mysql` | `mysql:8.0` | Base de dados. **Sem portas expostas ao host.** |
| `redis` | `redis:7-alpine` | Cache e filas, com password. **Sem portas expostas ao host.** |
| `backup` | `gestao-projectos/backup` (baseada em `mysql:8.0`) | Backup diário da BD e dos anexos para `./backups`. |

Volumes nomeados (persistem entre actualizações): `gestao-prod_mysql_data`, `gestao-prod_redis_data`, `gestao-prod_app_storage` (anexos das tarefas em `storage/app/private`).

O MySQL e o Redis estão numa rede Docker interna (`data`, sem acesso ao exterior). Os anexos são privados: o nginx **não** serve `/storage/`; os ficheiros só saem pelo endpoint autenticado da API.

**Configuração separada por serviço.** Toda a configuração está num único ficheiro, `.env.production`, mas cada serviço só recebe o que precisa:

| Serviço | Recebe |
|---|---|
| `app`, `queue`, `scheduler` | o `.env.production` inteiro (`APP_KEY`, `DB_*`, `REDIS_*`, `MAIL_*`, ...) |
| `mysql` | `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` (derivadas das `DB_*`) e `TZ` |
| `redis` | `REDIS_PASSWORD` |
| `backup` | `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_ROOT_PASSWORD`, `BACKUP_*` e `TZ` |
| `web` | nada (só ficheiros estáticos e certificados) |

Isto é feito por interpolação (`${DB_PASSWORD}`) no `docker-compose.prod.yml`, por isso **todos os comandos levam `--env-file .env.production`** (ver secção 3). A `APP_KEY` e as credenciais de email nunca chegam aos contentores `mysql`, `redis` e `backup`.

O projecto Compose chama-se sempre `gestao-prod` (definido no próprio ficheiro), por isso nunca colide com um ambiente de desenvolvimento na mesma máquina.

## 2. Requisitos do servidor

- Linux x86_64 (ex. Ubuntu Server 22.04/24.04 LTS, Debian 12, Rocky/Alma 9).
- **Docker Engine 24+** e **Docker Compose v2** (plugin `docker compose`, não o antigo `docker-compose`). Verificar com `docker version` e `docker compose version` (2.24 ou superior).
- `git` e `openssl`.
- Recursos mínimos: **2 vCPU, 4 GB RAM** (recomendado 4 GB ou mais, o MySQL usa cerca de 500 MB a 1 GB), **20 GB de disco livre** para imagens, BD, anexos e backups (a pasta `backups` cresce com a retenção configurada).
- Um nome DNS interno para a aplicação (ex. `gestao.level-soft.local`) a apontar para o IP do servidor.
- Firewall: abrir só **80/tcp e 443/tcp** (mais SSH para administração).

## 3. Primeira instalação

Todos os comandos são executados na pasta do repositório no servidor e começam sempre por:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ...
```

O `--env-file .env.production` é obrigatório: sem ele o Compose pára com uma mensagem como `DB_PASSWORD em falta. Use --env-file .env.production` (não arranca nada com configuração incompleta). Para escrever menos, pode definir um alias na sessão (ou no `~/.bashrc` do utilizador de administração):

```bash
alias dcp='docker compose --env-file .env.production -f docker-compose.prod.yml'
dcp ps
```

Neste guia os comandos aparecem sempre por extenso, para poderem ser copiados tal como estão.

### 3.1 Clonar o repositório

```bash
sudo mkdir -p /opt/gestao-projectos && sudo chown "$USER" /opt/gestao-projectos
git clone https://github.com/AndresKanhangaJS/gestao-projectos.git /opt/gestao-projectos
cd /opt/gestao-projectos
git checkout main     # ou a tag/branch aprovada para produção
```

### 3.2 Criar `.env.production`

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Editar `.env.production` e preencher, no mínimo:

| Variável | O que pôr |
|---|---|
| `APP_URL`, `FRONTEND_URL` | `https://<domínio>` (ex. `https://gestao.level-soft.local`) |
| `SANCTUM_STATEFUL_DOMAINS` | o domínio **exactamente** como os utilizadores o escrevem no browser, sem `https://` (acrescentar `:porta` se não for a 443). Vários separados por vírgula. |
| `CORS_ALLOWED_ORIGINS` | `https://<domínio>` |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `REDIS_PASSWORD` | passwords fortes e diferentes |
| `MAIL_*` | servidor SMTP real da Level-Soft |
| `BACKUP_HOUR`, `BACKUP_MINUTE`, `BACKUP_RETENTION_DAYS` | hora do backup diário e dias de retenção |

Gerar passwords fortes (sem caracteres que o Compose interprete, como `$` ou aspas):

```bash
openssl rand -base64 48 | tr -d '/+=' | cut -c1-32
```

Confirmar que ficam `APP_ENV=production`, `APP_DEBUG=false`, `SEED_DEMO_DATA=false`, `AUTH_REGISTRATION_ENABLED=false` e `RUN_MIGRATIONS=true`.

**Registo público.** Com `AUTH_REGISTRATION_ENABLED=false` (por omissão) ninguém consegue criar conta sozinho: `POST /api/register` devolve 403, o ecrã de entrada não mostra a ligação "Registar" e `/register` explica que as contas são criadas pelo administrador. Só se for mesmo necessário abrir o registo (as contas criadas assim ficam com o papel `member`), pôr `AUTH_REGISTRATION_ENABLED=true` e recriar os contentores com `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`.

> As passwords da BD são usadas para **inicializar** o MySQL no primeiro arranque. Mudá-las depois no ficheiro não altera as contas já criadas dentro do MySQL.

### 3.3 Gerar a `APP_KEY`

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --show
```

Copiar o valor devolvido (`base64:...`) para `APP_KEY=` em `.env.production`.

> **Guardar a `APP_KEY` num cofre de passwords.** As credenciais de infraestrutura (`Credential.secret`) são encriptadas com esta chave: sem ela, um backup restaurado noutro servidor não consegue desencriptar os segredos. Nunca mudar a chave num sistema já em uso.

### 3.4 Certificados TLS

O nginx espera dois ficheiros em `docker/nginx/certs/` (a pasta está no `.gitignore`, os certificados nunca vão para o git):

- `fullchain.pem`: certificado do servidor seguido dos certificados intermédios da CA;
- `privkey.pem`: chave privada (sem password).

**Opção A: certificado da CA interna da Level-Soft (recomendado).**

1. Gerar a chave e o pedido de certificado (CSR) no servidor:

   ```bash
   cd docker/nginx/certs
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout privkey.pem -out gestao.csr \
     -subj "/CN=gestao.level-soft.local" \
     -addext "subjectAltName=DNS:gestao.level-soft.local"
   chmod 600 privkey.pem
   ```

2. Enviar `gestao.csr` à equipa que gere a CA interna.
3. Juntar o certificado recebido e a cadeia intermédia num único ficheiro:

   ```bash
   cat gestao.crt intermedia.crt > fullchain.pem
   cd ../../..
   ```

   Os postos de trabalho já confiam na CA interna (GPO/MDM), por isso o browser não mostra avisos.

**Opção B: certificado autoassinado (apenas para testes).**

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout docker/nginx/certs/privkey.pem \
  -out docker/nginx/certs/fullchain.pem \
  -subj "/CN=gestao.level-soft.local" \
  -addext "subjectAltName=DNS:gestao.level-soft.local,DNS:localhost,IP:127.0.0.1"
chmod 600 docker/nginx/certs/privkey.pem
```

O browser vai mostrar um aviso de segurança; não usar em produção real.

Para renovar um certificado: substituir os dois ficheiros e correr `docker compose --env-file .env.production -f docker-compose.prod.yml restart web`.

### 3.5 Construir e arrancar

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

O primeiro arranque demora alguns minutos (build das imagens e inicialização do MySQL). Com `RUN_MIGRATIONS=true` o contentor `app` corre `php artisan migrate --force` antes de arrancar o php-fpm. Esperar que `mysql`, `redis`, `app` e `web` estejam `healthy`.

Para versionar as imagens, definir `APP_VERSION` antes do build (por omissão `latest`):

```bash
APP_VERSION=$(git describe --tags --always) docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Portas diferentes de 80/443 (ex. servidor partilhado): `HTTP_PORT=8080 HTTPS_PORT=8443 docker compose --env-file .env.production -f docker-compose.prod.yml up -d`. Estas variáveis (e `APP_VERSION`, `BACKUP_PATH`) podem também ficar no próprio `.env.production` (ex. `HTTPS_PORT=8443`); as que forem passadas no shell têm prioridade. Com `--env-file`, um eventual ficheiro `.env` na raiz **não** é lido.

### 3.6 Papéis e permissões

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan db:seed --force
```

Em produção (sem `SEED_DEMO_DATA=true`) o seeder **só** cria os papéis (`admin`, `project_manager`, `infra`, `member`, `client_viewer`) e permissões. Não cria utilizadores demo nem dados de demonstração. É idempotente (pode voltar a correr-se).

### 3.7 Criar o primeiro administrador

Modo interactivo (a palavra-passe é pedida de forma escondida, com confirmação):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan app:create-admin
```

Ou por opções (útil em scripts; atenção que a palavra-passe fica no histórico da shell):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan app:create-admin \
  --name="Nome Apelido" --email=nome@level-soft.local --password='...' [--force-change]
```

`--force-change` obriga a mudar a palavra-passe no primeiro login (útil quando se cria a conta para outra pessoa). O comando falha se o email já existir. Os restantes utilizadores são criados pelo admin na própria aplicação (Administração > Utilizadores).

## 4. Verificar a saúde da aplicação

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps                      # todos Up / healthy
curl -k https://gestao.level-soft.local/up                         # 200, "Application up"
curl -kI https://gestao.level-soft.local/                          # 200 + cabeçalhos de segurança
curl -I  http://gestao.level-soft.local/                           # 301 para https://
curl -k https://gestao.level-soft.local/api/auth/options           # {"registration_enabled":false}
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan about --only=environment
```

Em `about` confirmar `Environment: production` e `Debug Mode: OFF`. No browser, abrir `https://<domínio>`, entrar com o admin e confirmar que o dashboard carrega.

Confirmar que a BD e o Redis **não** têm portas abertas no host:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml port mysql 3306   # não deve devolver nada
ss -tlnp | grep -E ':(3306|6379)\b'                          # não deve devolver nada
```

Confirmar que a `APP_KEY` só está nos contentores da aplicação (deve aparecer "tem APP_KEY" apenas em `app`, `queue` e `scheduler`):

```bash
for c in $(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q); do
  printf '%s: ' "$(docker inspect -f '{{.Name}}' "$c")"
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$c" | grep -q '^APP_KEY=' && echo "tem APP_KEY" || echo "sem APP_KEY"
done
```

## 5. Actualizar para uma nova versão

```bash
cd /opt/gestao-projectos
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup /backup.sh     # backup antes de actualizar
git fetch --tags && git pull                                             # ou git checkout <tag>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Com `RUN_MIGRATIONS=true` as migrações correm automaticamente quando o novo contentor `app` arranca. Se preferir controlar as migrações manualmente, pôr `RUN_MIGRATIONS=false` e correr, depois do `up`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
```

Os caches de configuração/rotas são regenerados em cada arranque. Depois de mudar apenas `.env.production` basta `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` (recria os contentores afectados). Se `.env.production` mudar, os workers da fila também são recriados; para forçar a recarga do código dos workers sem recriar: `docker compose --env-file .env.production -f docker-compose.prod.yml exec queue php artisan queue:restart`.

Voltar a uma versão anterior: `git checkout <tag-anterior>` e `up -d --build`. Se a nova versão tiver migrações, restaurar o backup feito antes da actualização (ver secção 6), porque as migrações não são revertidas automaticamente.

Limpar imagens antigas de vez em quando: `docker image prune -f`.

## 6. Backups e restauro

### 6.1 O que é guardado

O serviço `backup` corre todos os dias à hora `BACKUP_HOUR:BACKUP_MINUTE` (fuso `TZ`, por omissão Africa/Luanda) e cria em `./backups` (pasta do repositório; outra pasta com `BACKUP_PATH=/caminho`):

- `db_<bd>_<AAAA-MM-DD_HHMMSS>.sql.gz`: `mysqldump --single-transaction --routines --triggers --events` comprimido;
- `storage_<AAAA-MM-DD_HHMMSS>.tar.gz`: `storage/app` (anexos das tarefas);
- `backup.log`: registo de sucesso/erro de cada execução.

Ficheiros com mais de `BACKUP_RETENTION_DAYS` dias (por omissão 14) são apagados automaticamente.

Backup manual a qualquer momento:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup /backup.sh
ls -lh backups/
tail backups/backup.log
```

### 6.2 Copiar os backups para fora do servidor

Um backup que só existe no próprio servidor não protege contra a perda do disco. Copiar diariamente `./backups` para outra máquina, por exemplo para o servidor de backups da Level-Soft, com `rsync` sobre SSH num cron do host (depois da hora do backup):

```bash
# crontab -e (utilizador com chave SSH para o servidor de backups)
30 3 * * * rsync -a --delete-after /opt/gestao-projectos/backups/ backup@servidor-backups:/srv/backups/gestao-projectos/
```

Alternativas: montar uma partilha NFS/SMB e apontar `BACKUP_PATH` para ela, ou incluir a pasta na ferramenta de backup corporativa já existente. Guardar também `.env.production` (em especial a `APP_KEY`) num cofre de passwords: sem a chave os segredos das credenciais num backup restaurado ficam ilegíveis.

Testar um restauro pelo menos uma vez por trimestre (idealmente num servidor de testes).

### 6.3 Restaurar

O restauro **apaga** a base de dados actual e substitui-a pelo backup (e, se indicado, substitui os anexos).

```bash
# 1. Parar a aplicação (a BD continua a correr)
docker compose --env-file .env.production -f docker-compose.prod.yml stop web app queue scheduler

# 2. Ver os backups disponíveis
ls -lh backups/

# 3. Restaurar (pede para escrever o nome da BD como confirmação)
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup /restore.sh \
  db_gestao_projectos_2026-09-25_020000.sql.gz storage_2026-09-25_020000.tar.gz

# 4. Voltar a arrancar
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

O segundo argumento (storage) é opcional. Para restaurar noutro servidor: instalar como na secção 3 **com a mesma `APP_KEY`**, copiar os ficheiros para `./backups` e seguir os passos acima.

## 7. Logs

Todos os serviços escrevem para stdout/stderr e o Docker faz a rotação (10 MB x 5 ficheiros por contentor, configurado em `docker-compose.prod.yml`).

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=100 app      # erros do Laravel/php-fpm
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web                 # acessos e erros do nginx
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 queue scheduler
docker compose --env-file .env.production -f docker-compose.prod.yml logs backup                 # agendador de backups
cat backups/backup.log
```

O nível de log do Laravel é `LOG_LEVEL=warning`. Para diagnóstico temporário pode passar a `info` ou `debug` (e `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`), mas **nunca** activar `APP_DEBUG=true` em produção.

## 8. Servidor atrás de um reverse proxy

Se o servidor estiver atrás de um reverse proxy/balanceador que já termina o TLS (ex. um nginx/HAProxy/F5 corporativo):

1. Em `docker-compose.prod.yml`, no serviço `web`:
   - descomentar `- ./docker/nginx/prod-behind-proxy.conf:/etc/nginx/conf.d/default.conf:ro`;
   - remover o volume dos certificados e o mapeamento `443`; manter `80` (idealmente só acessível pelo proxy, ex. `"10.0.0.5:80:80"` ou firewall).
2. Em `docker/nginx/prod-behind-proxy.conf`, ajustar `set_real_ip_from` ao IP/rede do proxy.
3. O proxy tem de encaminhar para `http://<servidor>:80` com os cabeçalhos `Host` (original), `X-Forwarded-Proto: https` e `X-Forwarded-For`.
4. `APP_URL`, `SANCTUM_STATEFUL_DOMAINS` e `CORS_ALLOWED_ORIGINS` usam o domínio público servido pelo proxy.

## 9. Resolução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Login devolve **419** ("Sessão indisponível" ou "CSRF token mismatch") | O domínio do browser não está em `SANCTUM_STATEFUL_DOMAINS` (ex. acesso por IP ou com porta), ou `SESSION_DOMAIN` não corresponde ao domínio. | Pôr em `SANCTUM_STATEFUL_DOMAINS` o host exacto (com `:porta` se não for 443); deixar `SESSION_DOMAIN` vazio; `up -d`; limpar cookies do browser. Aceder sempre pelo nome configurado, não pelo IP. |
| Login funciona mas a sessão "cai" logo a seguir | Acesso por `http://` com `SESSION_SECURE_COOKIE=true` (cookie só é enviado em HTTPS). | Usar sempre `https://`. Atrás de proxy, confirmar `X-Forwarded-Proto: https`. |
| `docker compose` pára com "DB_PASSWORD em falta. Use --env-file .env.production" (ou `DB_DATABASE`, `REDIS_PASSWORD`, ...) | Comando sem `--env-file .env.production`, ou variável vazia no ficheiro. | Usar sempre `docker compose --env-file .env.production -f docker-compose.prod.yml ...` (secção 3) e preencher a variável. |
| Registo devolve 403 "O registo público está desactivado" | Comportamento esperado com `AUTH_REGISTRATION_ENABLED=false`. | Criar a conta em Administração > Utilizadores. Só abrir o registo se for mesmo necessário (secção 3.2). |
| Contentor `app` reinicia em ciclo com "APP_KEY nao esta definida" | `APP_KEY` vazia em `.env.production`. | Gerar a chave (secção 3.3) e `up -d`. |
| Erro **500** em todos os pedidos | Configuração inválida, BD inacessível ou APP_KEY errada. | `docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 app`. |
| Erros "Permission denied" em `storage/` | Ficheiros no volume criados por outro utilizador (ex. restauro manual). | `docker compose --env-file .env.production -f docker-compose.prod.yml exec -u root app chown -R www-data:www-data storage` |
| `web` não arranca: "cannot load certificate" | Faltam `fullchain.pem`/`privkey.pem` em `docker/nginx/certs`. | Ver secção 3.4. |
| `mysql` unhealthy no primeiro arranque | Inicialização ainda a decorrer, ou falta alguma variável `DB_*`. | `docker compose --env-file .env.production -f docker-compose.prod.yml logs mysql`. |
| Upload de anexo falha com 413 | Ficheiro acima do limite. | A API aceita até 10 MB por anexo; o nginx/PHP aceitam até 25 MB por pedido. |
| Emails não chegam | SMTP mal configurado ou contentor `queue` parado. | `logs queue`; confirmar `MAIL_*`; testar com `exec app php artisan tinker`. |
| Alterações ao `.env.production` não têm efeito | Os contentores leem o ficheiro ao serem criados. | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` (recria os contentores alterados). |

## 10. Checklist de segurança

- [ ] `APP_ENV=production` e `APP_DEBUG=false` (confirmar com `php artisan about`).
- [ ] `SEED_DEMO_DATA=false`; não existem contas `@level-soft.local` com password `password`.
- [ ] Passwords fortes e únicas para `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `REDIS_PASSWORD` e para o admin.
- [ ] `.env.production` com permissões `600`, fora do git, e `APP_KEY` guardada num cofre.
- [ ] MySQL e Redis sem portas publicadas no host (secção 4).
- [ ] Firewall do servidor só com 80/443 (e SSH restrito à rede de administração).
- [ ] Certificado da CA interna (não autoassinado) e dentro da validade.
- [ ] `SESSION_SECURE_COOKIE=true` e acesso só por HTTPS.
- [ ] Backups a correr (`backups/backup.log`) e copiados para fora do servidor; restauro testado.
- [ ] Registo público fechado: `AUTH_REGISTRATION_ENABLED=false` (por omissão) e `GET /api/auth/options` devolve `{"registration_enabled":false}`. Só ligar se houver uma razão concreta (secção 3.2).
- [ ] `APP_KEY` e `MAIL_*` só nos contentores `app`, `queue` e `scheduler` (verificação na secção 4).
- [ ] Actualizar o sistema operativo e o Docker do servidor regularmente; reconstruir as imagens (`docker compose --env-file .env.production -f docker-compose.prod.yml build --pull` e `up -d`) para receber correcções de segurança das imagens base.
