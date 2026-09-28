#!/usr/bin/env bash
# Processo do contentor "backup": corre /backup.sh todos os dias a BACKUP_HOUR:BACKUP_MINUTE
# (fuso horario TZ, por omissao Africa/Luanda).
set -uo pipefail
source /usr/local/lib/backup-common.sh

HOUR="${BACKUP_HOUR:-02}"
MINUTE="${BACKUP_MINUTE:-00}"
mkdir -p "$BACKUP_DIR"
log "Agendador de backups activo: todos os dias as ${HOUR}:${MINUTE} (${TZ:-UTC}), retencao ${BACKUP_RETENTION_DAYS:-14} dias."

while true; do
    now="$(date +%s)"
    next="$(date -d "today ${HOUR}:${MINUTE}" +%s)"
    if [ "$next" -le "$now" ]; then
        next="$(date -d "tomorrow ${HOUR}:${MINUTE}" +%s)"
    fi
    log "Proximo backup: $(date -d "@${next}" '+%Y-%m-%d %H:%M')."
    sleep $(( next - now ))
    /backup.sh || log "ERRO: o backup agendado falhou (ver mensagens acima)."
done
