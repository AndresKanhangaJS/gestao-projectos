<?php

declare(strict_types=1);

namespace App\Enums\Projects;

/** Tipo de acção registada no histórico de actividade (coluna `activity_logs.event`). */
enum ActivityEvent: string
{
    case TaskCreated = 'task_created';
    case TaskUpdated = 'task_updated';
    case TaskMoved = 'task_moved';
    case TaskDeleted = 'task_deleted';
    case CommentAdded = 'comment_added';
    case AssigneesChanged = 'assignees_changed';
    case LabelsChanged = 'labels_changed';
    case AttachmentAdded = 'attachment_added';
    case AttachmentRemoved = 'attachment_removed';
    case SubtaskCreated = 'subtask_created';
    case RelationAdded = 'relation_added';
    case RelationRemoved = 'relation_removed';

    /** Verbo (pt) usado para compor a descrição legível da actividade. */
    public function verb(): string
    {
        return match ($this) {
            self::TaskCreated => 'criou a tarefa',
            self::TaskUpdated => 'actualizou a tarefa',
            self::TaskMoved => 'moveu a tarefa',
            self::TaskDeleted => 'apagou a tarefa',
            self::CommentAdded => 'comentou a tarefa',
            self::AssigneesChanged => 'alterou os responsáveis da tarefa',
            self::LabelsChanged => 'alterou as etiquetas da tarefa',
            self::AttachmentAdded => 'anexou um ficheiro à tarefa',
            self::AttachmentRemoved => 'removeu um anexo da tarefa',
            self::SubtaskCreated => 'criou uma subtarefa em',
            self::RelationAdded => 'adicionou uma relação à tarefa',
            self::RelationRemoved => 'removeu uma relação da tarefa',
        };
    }
}
