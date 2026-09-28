#!/usr/bin/env bash
# Funcoes partilhadas por backup.sh / restore.sh.

# Sem isto, um erro dentro de $(...) nao interrompe o script mesmo com "set -e".
shopt -s inherit_errexit

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STORAGE_DIR="${STORAGE_DIR:-/app-storage}"
LOG_FILE="${BACKUP_DIR}/backup.log"
DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"

log() {
    local line
    line="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$line"
    echo "$line" >> "$LOG_FILE" 2>/dev/null || true
}

fail() {
    log "ERRO: $*" >&2
    exit 1
}

# Ficheiro de opcoes do cliente MySQL (evita a password na linha de comandos).
mysql_defaults_file() {
    [ -n "${DB_ROOT_PASSWORD:-}" ] || fail "DB_ROOT_PASSWORD nao definida (.env.production)."
    [ -n "${DB_DATABASE:-}" ] || fail "DB_DATABASE nao definida (.env.production)."
    local file escaped
    file="$(mktemp)"
    chmod 600 "$file"
    # Escapar \ e " para o formato do ficheiro de opcoes do MySQL.
    local bs='\' dq='"'
    escaped="${DB_ROOT_PASSWORD//"$bs"/"$bs$bs"}"
    escaped="${escaped//"$dq"/"$bs$dq"}"
    printf '[client]\nhost=%s\nport=%s\nuser=root\npassword="%s"\n' "$DB_HOST" "$DB_PORT" "$escaped" > "$file"
    echo "$file"
}
