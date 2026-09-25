<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\ActivityLog;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class SprintCompletionTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    private Sprint $active;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        $this->active = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'active']);
        Sanctum::actingAs($this->owner);
    }

    public function test_complete_moves_unfinished_tasks_to_backlog(): void
    {
        $pending = $this->makeTask(['sprint_id' => $this->active->id]);
        $pending2 = $this->makeTask(['sprint_id' => $this->active->id]);
        $done = $this->makeTask(['sprint_id' => $this->active->id, 'board_column_id' => $this->doneColumn->id]);

        $this->postJson("/api/projects/sprints/{$this->active->id}/complete", ['move_unfinished_to' => 'backlog'])
            ->assertOk()
            ->assertJsonPath('data.id', $this->active->id)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('moved_count', 2);

        $this->assertNull($pending->fresh()?->sprint_id);
        $this->assertNull($pending2->fresh()?->sprint_id);
        $this->assertSame($this->active->id, $done->fresh()?->sprint_id);

        // Actividade: uma alteração de sprint por tarefa movida.
        $this->assertSame(2, ActivityLog::query()->where('event', 'task_updated')->count());
        $this->assertDatabaseHas('activity_logs', ['subject_id' => $pending->id, 'event' => 'task_updated', 'causer_id' => $this->owner->id]);
    }

    public function test_complete_moves_unfinished_tasks_to_a_planned_sprint(): void
    {
        $next = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'planned']);
        $pending = $this->makeTask(['sprint_id' => $this->active->id]);

        $this->postJson("/api/projects/sprints/{$this->active->id}/complete", [
            'move_unfinished_to' => 'sprint',
            'target_sprint_id' => $next->id,
        ])->assertOk()->assertJsonPath('moved_count', 1);

        $this->assertSame($next->id, $pending->fresh()?->sprint_id);
        $this->assertSame('planned', $next->fresh()?->status->value);
    }

    public function test_target_sprint_validation(): void
    {
        $url = "/api/projects/sprints/{$this->active->id}/complete";
        $completed = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'completed']);
        $otherProject = Project::factory()->create(['workspace_id' => $this->workspace->id]);
        $foreign = Sprint::factory()->create(['project_id' => $otherProject->id, 'status' => 'planned']);

        $this->postJson($url, [])->assertUnprocessable()->assertJsonValidationErrors('move_unfinished_to');
        $this->postJson($url, ['move_unfinished_to' => 'lixo'])->assertUnprocessable()->assertJsonValidationErrors('move_unfinished_to');
        $this->postJson($url, ['move_unfinished_to' => 'sprint'])->assertUnprocessable()->assertJsonValidationErrors('target_sprint_id');

        foreach ([$completed->id, $foreign->id, $this->active->id, 999999] as $target) {
            $this->postJson($url, ['move_unfinished_to' => 'sprint', 'target_sprint_id' => $target])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['target_sprint_id' => 'O sprint de destino tem de ser um sprint planeado deste projecto.']);
        }

        $this->assertSame('active', $this->active->fresh()?->status->value);
    }

    public function test_cannot_complete_an_already_completed_sprint(): void
    {
        $completed = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'completed']);

        $this->postJson("/api/projects/sprints/{$completed->id}/complete", ['move_unfinished_to' => 'backlog'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sprint' => 'O sprint já está concluído.']);
    }

    public function test_only_sprint_managers_can_complete(): void
    {
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));

        $this->postJson("/api/projects/sprints/{$this->active->id}/complete", [])->assertForbidden();
        $this->assertSame('active', $this->active->fresh()?->status->value);
    }

    public function test_patch_status_completed_is_rejected(): void
    {
        $this->patchJson("/api/projects/sprints/{$this->active->id}", ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Use a acção Concluir sprint.']);

        $this->assertSame('active', $this->active->fresh()?->status->value);
    }

    public function test_tasks_cannot_be_placed_in_a_completed_sprint(): void
    {
        $completed = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'completed']);
        $message = 'Não é possível colocar tarefas num sprint concluído.';

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Para sprint fechado',
            'sprint_id' => $completed->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['sprint_id' => $message]);

        $task = $this->makeTask();
        $this->patchJson("/api/projects/tasks/{$task->id}", ['sprint_id' => $completed->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sprint_id' => $message]);

        // Reenviar o sprint (concluído) que a tarefa já tem não falha.
        $old = $this->makeTask(['sprint_id' => $completed->id]);
        $this->patchJson("/api/projects/tasks/{$old->id}", ['sprint_id' => $completed->id, 'title' => 'Renomeada'])
            ->assertOk();

        $this->patchJson("/api/projects/tasks/{$task->id}", ['sprint_id' => $this->active->id])->assertOk();
    }

    public function test_subtask_of_a_task_in_a_completed_sprint_goes_to_backlog(): void
    {
        $completed = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'completed']);
        $oldParent = $this->makeTask(['sprint_id' => $completed->id]);
        $activeParent = $this->makeTask(['sprint_id' => $this->active->id]);

        $this->postJson("/api/projects/tasks/{$oldParent->id}/subtasks", ['title' => 'Sub antiga'])
            ->assertCreated()
            ->assertJsonPath('data.sprint_id', null);

        $this->postJson("/api/projects/tasks/{$activeParent->id}/subtasks", ['title' => 'Sub activa'])
            ->assertCreated()
            ->assertJsonPath('data.sprint_id', $this->active->id);
    }

    public function test_sprint_cannot_be_created_already_completed(): void
    {
        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'Fechado', 'status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Um sprint novo não pode ser criado já concluído.']);

        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'Planeado', 'status' => 'planned'])
            ->assertCreated();
    }
}
