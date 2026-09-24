<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Label;
use App\Models\Projects\Sprint;
use App\Models\User;
use App\Services\Projects\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/** Sprints, etiquetas, colunas do quadro e observadores. */
class ProjectResourcesCrudTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    // --- Sprints -----------------------------------------------------------

    public function test_sprint_crud(): void
    {
        $sprintId = $this->postJson("/api/projects/{$this->project->id}/sprints", [
            'name' => 'Sprint 1',
            'starts_at' => '2026-10-01',
            'ends_at' => '2026-10-14',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'planned')
            ->assertJsonPath('data.starts_at', '2026-10-01')
            ->json('data.id');

        $this->getJson("/api/projects/{$this->project->id}/sprints")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/projects/sprints/{$sprintId}")->assertOk()->assertJsonPath('data.tasks_count', 0);

        $this->patchJson("/api/projects/sprints/{$sprintId}", ['status' => 'active'])
            ->assertOk()->assertJsonPath('data.status', 'active');

        $this->deleteJson("/api/projects/sprints/{$sprintId}")->assertNoContent();
        $this->assertDatabaseMissing('sprints', ['id' => $sprintId]);
    }

    public function test_sprint_validation_and_authorization(): void
    {
        $this->postJson("/api/projects/{$this->project->id}/sprints", [
            'name' => 'Inválido',
            'starts_at' => '2026-10-14',
            'ends_at' => '2026-10-01',
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_at');

        $sprint = Sprint::factory()->create(['project_id' => $this->project->id]);
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));

        $this->getJson("/api/projects/sprints/{$sprint->id}")->assertOk();
        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/projects/sprints/{$sprint->id}")->assertForbidden();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/projects/{$this->project->id}/sprints")->assertForbidden();
    }

    // --- Etiquetas ---------------------------------------------------------

    public function test_label_crud(): void
    {
        $labelId = $this->postJson("/api/projects/{$this->project->id}/labels", [
            'name' => 'Frontend',
            'color' => '#123456',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Frontend')
            ->assertJsonPath('data.color', '#123456')
            ->json('data.id');

        $this->getJson("/api/projects/{$this->project->id}/labels")->assertOk()->assertJsonCount(1, 'data');
        $this->patchJson("/api/projects/labels/{$labelId}", ['name' => 'UI'])->assertOk()->assertJsonPath('data.name', 'UI');
        $this->deleteJson("/api/projects/labels/{$labelId}")->assertNoContent();
        $this->assertDatabaseMissing('labels', ['id' => $labelId]);
    }

    public function test_label_authorization(): void
    {
        $label = Label::factory()->create(['project_id' => $this->project->id]);

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));
        $this->getJson("/api/projects/labels/{$label->id}")->assertOk();
        $this->patchJson("/api/projects/labels/{$label->id}", ['name' => 'X'])->assertForbidden();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/projects/labels/{$label->id}")->assertForbidden();
    }

    // --- Colunas do quadro -------------------------------------------------

    public function test_board_column_crud(): void
    {
        $columnId = $this->postJson("/api/projects/boards/{$this->board->id}/columns", [
            'name' => 'Bloqueado',
        ])->assertCreated()
            ->assertJsonPath('data.position', 2)
            ->assertJsonPath('data.is_done_column', false)
            ->json('data.id');

        $this->getJson("/api/projects/boards/{$this->board->id}/columns")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.2.name', 'Bloqueado');

        $this->getJson("/api/projects/columns/{$columnId}")->assertOk()->assertJsonPath('data.tasks_count', 0);
        $this->patchJson("/api/projects/columns/{$columnId}", ['name' => 'Em espera', 'color' => '#000000'])
            ->assertOk()->assertJsonPath('data.name', 'Em espera');
        $this->deleteJson("/api/projects/columns/{$columnId}")->assertNoContent();
        $this->assertDatabaseMissing('board_columns', ['id' => $columnId]);
    }

    public function test_column_with_tasks_cannot_be_deleted(): void
    {
        $this->makeTask(['board_column_id' => $this->todoColumn->id]);

        $this->deleteJson("/api/projects/columns/{$this->todoColumn->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['column' => 'A coluna tem tarefas; mova-as antes de a apagar.']);

        $this->assertDatabaseHas('board_columns', ['id' => $this->todoColumn->id]);

        // Coluna vazia continua a poder ser apagada.
        $this->deleteJson("/api/projects/columns/{$this->doneColumn->id}")->assertNoContent();
    }

    public function test_new_board_gets_default_columns_by_default(): void
    {
        $response = $this->postJson("/api/projects/{$this->project->id}/boards", ['name' => 'Sprint board'])
            ->assertCreated()
            ->assertJsonPath('data.is_default', false);

        $this->assertSame(
            array_column(ProjectService::DEFAULT_COLUMNS, 'name'),
            array_column($response->json('data.columns'), 'name'),
        );
        $this->assertSame([0, 1, 2, 3], array_column($response->json('data.columns'), 'position'));
        $this->assertSame([false, false, false, true], array_column($response->json('data.columns'), 'is_done_column'));
    }

    public function test_new_board_can_be_created_without_default_columns(): void
    {
        $boardId = $this->postJson("/api/projects/{$this->project->id}/boards", [
            'name' => 'Vazio',
            'with_default_columns' => false,
            'is_default' => true,
        ])->assertCreated()
            ->assertJsonCount(0, 'data.columns')
            ->assertJsonPath('data.is_default', true)
            ->json('data.id');

        // Só um quadro por omissão por projecto.
        $this->assertDatabaseHas('boards', ['id' => $this->board->id, 'is_default' => false]);
        $this->assertDatabaseHas('boards', ['id' => $boardId, 'is_default' => true]);

        $this->postJson("/api/projects/{$this->project->id}/boards", ['name' => 'X', 'with_default_columns' => 'talvez'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('with_default_columns');
    }

    public function test_board_column_authorization(): void
    {
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));

        $this->getJson("/api/projects/boards/{$this->board->id}/columns")->assertOk();
        $this->postJson("/api/projects/boards/{$this->board->id}/columns", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/projects/columns/{$this->todoColumn->id}")->assertForbidden();
    }

    // --- Observadores ------------------------------------------------------

    public function test_watch_toggle(): void
    {
        $task = $this->makeTask();
        $viewer = $this->memberOf($this->workspace, WorkspaceRole::Viewer);
        Sanctum::actingAs($viewer);

        $this->postJson("/api/projects/tasks/{$task->id}/watch")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $viewer->id);
        $this->assertDatabaseHas('task_watchers', ['task_id' => $task->id, 'user_id' => $viewer->id]);

        $this->postJson("/api/projects/tasks/{$task->id}/watch")->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseMissing('task_watchers', ['task_id' => $task->id, 'user_id' => $viewer->id]);
    }

    public function test_outsider_cannot_watch(): void
    {
        $task = $this->makeTask();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/projects/tasks/{$task->id}/watch")->assertForbidden();
    }
}
