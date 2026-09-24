<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;
use App\Notifications\Projects\TaskAssigned;
use App\Notifications\Projects\TaskCommented;
use App\Notifications\Projects\TaskMoved;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskNotificationDispatchTest extends TestCase
{
    use RefreshDatabase;

    private User $actor;

    private User $alice;

    private User $bruno;

    private Project $project;

    private BoardColumn $todoColumn;

    private BoardColumn $doneColumn;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actor = User::factory()->create(['name' => 'Ana Gestora']);
        $this->alice = User::factory()->create();
        $this->bruno = User::factory()->create();

        $workspace = Workspace::factory()->create(['owner_id' => $this->actor->id]);
        $workspace->members()->attach($this->actor->id, ['role' => WorkspaceRole::Owner->value]);

        $this->project = Project::factory()->create(['workspace_id' => $workspace->id]);
        $board = Board::factory()->create(['project_id' => $this->project->id]);

        $this->todoColumn = BoardColumn::factory()->create(['board_id' => $board->id, 'name' => 'A Fazer', 'position' => 0]);
        $this->doneColumn = BoardColumn::factory()->create(['board_id' => $board->id, 'name' => 'Concluído', 'position' => 1]);

        $this->task = Task::factory()->create([
            'project_id' => $this->project->id,
            'board_column_id' => $this->todoColumn->id,
            'reporter_id' => $this->actor->id,
            'title' => 'Rever permissões',
            'position' => 0,
        ]);

        Sanctum::actingAs($this->actor);
    }

    public function test_new_assignees_are_notified_excluding_the_actor(): void
    {
        Notification::fake();

        $this->putJson("/api/projects/tasks/{$this->task->id}/assignees", [
            'user_ids' => [$this->actor->id, $this->alice->id],
        ])->assertOk();

        Notification::assertSentTo($this->alice, TaskAssigned::class, function (TaskAssigned $notification, array $channels): bool {
            return $channels === ['database']
                && $notification->toArray($this->alice) === [
                    'kind' => 'task_assigned',
                    'message' => 'Ana Gestora atribuiu-lhe a tarefa "Rever permissões".',
                    'task_id' => $this->task->id,
                    'task_title' => 'Rever permissões',
                    'project_id' => $this->project->id,
                    'actor' => ['id' => $this->actor->id, 'name' => 'Ana Gestora'],
                ];
        });
        Notification::assertNotSentTo($this->actor, TaskAssigned::class);
        Notification::assertNotSentTo($this->bruno, TaskAssigned::class);
    }

    public function test_only_newly_attached_assignees_are_notified_on_resync(): void
    {
        $this->task->assignees()->attach($this->alice->id);

        Notification::fake();

        $this->putJson("/api/projects/tasks/{$this->task->id}/assignees", [
            'user_ids' => [$this->alice->id, $this->bruno->id],
        ])->assertOk();

        Notification::assertSentToTimes($this->bruno, TaskAssigned::class, 1);
        Notification::assertNotSentTo($this->alice, TaskAssigned::class);
    }

    public function test_assignment_notification_is_persisted_in_database(): void
    {
        $this->putJson("/api/projects/tasks/{$this->task->id}/assignees", [
            'user_ids' => [$this->alice->id],
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => $this->alice->getMorphClass(),
            'notifiable_id' => $this->alice->id,
            'type' => 'task_assigned',
            'read_at' => null,
        ]);
        $this->assertSame(0, $this->actor->notifications()->count());
        $this->assertSame('task_assigned', $this->alice->notifications()->firstOrFail()->data['kind']);
    }

    public function test_comment_notifies_assignees_and_watchers_once_excluding_author(): void
    {
        $this->task->assignees()->attach([$this->actor->id, $this->alice->id]);
        $this->task->watchers()->attach([$this->alice->id, $this->bruno->id]);

        Notification::fake();

        $this->postJson("/api/projects/tasks/{$this->task->id}/comments", [
            'body' => 'Já revi as permissões.',
        ])->assertCreated();

        Notification::assertSentToTimes($this->alice, TaskCommented::class, 1);
        Notification::assertSentToTimes($this->bruno, TaskCommented::class, 1);
        Notification::assertNotSentTo($this->actor, TaskCommented::class);
        Notification::assertSentTo($this->bruno, TaskCommented::class, function (TaskCommented $notification): bool {
            $data = $notification->toArray($this->bruno);

            return $data['kind'] === 'task_commented'
                && $data['message'] === 'Ana Gestora comentou a tarefa "Rever permissões".'
                && $data['task_id'] === $this->task->id
                && $data['actor'] === ['id' => $this->actor->id, 'name' => 'Ana Gestora'];
        });
    }

    public function test_moving_task_to_another_column_notifies_participants_excluding_actor(): void
    {
        $this->task->assignees()->attach([$this->actor->id, $this->alice->id]);
        $this->task->watchers()->attach($this->bruno->id);

        Notification::fake();

        $this->postJson("/api/projects/tasks/{$this->task->id}/move", [
            'board_column_id' => $this->doneColumn->id,
            'position' => 0,
        ])->assertOk();

        Notification::assertSentToTimes($this->alice, TaskMoved::class, 1);
        Notification::assertSentToTimes($this->bruno, TaskMoved::class, 1);
        Notification::assertNotSentTo($this->actor, TaskMoved::class);
        Notification::assertSentTo($this->alice, TaskMoved::class, function (TaskMoved $notification): bool {
            $data = $notification->toArray($this->alice);

            return $data['kind'] === 'task_moved'
                && $data['message'] === 'Ana Gestora moveu a tarefa "Rever permissões" para "Concluído".'
                && $data['project_id'] === $this->project->id;
        });
    }

    public function test_reordering_within_same_column_does_not_notify(): void
    {
        $this->task->assignees()->attach($this->alice->id);
        Task::factory()->create([
            'project_id' => $this->project->id,
            'board_column_id' => $this->todoColumn->id,
            'position' => 1,
        ]);

        Notification::fake();

        $this->postJson("/api/projects/tasks/{$this->task->id}/move", [
            'board_column_id' => $this->todoColumn->id,
            'position' => 1,
        ])->assertOk();

        Notification::assertNothingSent();
    }
}
