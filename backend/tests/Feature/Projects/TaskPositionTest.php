<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class TaskPositionTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_first_task_in_an_empty_column_gets_position_zero_then_increments(): void
    {
        $payload = ['board_column_id' => $this->todoColumn->id, 'type' => 'task'];

        $this->postJson("/api/projects/{$this->project->id}/tasks", [...$payload, 'title' => 'A'])
            ->assertCreated()->assertJsonPath('data.position', 0);
        $this->postJson("/api/projects/{$this->project->id}/tasks", [...$payload, 'title' => 'B'])
            ->assertCreated()->assertJsonPath('data.position', 1);
    }

    public function test_first_subtask_in_an_empty_column_gets_position_zero(): void
    {
        $parent = $this->makeTask(['board_column_id' => $this->todoColumn->id, 'position' => 0]);

        $this->postJson("/api/projects/tasks/{$parent->id}/subtasks", [
            'title' => 'Sub',
            'board_column_id' => $this->doneColumn->id,
        ])->assertCreated()->assertJsonPath('data.position', 0);
    }

    public function test_first_column_of_an_empty_board_gets_position_zero(): void
    {
        $boardId = $this->postJson("/api/projects/{$this->project->id}/boards", [
            'name' => 'Vazio',
            'with_default_columns' => false,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/projects/boards/{$boardId}/columns", ['name' => 'Primeira'])
            ->assertCreated()->assertJsonPath('data.position', 0);
    }
}
