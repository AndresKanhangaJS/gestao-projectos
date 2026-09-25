<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Label;
use App\Models\Projects\Task;
use App\Models\User;
use App\Services\Projects\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_task_creation_and_update_are_logged_with_changed_fields_only(): void
    {
        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'priority' => 'low',
            'title' => 'Título original',
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/projects/tasks/{$taskId}", [
            'title' => 'Título novo',
            'priority' => 'high',
            'type' => 'task', // não mudou → não aparece em changes
        ])->assertOk();

        $response = $this->getJson("/api/projects/tasks/{$taskId}/activity")->assertOk();

        $response->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.action', 'task_updated')
            ->assertJsonPath('data.0.actor.id', $this->owner->id)
            ->assertJsonPath('data.0.actor.name', $this->owner->name)
            ->assertJsonPath('data.0.changes.title', ['old' => 'Título original', 'new' => 'Título novo'])
            ->assertJsonPath('data.0.changes.priority', ['old' => 'low', 'new' => 'high'])
            ->assertJsonMissingPath('data.0.changes.type')
            ->assertJsonPath('data.1.action', 'task_created')
            ->assertJsonStructure(['data' => [['id', 'action', 'description', 'actor' => ['id', 'name'], 'changes', 'created_at']], 'links', 'meta']);

        $this->assertStringContainsString('actualizou a tarefa «Título novo»', $response->json('data.0.description'));
        $this->assertStringContainsString('título', $response->json('data.0.description'));
    }

    public function test_update_without_real_changes_does_not_log(): void
    {
        $task = $this->makeTask(['title' => 'Igual']);

        $this->patchJson("/api/projects/tasks/{$task->id}", ['title' => 'Igual'])->assertOk();

        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_move_comment_assign_labels_attachment_subtask_and_relations_are_logged(): void
    {
        $task = $this->makeTask(['title' => 'Tarefa principal']);
        $other = $this->makeTask(['title' => 'Outra tarefa']);
        $label = Label::factory()->create(['project_id' => $this->project->id, 'name' => 'Backend']);
        $assignee = User::factory()->create(['name' => 'Rita']);
        $this->workspace->members()->attach($assignee->id, ['role' => WorkspaceRole::Member->value]);

        $this->postJson("/api/projects/tasks/{$task->id}/move", ['board_column_id' => $this->doneColumn->id, 'position' => 0])->assertOk();
        $this->postJson("/api/projects/tasks/{$task->id}/comments", ['body' => 'Olá'])->assertCreated();
        $this->putJson("/api/projects/tasks/{$task->id}/assignees", ['user_ids' => [$assignee->id]])->assertOk();
        $this->patchJson("/api/projects/tasks/{$task->id}", ['label_ids' => [$label->id]])->assertOk();
        $attachmentId = $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('relatorio.pdf', 10),
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}")->assertNoContent();
        $this->postJson("/api/projects/tasks/{$task->id}/subtasks", ['title' => 'Sub'])->assertCreated();
        $relationId = $this->postJson("/api/projects/tasks/{$task->id}/relations", [
            'related_task_id' => $other->id, 'type' => 'blocks',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/projects/tasks/{$task->id}/relations/{$relationId}")->assertNoContent();

        $data = $this->getJson("/api/projects/tasks/{$task->id}/activity")->assertOk()->json('data');
        $byAction = collect($data)->keyBy('action');

        $this->assertSame([
            'relation_removed', 'relation_added', 'subtask_created', 'attachment_removed',
            'attachment_added', 'labels_changed', 'assignees_changed', 'comment_added', 'task_moved',
        ], array_column($data, 'action'));

        $this->assertSame('Por fazer', $byAction['task_moved']['changes']['board_column']['old']['name']);
        $this->assertSame('Concluído', $byAction['task_moved']['changes']['board_column']['new']['name']);
        $this->assertStringContainsString('de «Por fazer» para «Concluído»', $byAction['task_moved']['description']);
        $this->assertSame([['id' => $assignee->id, 'name' => 'Rita']], $byAction['assignees_changed']['changes']['assignees']['added']);
        $this->assertSame([['id' => $label->id, 'name' => 'Backend']], $byAction['labels_changed']['changes']['labels']['added']);
        $this->assertSame('relatorio.pdf', $byAction['attachment_added']['changes']['attachment']['name']);
        $this->assertSame('Sub', $byAction['subtask_created']['changes']['subtask']['title']);
        $this->assertSame('blocks', $byAction['relation_added']['changes']['relation']['type']);
        $this->assertStringContainsString('bloqueia «Outra tarefa»', $byAction['relation_added']['description']);
    }

    public function test_reordering_within_the_same_column_is_not_logged(): void
    {
        $task = $this->makeTask(['position' => 0]);
        $this->makeTask(['position' => 1]);

        $this->postJson("/api/projects/tasks/{$task->id}/move", ['board_column_id' => $this->todoColumn->id, 'position' => 1])->assertOk();

        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_project_activity_is_paginated_newest_first_and_survives_task_deletion(): void
    {
        $tasks = Task::factory()->count(21)->create([
            'project_id' => $this->project->id,
            'board_column_id' => $this->todoColumn->id,
            'reporter_id' => $this->owner->id,
        ]);
        $logger = app(ActivityLogger::class);
        foreach ($tasks as $task) {
            $logger->taskCreated($task, $this->owner);
        }

        $doomed = $tasks->first();
        $this->deleteJson("/api/projects/tasks/{$doomed->id}")->assertNoContent();

        $page1 = $this->getJson("/api/projects/{$this->project->id}/activity")->assertOk();
        $page1->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 22)
            ->assertJsonPath('data.0.action', 'task_deleted')
            ->assertJsonPath('data.0.task.id', $doomed->id)
            ->assertJsonPath('data.0.task.deleted', true);

        $this->assertStringContainsString("apagou a tarefa «{$doomed->title}»", $page1->json('data.0.description'));

        $ids = array_column($page1->json('data'), 'id');
        $sorted = $ids;
        rsort($sorted);
        $this->assertSame($sorted, $ids);

        $this->getJson("/api/projects/{$this->project->id}/activity?page=2")->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_outsiders_cannot_read_activity(): void
    {
        $task = $this->makeTask();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/projects/tasks/{$task->id}/activity")->assertForbidden();
        $this->getJson("/api/projects/{$this->project->id}/activity")->assertForbidden();
    }

    public function test_viewer_member_can_read_activity(): void
    {
        $task = $this->makeTask();
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));

        $this->getJson("/api/projects/tasks/{$task->id}/activity")->assertOk();
        $this->getJson("/api/projects/{$this->project->id}/activity")->assertOk();
    }
}
