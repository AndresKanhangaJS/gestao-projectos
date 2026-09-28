# Servico de backups (docker-compose.prod.yml): mesma versao do cliente MySQL que o servidor.
FROM mysql:8.0

COPY docker/backup/common.sh /usr/local/lib/backup-common.sh
COPY docker/backup/backup.sh /backup.sh
COPY docker/backup/restore.sh /restore.sh
COPY docker/backup/scheduler.sh /scheduler.sh
RUN chmod +x /backup.sh /restore.sh /scheduler.sh

ENTRYPOINT []
CMD ["/scheduler.sh"]
