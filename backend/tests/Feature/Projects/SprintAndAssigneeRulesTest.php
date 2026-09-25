<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use App\Models\User;
use App\Notifications\Projects\TaskAssigned;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class SprintAndAssigneeRulesTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    // --- Um só sprint activo por projecto -----------------------------------

    public function test_cannot_create_a_second_active_sprint(): void
    {
        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'S1', 'status' => 'active'])
            ->assertCreated();

        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'S2', 'status' => 'active'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Já existe um sprint activo neste projecto.']);

        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'S2', 'status' => 'planned'])
            ->assertCreated();
    }

    public function test_cannot_activate_a_second_sprint_via_update_but_can_resave_the_active_one(): void
    {
        $active = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'active']);
        $planned = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'planned']);

        $this->patchJson("/api/projects/sprints/{$planned->id}", ['status' => 'active'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Já existe um sprint activo neste projecto.']);

        $this->patchJson("/api/projects/sprints/{$active->id}", ['status' => 'active', 'name' => 'Renomeado'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renomeado');

        $this->postJson("/api/projects/sprints/{$active->id}/complete", ['move_unfinished_to' => 'backlog'])->assertOk();
        $this->patchJson("/api/projects/sprints/{$planned->id}", ['status' => 'active'])->assertOk();
    }

    public function test_active_sprint_in_another_project_does_not_block(): void
    {
        $otherProject = Project::factory()->create(['workspace_id' => $this->workspace->id]);
        Sprint::factory()->create(['project_id' => $otherProject->id, 'status' => 'active']);

        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'S1', 'status' => 'active'])
            ->assertCreated();
    }

    // --- Responsáveis têm de ser membros do workspace -----------------------

    public function test_sync_assignees_rejects_non_members_including_global_admins(): void
    {
        Role::findOrCreate('admin', 'web');
        $globalAdmin = User::factory()->create();
        $globalAdmin->assignRole('admin');
        $outsider = User::factory()->create();
        $member = $this->memberOf($this->workspace);
        $task = $this->makeTask();

        foreach ([$outsider, $globalAdmin] as $user) {
            $this->putJson("/api/projects/tasks/{$task->id}/assignees", ['user_ids' => [$member->id, $user->id]])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['user_ids.1' => 'O utilizador não é membro deste workspace.']);
        }

        $this->assertDatabaseCount('task_assignees', 0);

        $manager = $this->memberOf($this->workspace, WorkspaceRole::Manager);
        $this->putJson("/api/projects/tasks/{$task->id}/assignees", ['user_ids' => [$member->id, $manager->id, $this->owner->id]])
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_viewers_cannot_be_assignees(): void
    {
        $viewer = $this->memberOf($this->workspace, WorkspaceRole::Viewer);
        $task = $this->makeTask();

        $this->putJson("/api/projects/tasks/{$task->id}/assignees", ['user_ids' => [$viewer->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user_ids.0' => 'O utilizador não pode ser responsável: é apenas leitor neste workspace.']);

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Com leitor',
            'assignee_ids' => [$this->owner->id, $viewer->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee_ids.1' => 'O utilizador não pode ser responsável: é apenas leitor neste workspace.']);

        $this->assertDatabaseCount('task_assignees', 0);
    }

    public function test_task_can_be_created_already_assigned(): void
    {
        Notification::fake();
        $alice = $this->memberOf($this->workspace);

        $response = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Com responsáveis',
            'assignee_ids' => [$alice->id, $this->owner->id],
        ])->assertCreated();

        $taskId = $response->json('data.id');
        $this->assertEqualsCanonicalizing(
            [$alice->id, $this->owner->id],
            array_column($response->json('data.assignees'), 'id'),
        );
        $this->assertDatabaseHas('task_assignees', ['task_id' => $taskId, 'user_id' => $alice->id]);

        // Notifica o novo responsável, nunca o autor da acção.
        Notification::assertSentTo($alice, TaskAssigned::class);
        Notification::assertNotSentTo($this->owner, TaskAssigned::class);

        $this->assertDatabaseHas('activity_logs', ['subject_id' => $taskId, 'event' => 'task_created']);
        $this->assertDatabaseHas('activity_logs', ['subject_id' => $taskId, 'event' => 'assignees_changed']);
    }

    public function test_task_creation_rejects_non_member_assignees(): void
    {
        $outsider = User::factory()->create();

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Com estranho',
            'assignee_ids' => [$outsider->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee_ids.0' => 'O utilizador não é membro deste workspace.']);

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_task_creation_without_assignees_logs_no_assignee_change(): void
    {
        Notification::fake();

        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Sem responsáveis',
        ])->assertCreated()
            ->assertJsonCount(0, 'data.assignees')
            ->json('data.id');

        $this->assertDatabaseMissing('activity_logs', ['subject_id' => $taskId, 'event' => 'assignees_changed']);
        Notification::assertNothingSent();
    }
}
