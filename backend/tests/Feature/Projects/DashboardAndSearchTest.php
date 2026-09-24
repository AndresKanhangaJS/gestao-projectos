<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class DashboardAndSearchTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
    }

    public function test_dashboard_returns_counts_including_by_status_for_visible_projects_only(): void
    {
        $this->makeTask(['board_column_id' => $this->todoColumn->id, 'priority' => 'high', 'type' => 'bug', 'due_at' => now()->subDays(2)]);
        $this->makeTask(['board_column_id' => $this->todoColumn->id, 'priority' => 'low', 'type' => 'task', 'due_at' => null]);
        $this->makeTask(['board_column_id' => $this->doneColumn->id, 'priority' => 'high', 'type' => 'task', 'due_at' => now()->subDays(2)]);
        // Tarefa de outro workspace: não deve contar.
        Task::factory()->create();

        Sanctum::actingAs($this->owner);

        $this->getJson('/api/projects/dashboard')
            ->assertOk()
            ->assertJsonPath('projects_count', 1)
            ->assertJsonPath('tasks_count', 3)
            ->assertJsonPath('overdue_tasks_count', 1)
            ->assertJsonPath('tasks_by_priority.high', 2)
            ->assertJsonPath('tasks_by_type.task', 2)
            ->assertJsonPath('projects_by_status.active', 1)
            ->assertJsonPath('by_status', [
                ['name' => 'Por fazer', 'is_done_column' => false, 'total' => 2],
                ['name' => 'Concluído', 'is_done_column' => true, 'total' => 1],
            ]);
    }

    public function test_dashboard_for_global_manager_sees_all_projects(): void
    {
        Task::factory()->create();
        Role::findOrCreate('project_manager', 'web');
        $pm = User::factory()->create();
        $pm->assignRole('project_manager');
        Sanctum::actingAs($pm);

        $this->getJson('/api/projects/dashboard')
            ->assertOk()
            ->assertJsonPath('projects_count', Project::count())
            ->assertJsonPath('tasks_count', 1);
    }

    public function test_search_matches_title_and_description_and_respects_visibility(): void
    {
        $byTitle = $this->makeTask(['title' => 'Migrar servidor de email', 'description' => null]);
        $byDescription = $this->makeTask(['title' => 'Outra', 'description' => 'Rever o servidor antigo']);
        Task::factory()->create(['title' => 'servidor de outro workspace']);

        Sanctum::actingAs($this->owner);

        $ids = array_column($this->getJson('/api/projects/search?q=servidor')->assertOk()->json('data'), 'id');
        sort($ids);

        $this->assertSame([$byTitle->id, $byDescription->id], $ids);
    }

    public function test_search_requires_a_query_of_at_least_two_characters(): void
    {
        Sanctum::actingAs($this->owner);

        $this->getJson('/api/projects/search')->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->getJson('/api/projects/search?q=a')->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_dashboard_and_search_require_authentication(): void
    {
        $this->getJson('/api/projects/dashboard')->assertUnauthorized();
        $this->getJson('/api/projects/search?q=ab')->assertUnauthorized();
    }
}
