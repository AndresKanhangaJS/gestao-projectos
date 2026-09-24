<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Models\User;
use App\Services\Projects\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectDefaultBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_project_creates_a_default_board_with_default_columns(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $workspace->members()->attach($user->id, ['role' => WorkspaceRole::Owner->value]);
        Sanctum::actingAs($user);

        $projectId = $this->postJson("/api/projects/workspaces/{$workspace->id}/projects", [
            'key' => 'NOVO',
            'name' => 'Projecto novo',
        ])->assertCreated()
            ->assertJsonPath('data.boards_count', 1)
            ->json('data.id');

        $boards = $this->getJson("/api/projects/{$projectId}/boards")->assertOk()->json('data');

        $this->assertCount(1, $boards);
        $this->assertSame('Quadro principal', $boards[0]['name']);
        $this->assertTrue($boards[0]['is_default']);
        $this->assertSame(
            ['Por fazer', 'Em curso', 'Em revisão', 'Concluído'],
            array_column($boards[0]['columns'], 'name'),
        );
        $this->assertSame([0, 1, 2, 3], array_column($boards[0]['columns'], 'position'));
        $this->assertSame([false, false, false, true], array_column($boards[0]['columns'], 'is_done_column'));

        // O quadro por omissão permite criar tarefas de imediato.
        $this->postJson("/api/projects/{$projectId}/tasks", [
            'board_column_id' => $boards[0]['columns'][0]['id'],
            'type' => 'task',
            'title' => 'Primeira tarefa',
        ])->assertCreated();
    }

    public function test_service_creates_board_atomically_with_the_project(): void
    {
        $workspace = Workspace::factory()->create();

        $project = app(ProjectService::class)->create($workspace, ['key' => 'SRV', 'name' => 'Via serviço']);

        $this->assertInstanceOf(Project::class, $project);
        $this->assertSame('active', $project->status->value);
        $this->assertDatabaseHas('boards', ['project_id' => $project->id, 'is_default' => true, 'name' => 'Quadro principal']);
        $this->assertSame(4, $project->boards()->first()?->columns()->count());
    }
}
