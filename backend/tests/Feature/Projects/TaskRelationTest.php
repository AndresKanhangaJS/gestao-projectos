<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class TaskRelationTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_relation_can_be_created_listed_and_deleted_within_the_same_workspace(): void
    {
        $task = $this->makeTask();
        // Outro projecto do MESMO workspace é permitido.
        $sibling = Project::factory()->create(['workspace_id' => $this->workspace->id]);
        $related = Task::factory()->create(['project_id' => $sibling->id, 'title' => 'Tarefa irmã']);

        $relationId = $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $related->id,
            'type' => 'relates_to',
        ])->assertCreated()
            ->assertJsonPath('data.related_task_id', $related->id)
            ->assertJsonPath('data.type', 'relates_to')
            ->assertJsonPath('data.related_task.title', 'Tarefa irmã')
            ->json('data.id');

        $this->getJson("/api/projects/tasks/{$task->id}/relations")->assertOk()->assertJsonCount(1, 'data');

        $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $related->id,
            'type' => 'relates_to',
        ])->assertUnprocessable()->assertJsonValidationErrors('related_task_id');

        $this->deleteJson("/api/projects/tasks/{$task->id}/relations/{$relationId}")->assertNoContent();
        $this->assertDatabaseCount('task_relations', 0);
    }

    public function test_relation_to_a_task_in_another_workspace_is_rejected_without_leaking(): void
    {
        $task = $this->makeTask();
        $foreignWorkspace = Workspace::factory()->create();
        $foreignTask = Task::factory()->create([
            'project_id' => Project::factory()->create(['workspace_id' => $foreignWorkspace->id])->id,
            'title' => 'Segredo de outro cliente',
        ]);

        $response = $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $foreignTask->id,
            'type' => 'blocks',
        ])->assertUnprocessable()->assertJsonValidationErrors('related_task_id');

        $nonexistent = $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => 999999,
            'type' => 'blocks',
        ])->assertUnprocessable();

        // Mesma mensagem para "não existe" e "outro workspace": não revela existência.
        $this->assertSame(
            $nonexistent->json('errors.related_task_id'),
            $response->json('errors.related_task_id'),
        );
        $this->assertStringNotContainsString('Segredo', $response->getContent());
        $this->assertDatabaseCount('task_relations', 0);
    }

    public function test_global_manager_also_cannot_link_across_workspaces(): void
    {
        Role::findOrCreate('admin', 'web');
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $task = $this->makeTask();
        $foreignTask = Task::factory()->create();

        $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $foreignTask->id,
            'type' => 'blocks',
        ])->assertUnprocessable()->assertJsonValidationErrors('related_task_id');
    }

    public function test_task_cannot_relate_to_itself_and_viewer_cannot_create_relations(): void
    {
        $task = $this->makeTask();
        $other = $this->makeTask();

        $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $task->id,
            'type' => 'blocks',
        ])->assertUnprocessable()->assertJsonValidationErrors('related_task_id');

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));

        $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $other->id,
            'type' => 'blocks',
        ])->assertForbidden();
    }
}
