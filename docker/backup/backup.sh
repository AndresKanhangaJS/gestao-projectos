#!/usr/bin/env bash
# Backup da base de dados (mysqldump) e dos ficheiros de storage (anexos).
# Uso: docker compose -f docker-compose.prod.yml run --rm backup /backup.sh
set -euo pipefail
source /usr/local/lib/backup-common.sh

mkdir -p "$BACKUP_DIR"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
TS="$(date '+%Y-%m-%d_%H%M%S')"
DB_FILE="${BACKUP_DIR}/db_${DB_DATABASE:-app}_${TS}.sql.gz"
STORAGE_FILE="${BACKUP_DIR}/storage_${TS}.tar.gz"

DEFAULTS="$(mysql_defaults_file)"
trap 'rm -f "$DEFAULTS" "${DB_FILE}.part" "${STORAGE_FILE}.part"' EXIT

log "Inicio do backup (${TS})."

# 1) Base de dados: snapshot consistente sem bloquear as tabelas InnoDB.
if ! mysqldump --defaults-extra-file="$DEFAULTS" \
        --single-transaction --routines --triggers --events \
        --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 \
        --databases "$DB_DATABASE" | gzip -6 > "${DB_FILE}.part"; then
    fail "mysqldump falhou."
fi
gzip -t "${DB_FILE}.part" || fail "Ficheiro de dump corrompido."
mv "${DB_FILE}.part" "$DB_FILE"
log "BD: $(basename "$DB_FILE") ($(du -h --apparent-size "$DB_FILE" | cut -f1))."

# 2) Ficheiros: storage/app (anexos privados e disco publico). Logs e caches ficam de fora.
if [ -d "${STORAGE_DIR}/app" ]; then
    tar --numeric-owner -czf "${STORAGE_FILE}.part" -C "$STORAGE_DIR" app || fail "tar do storage falhou."
    mv "${STORAGE_FILE}.part" "$STORAGE_FILE"
    log "Storage: $(basename "$STORAGE_FILE") ($(du -h --apparent-size "$STORAGE_FILE" | cut -f1))."
else
    log "AVISO: ${STORAGE_DIR}/app nao existe; backup de ficheiros ignorado."
fi

# 3) Retencao.
deleted="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db_*.sql.gz' -o -name 'storage_*.tar.gz' \) -mtime +"$RETENTION" -print -delete | wc -l)"
log "Retencao ${RETENTION} dias: ${deleted} ficheiro(s) antigo(s) removido(s)."
log "Backup concluido com sucesso."
