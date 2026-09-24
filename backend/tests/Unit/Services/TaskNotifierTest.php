<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Projects\Task;
use App\Models\User;
use App\Services\Projects\TaskNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskNotifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_participants_are_union_of_assignees_and_watchers_without_actor(): void
    {
        $actor = User::factory()->create();
        $assignee = User::factory()->create();
        $both = User::factory()->create();
        $watcher = User::factory()->create();

        $task = Task::factory()->create();
        $task->assignees()->attach([$actor->id, $assignee->id, $both->id]);
        $task->watchers()->attach([$actor->id, $both->id, $watcher->id]);

        $ids = (new TaskNotifier)->participants($task, $actor)->pluck('id')->sort()->values()->all();

        $this->assertSame(
            collect([$assignee->id, $both->id, $watcher->id])->sort()->values()->all(),
            $ids,
        );
    }
}
