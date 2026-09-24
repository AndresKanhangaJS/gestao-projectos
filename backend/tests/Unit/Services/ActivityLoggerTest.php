<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Enums\Projects\ActivityEvent;
use App\Models\Projects\ActivityLog;
use App\Models\Projects\Task;
use App\Models\User;
use App\Services\Projects\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_updated_normalizes_dates_decimals_and_enums_and_ignores_untouched_fields(): void
    {
        $task = Task::factory()->create([
            'priority' => 'low',
            'estimate' => 3,
            'due_at' => '2026-10-01',
            'starts_at' => null,
            'description' => 'x',
        ]);
        $before = $task->getRawOriginal();

        $task->update(['priority' => 'urgent', 'estimate' => '3.00', 'due_at' => '2026-10-05', 'description' => 'x']);

        $log = app(ActivityLogger::class)->taskUpdated($task, $before, null);

        $this->assertInstanceOf(ActivityLog::class, $log);
        $this->assertSame(ActivityEvent::TaskUpdated, $log->event);
        $this->assertSame([
            'priority' => ['old' => 'low', 'new' => 'urgent'],
            'due_at' => ['old' => '2026-10-01', 'new' => '2026-10-05'],
        ], $log->changes);
        $this->assertSame($task->project_id, $log->project_id);
    }

    public function test_describe_uses_actor_name_or_sistema_and_falls_back_to_stored_title(): void
    {
        $actor = User::factory()->create(['name' => 'Ana']);
        $task = Task::factory()->create(['title' => 'Corrigir login']);
        $logger = app(ActivityLogger::class);

        $created = $logger->taskCreated($task, $actor)->load(['causer', 'subject']);
        $this->assertSame('Ana criou a tarefa «Corrigir login».', $logger->describe($created));

        $deleted = $logger->taskDeleted($task, null);
        $task->delete();
        $deleted->load(['causer', 'subject']);
        $this->assertSame('Sistema apagou a tarefa «Corrigir login».', $logger->describe($deleted));
    }

    public function test_empty_assignee_or_label_changes_are_not_logged(): void
    {
        $task = Task::factory()->create();
        $logger = app(ActivityLogger::class);

        $this->assertNull($logger->assigneesChanged($task, [], [], null));
        $this->assertNull($logger->labelsChanged($task, [], [], null));
        $this->assertDatabaseCount('activity_logs', 0);
    }
}
