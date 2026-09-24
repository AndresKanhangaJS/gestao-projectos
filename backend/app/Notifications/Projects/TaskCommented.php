<?php

declare(strict_types=1);

namespace App\Notifications\Projects;

use App\Enums\Projects\TaskNotificationKind;

class TaskCommented extends TaskNotification
{
    public function kind(): TaskNotificationKind
    {
        return TaskNotificationKind::TaskCommented;
    }

    public function message(): string
    {
        return sprintf('%s comentou a tarefa "%s".', $this->actor->name, $this->task->title);
    }
}
