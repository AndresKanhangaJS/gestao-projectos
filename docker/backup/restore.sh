#!/usr/bin/env bash
# Restauro da BD e (opcionalmente) dos ficheiros de storage a partir de /backups.
# SUBSTITUI os dados actuais. Parar primeiro app/queue/scheduler (ver docs/DEPLOY.md).
#
# Uso:
#   docker compose -f docker-compose.prod.yml run --rm backup /restore.sh db_<bd>_<data>.sql.gz [storage_<data>.tar.gz]
set -euo pipefail
source /usr/local/lib/backup-common.sh

if [ $# -lt 1 ]; then
    echo "Uso: /restore.sh <ficheiro_db.sql.gz> [ficheiro_storage.tar.gz]"
    echo "Backups disponiveis em ${BACKUP_DIR}:"
    ls -1t "$BACKUP_DIR" 2>/dev/null | grep -E '^(db_|storage_)' | head -20 || true
    exit 1
fi

resolve() {
    case "$1" in
        /*) echo "$1" ;;
        *) echo "${BACKUP_DIR}/$1" ;;
    esac
}

DB_FILE="$(resolve "$1")"
STORAGE_FILE=""
[ $# -ge 2 ] && STORAGE_FILE="$(resolve "$2")"

[ -f "$DB_FILE" ] || fail "Ficheiro nao encontrado: $DB_FILE"
gzip -t "$DB_FILE" || fail "Ficheiro de dump corrompido: $DB_FILE"
dump_db="$(gunzip -c "$DB_FILE" | grep -m1 '^CREATE DATABASE' | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
[ "$dump_db" = "$DB_DATABASE" ] || fail "O dump e da base de dados '${dump_db:-?}', nao de '${DB_DATABASE}'."
if [ -n "$STORAGE_FILE" ]; then
    [ -f "$STORAGE_FILE" ] || fail "Ficheiro nao encontrado: $STORAGE_FILE"
    gzip -t "$STORAGE_FILE" || fail "Arquivo de storage corrompido: $STORAGE_FILE"
fi

echo "ATENCAO: a base de dados '${DB_DATABASE}' vai ser APAGADA e substituida por:"
echo "  $(basename "$DB_FILE")"
[ -n "$STORAGE_FILE" ] && echo "e os ficheiros de storage/app substituidos por: $(basename "$STORAGE_FILE")"
echo "Esta operacao nao pode ser desfeita."
printf 'Para confirmar escreva o nome da base de dados (%s): ' "$DB_DATABASE"
read -r answer || answer=""
[ "$answer" = "$DB_DATABASE" ] || fail "Restauro cancelado (confirmacao nao coincide)."

DEFAULTS="$(mysql_defaults_file)"
trap 'rm -f "$DEFAULTS"' EXIT

log "Restauro da BD a partir de $(basename "$DB_FILE")."
# O dump (mysqldump --databases) inclui CREATE DATABASE + USE com o charset original.
# As permissoes do utilizador da aplicacao (DB_USERNAME) sobre a BD mantem-se apos o DROP.
mysql --defaults-extra-file="$DEFAULTS" -e "DROP DATABASE IF EXISTS \`${DB_DATABASE}\`;"
gunzip -c "$DB_FILE" | mysql --defaults-extra-file="$DEFAULTS" || fail "Importacao do dump falhou."
log "BD restaurada."

if [ -n "$STORAGE_FILE" ]; then
    log "Restauro do storage a partir de $(basename "$STORAGE_FILE")."
    rm -rf "${STORAGE_DIR:?}/app"
    tar --numeric-owner -xzf "$STORAGE_FILE" -C "$STORAGE_DIR" || fail "Extraccao do storage falhou."
    log "Storage restaurado."
fi

log "Restauro concluido. Reiniciar app/queue/scheduler: docker compose -f docker-compose.prod.yml up -d"
