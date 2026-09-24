<?php

declare(strict_types=1);

namespace App\Notifications\Projects;

use App\Enums\Projects\TaskNotificationKind;

class TaskAssigned extends TaskNotification
{
    public function kind(): TaskNotificationKind
    {
        return TaskNotificationKind::TaskAssigned;
    }

    public function message(): string
    {
        return sprintf('%s atribuiu-lhe a tarefa "%s".', $this->actor->name, $this->task->title);
    }
}
