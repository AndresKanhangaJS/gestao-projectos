<?php

declare(strict_types=1);

namespace App\Enums\Projects;

/** Tipo de notificação in-app relacionada com tarefas (campo `data.kind`). */
enum TaskNotificationKind: string
{
    case TaskAssigned = 'task_assigned';
    case TaskCommented = 'task_commented';
    case TaskMoved = 'task_moved';
}
