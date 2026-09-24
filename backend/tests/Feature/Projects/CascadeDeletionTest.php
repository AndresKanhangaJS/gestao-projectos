<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Models\Projects\Label;
use App\Models\Projects\Task;
use App\Models\Projects\TaskAttachment;
use App\Models\Projects\TaskComment;
use App\Models\Projects\TaskRelation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/**
 * Apagar workspace/projecto/quadro com tarefas. `tasks.board_column_id` é FK
 * RESTRICT: sem remover primeiro as tarefas, o MySQL responde 500.
 */
class CascadeDeletionTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    private Task $task;

    private Task $subtask;

    private Task $outsideTask;

    private string $attachmentPath;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        $this->buildProjectContext();

        // As FKs têm de estar activas em SQLite para o teste reproduzir o erro do MySQL.
        $this->assertSame(1, (int) DB::selectOne('PRAGMA foreign_keys')->foreign_keys);

        $this->task = $this->makeTask(['title' => 'Mãe']);
        $this->subtask = $this->makeTask(['title' => 'Filha', 'parent_id' => $this->task->id, 'board_column_id' => $this->doneColumn->id]);
        $this->outsideTask = Task::factory()->create(['title' => 'Tarefa de outro projecto']);

        $user = User::factory()->create();
        TaskComment::factory()->create(['task_id' => $this->task->id, 'user_id' => $user->id]);
        $this->task->assignees()->attach($user->id);
        $this->task->watchers()->attach($user->id);
        $label = Label::factory()->create(['project_id' => $this->project->id]);
        $this->task->labels()->attach($label->id);
        TaskRelation::create(['task_id' => $this->outsideTask->id, 'related_task_id' => $this->task->id, 'type' => 'blocks']);

        $this->attachmentPath = "task-attachments/{$this->task->id}/ficheiro.txt";
        Storage::disk('local')->put($this->attachmentPath, 'conteúdo');
        TaskAttachment::factory()->create(['task_id' => $this->task->id, 'uploaded_by' => $user->id, 'path' => $this->attachmentPath]);

        Sanctum::actingAs($this->owner);
    }

    public function test_deleting_a_board_with_tasks_removes_tasks_and_dependents(): void
    {
        $this->deleteJson("/api/projects/boards/{$this->board->id}")->assertNoContent();

        $this->assertDatabaseMissing('boards', ['id' => $this->board->id]);
        $this->assertDependentsGone();
        // O projecto continua a existir.
        $this->assertDatabaseHas('projects', ['id' => $this->project->id]);
    }

    public function test_deleting_a_project_with_tasks_removes_everything(): void
    {
        $this->deleteJson("/api/projects/{$this->project->id}")->assertNoContent();

        $this->assertDatabaseMissing('projects', ['id' => $this->project->id]);
        $this->assertDatabaseMissing('boards', ['id' => $this->board->id]);
        $this->assertDependentsGone();
    }

    public function test_deleting_a_workspace_with_tasks_removes_everything(): void
    {
        $this->deleteJson("/api/projects/workspaces/{$this->workspace->id}")->assertNoContent();

        $this->assertDatabaseMissing('workspaces', ['id' => $this->workspace->id]);
        $this->assertDatabaseMissing('projects', ['id' => $this->project->id]);
        $this->assertDependentsGone();
    }

    private function assertDependentsGone(): void
    {
        $this->assertDatabaseMissing('tasks', ['id' => $this->task->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $this->subtask->id]);
        $this->assertDatabaseCount('task_comments', 0);
        $this->assertDatabaseCount('task_attachments', 0);
        $this->assertDatabaseCount('task_assignees', 0);
        $this->assertDatabaseCount('task_watchers', 0);
        $this->assertDatabaseCount('task_labels', 0);
        $this->assertDatabaseCount('task_relations', 0);
        Storage::disk('local')->assertMissing($this->attachmentPath);

        // Tarefas de outros projectos ficam intactas.
        $this->assertDatabaseHas('tasks', ['id' => $this->outsideTask->id]);
    }
}
