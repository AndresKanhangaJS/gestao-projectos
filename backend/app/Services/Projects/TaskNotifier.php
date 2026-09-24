<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Models\Projects\Task;
use App\Models\User;
use App\Notifications\Projects\TaskAssigned;
use App\Notifications\Projects\TaskNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Calcula destinatários e envia as notificações in-app de tarefas.
 * Regra geral: o autor da acção nunca é notificado da sua própria acção.
 */
class TaskNotifier
{
    /**
     * Participantes da tarefa (responsáveis ∪ observadores), sem duplicados
     * e excluindo o autor da acção.
     *
     * @return Collection<int, User>
     */
    public function participants(Task $task, User $actor): Collection
    {
        /** @var Collection<int, User> $assignees */
        $assignees = $task->assignees()->get();
        /** @var Collection<int, User> $watchers */
        $watchers = $task->watchers()->get();

        return $assignees
            ->merge($watchers)
            ->reject(fn (User $user): bool => $user->is($actor))
            ->values();
    }

    /** Notifica responsáveis + observadores (ex.: comentário, mudança de coluna). */
    public function notifyParticipants(Task $task, User $actor, TaskNotification $notification): void
    {
        $recipients = $this->participants($task, $actor);

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, $notification);
        }
    }

    /**
     * Notifica os utilizadores recém-atribuídos à tarefa, excluindo o autor.
     *
     * @param  array<int, int|string>  $userIds
     */
    public function notifyNewAssignees(Task $task, User $actor, array $userIds): void
    {
        $ids = array_values(array_filter(
            array_map('intval', $userIds),
            fn (int $id): bool => $id !== (int) $actor->id,
        ));

        if ($ids === []) {
            return;
        }

        $recipients = User::query()->whereKey($ids)->get();

        Notification::send($recipients, new TaskAssigned($task, $actor));
    }
}
