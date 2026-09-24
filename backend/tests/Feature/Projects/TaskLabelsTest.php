<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Models\Projects\Label;
use App\Models\Projects\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class TaskLabelsTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    private Label $backend;

    private Label $urgent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
        $this->backend = Label::factory()->create(['project_id' => $this->project->id, 'name' => 'Backend', 'color' => '#ff0000']);
        $this->urgent = Label::factory()->create(['project_id' => $this->project->id, 'name' => 'Urgente', 'color' => '#00ff00']);
        Sanctum::actingAs($this->owner);
    }

    public function test_labels_can_be_set_on_create_and_are_returned_with_id_name_color(): void
    {
        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Com etiquetas',
            'label_ids' => [$this->backend->id],
        ])->assertCreated()
            ->assertJsonCount(1, 'data.labels')
            ->assertJsonPath('data.labels.0.id', $this->backend->id)
            ->assertJsonPath('data.labels.0.name', 'Backend')
            ->assertJsonPath('data.labels.0.color', '#ff0000');
    }

    public function test_labels_are_synced_on_update_and_left_untouched_when_omitted(): void
    {
        $task = $this->makeTask();
        $task->labels()->attach($this->backend->id);

        $this->patchJson("/api/projects/tasks/{$task->id}", ['label_ids' => [$this->urgent->id]])
            ->assertOk()
            ->assertJsonCount(1, 'data.labels')
            ->assertJsonPath('data.labels.0.id', $this->urgent->id);

        $this->assertDatabaseMissing('task_labels', ['task_id' => $task->id, 'label_id' => $this->backend->id]);

        $this->patchJson("/api/projects/tasks/{$task->id}", ['title' => 'Só o título'])
            ->assertOk()
            ->assertJsonCount(1, 'data.labels');

        $this->patchJson("/api/projects/tasks/{$task->id}", ['label_ids' => []])
            ->assertOk()
            ->assertJsonCount(0, 'data.labels');
    }

    public function test_labels_from_another_project_are_rejected(): void
    {
        $foreign = Label::factory()->create(['project_id' => Project::factory()->create()->id]);
        $task = $this->makeTask();

        $this->patchJson("/api/projects/tasks/{$task->id}", ['label_ids' => [$foreign->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('label_ids.0');

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'X',
            'label_ids' => [$foreign->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('label_ids.0');
    }

    public function test_search_finds_tasks_by_label_name(): void
    {
        $labelled = $this->makeTask(['title' => 'Sem termo no título', 'description' => null]);
        $labelled->labels()->attach($this->urgent->id);
        $this->makeTask(['title' => 'Outra coisa', 'description' => null]);

        $this->getJson('/api/projects/search?q=Urgen')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $labelled->id)
            ->assertJsonPath('data.0.labels.0.name', 'Urgente');
    }

    public function test_task_index_can_be_filtered_by_label(): void
    {
        $labelled = $this->makeTask();
        $labelled->labels()->attach($this->backend->id);
        $this->makeTask();

        $this->getJson("/api/projects/{$this->project->id}/tasks?label_id={$this->backend->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $labelled->id);
    }

    public function test_task_index_filters_are_validated(): void
    {
        $this->getJson("/api/projects/{$this->project->id}/tasks?priority=nope&label_id=abc")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['priority', 'label_id']);
    }
}
