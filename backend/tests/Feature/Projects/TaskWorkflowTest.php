<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private BoardColumn $todoColumn;

    private BoardColumn $doneColumn;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
        $workspace->members()->attach($this->user->id, ['role' => WorkspaceRole::Owner->value]);

        $this->project = Project::factory()->create(['workspace_id' => $workspace->id]);
        $board = Board::factory()->create(['project_id' => $this->project->id]);

        $this->todoColumn = BoardColumn::factory()->create(['board_id' => $board->id, 'name' => 'A Fazer', 'position' => 0]);
        $this->doneColumn = BoardColumn::factory()->create(['board_id' => $board->id, 'name' => 'Concluído', 'position' => 1, 'is_done_column' => true]);

        Sanctum::actingAs($this->user);
    }

    public function test_user_can_create_a_task(): void
    {
        $response = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'priority' => 'high',
            'title' => 'Corrigir erro no formulário de login',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Corrigir erro no formulário de login')
            ->assertJsonPath('data.reporter.id', $this->user->id);

        $this->assertDatabaseHas('tasks', [
            'id' => $response->json('data.id'),
            'project_id' => $this->project->id,
            'board_column_id' => $this->todoColumn->id,
        ]);
    }

    public function test_task_can_be_moved_between_columns(): void
    {
        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'bug',
            'title' => 'Optimizar consulta de listagem',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/projects/tasks/{$taskId}/move", [
            'board_column_id' => $this->doneColumn->id,
            'position' => 0,
        ])->assertOk()
            ->assertJsonPath('data.board_column_id', $this->doneColumn->id)
            ->assertJsonPath('data.position', 0);

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'board_column_id' => $this->doneColumn->id,
            'position' => 0,
        ]);
    }

    public function test_user_can_comment_on_a_task(): void
    {
        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Rever permissões de acesso',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/projects/tasks/{$taskId}/comments", [
            'body' => 'Já comecei a rever isto.',
        ])->assertCreated()
            ->assertJsonPath('data.body', 'Já comecei a rever isto.')
            ->assertJsonPath('data.user.id', $this->user->id);

        $this->assertDatabaseHas('task_comments', ['task_id' => $taskId, 'user_id' => $this->user->id]);
    }

    public function test_user_can_create_a_subtask(): void
    {
        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'story',
            'title' => 'Criar ecrã de definições do utilizador',
        ])->assertCreated()->json('data.id');

        $subtaskResponse = $this->postJson("/api/projects/tasks/{$taskId}/subtasks", [
            'title' => 'Desenhar o formulário de definições',
        ])->assertCreated()
            ->assertJsonPath('data.parent_id', $taskId)
            ->assertJsonPath('data.board_column_id', $this->todoColumn->id);

        $this->assertDatabaseHas('tasks', [
            'id' => $subtaskResponse->json('data.id'),
            'parent_id' => $taskId,
        ]);

        $this->getJson("/api/projects/tasks/{$taskId}")
            ->assertOk()
            ->assertJsonPath('data.subtasks_count', 1);
    }

    public function test_user_can_be_assigned_to_a_task(): void
    {
        $assignee = User::factory()->create();
        $this->project->workspace->members()->attach($assignee->id, ['role' => WorkspaceRole::Member->value]);

        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Adicionar validação ao formulário de contacto',
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/projects/tasks/{$taskId}/assignees", [
            'user_ids' => [$assignee->id],
        ])->assertOk();

        $this->assertDatabaseHas('task_assignees', ['task_id' => $taskId, 'user_id' => $assignee->id]);

        $this->getJson("/api/projects/tasks/{$taskId}")
            ->assertOk()
            ->assertJsonPath('data.assignees.0.id', $assignee->id);
    }
}
