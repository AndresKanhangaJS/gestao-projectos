<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Models\Projects\Label;
use App\Models\Projects\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class TaskDetailTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_show_includes_comments_oldest_first_subtasks_assignees_watchers_and_labels(): void
    {
        $task = $this->makeTask(['title' => 'Mãe']);
        $author = User::factory()->create(['name' => 'Autora']);

        $second = TaskComment::factory()->create(['task_id' => $task->id, 'user_id' => $author->id, 'body' => 'Segundo', 'created_at' => now()]);
        $first = TaskComment::factory()->create(['task_id' => $task->id, 'user_id' => $author->id, 'body' => 'Primeiro', 'created_at' => now()->subHour()]);

        $this->makeTask(['parent_id' => $task->id, 'title' => 'Sub aberta', 'board_column_id' => $this->todoColumn->id, 'position' => 0]);
        $this->makeTask(['parent_id' => $task->id, 'title' => 'Sub feita', 'board_column_id' => $this->doneColumn->id, 'position' => 1]);

        $label = Label::factory()->create(['project_id' => $this->project->id]);
        $task->labels()->attach($label->id);
        $task->assignees()->attach($author->id);
        $task->watchers()->attach($this->owner->id);

        $response = $this->getJson("/api/projects/tasks/{$task->id}")->assertOk();

        $response->assertJsonPath('data.comments.0.id', $first->id)
            ->assertJsonPath('data.comments.0.body', 'Primeiro')
            ->assertJsonPath('data.comments.0.user.id', $author->id)
            ->assertJsonPath('data.comments.0.user.name', 'Autora')
            ->assertJsonPath('data.comments.1.id', $second->id)
            ->assertJsonStructure(['data' => ['comments' => [['id', 'body', 'user' => ['id', 'name'], 'created_at']]]])
            ->assertJsonCount(2, 'data.subtasks')
            ->assertJsonPath('data.subtasks.0.title', 'Sub aberta')
            ->assertJsonPath('data.subtasks.0.completed', false)
            ->assertJsonPath('data.subtasks.0.column.name', 'Por fazer')
            ->assertJsonPath('data.subtasks.1.completed', true)
            ->assertJsonPath('data.subtasks.1.board_column_id', $this->doneColumn->id)
            ->assertJsonPath('data.assignees.0.id', $author->id)
            ->assertJsonPath('data.watchers.0.id', $this->owner->id)
            ->assertJsonPath('data.labels.0.id', $label->id)
            ->assertJsonPath('data.column.id', $this->todoColumn->id)
            ->assertJsonPath('data.comments_count', 2)
            ->assertJsonPath('data.subtasks_count', 2);
    }

    public function test_index_does_not_include_heavy_relations(): void
    {
        $task = $this->makeTask();
        TaskComment::factory()->create(['task_id' => $task->id]);

        $this->getJson("/api/projects/{$this->project->id}/tasks")
            ->assertOk()
            ->assertJsonMissingPath('data.0.comments')
            ->assertJsonMissingPath('data.0.subtasks')
            ->assertJsonPath('data.0.comments_count', 1);
    }
}
