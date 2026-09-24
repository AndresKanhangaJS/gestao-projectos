<?php

declare(strict_types=1);

namespace App\Notifications\Projects;

use App\Enums\Projects\TaskNotificationKind;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Task;
use App\Models\User;

class TaskMoved extends TaskNotification
{
    public function __construct(
        Task $task,
        User $actor,
        public readonly BoardColumn $toColumn,
    ) {
        parent::__construct($task, $actor);
    }

    public function kind(): TaskNotificationKind
    {
        return TaskNotificationKind::TaskMoved;
    }

    public function message(): string
    {
        return sprintf(
            '%s moveu a tarefa "%s" para "%s".',
            $this->actor->name,
            $this->task->title,
            $this->toColumn->name,
        );
    }
}
