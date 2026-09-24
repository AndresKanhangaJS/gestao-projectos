<?php

declare(strict_types=1);

namespace App\Notifications\Projects;

use App\Enums\Projects\TaskNotificationKind;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Notifications\Notification;

/**
 * Base comum das notificações in-app de tarefas. Apenas canal `database`
 * (mail/broadcast ficam para a Fase 2). Todas as subclasses partilham o
 * mesmo formato de `data`, consumido por `NotificationResource`.
 */
abstract class TaskNotification extends Notification
{
    public function __construct(
        public readonly Task $task,
        public readonly User $actor,
    ) {}

    abstract public function kind(): TaskNotificationKind;

    abstract public function message(): string;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** Guarda o `kind` na coluna `type` em vez do FQCN da classe. */
    public function databaseType(object $notifiable): string
    {
        return $this->kind()->value;
    }

    /**
     * @return array{kind: string, message: string, task_id: int, task_title: string, project_id: int, actor: array{id: int, name: string}}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'kind' => $this->kind()->value,
            'message' => $this->message(),
            'task_id' => (int) $this->task->id,
            'task_title' => (string) $this->task->title,
            'project_id' => (int) $this->task->project_id,
            'actor' => [
                'id' => (int) $this->actor->id,
                'name' => (string) $this->actor->name,
            ],
        ];
    }
}
