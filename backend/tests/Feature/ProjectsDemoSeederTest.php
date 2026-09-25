<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use App\Models\Projects\Workspace;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectsDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_sprints_members_and_assignees_are_seeded_idempotently(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $workspace = Workspace::where('slug', 'level-soft')->firstOrFail();
        $roles = $workspace->members()->get()->mapWithKeys(
            fn (User $user) => [$user->email => $user->getAttribute('pivot')->getAttribute('role')]
        )->all();

        $this->assertEqualsCanonicalizing([
            'admin@level-soft.local' => 'owner',
            'gestor@level-soft.local' => 'manager',
            'membro@level-soft.local' => 'member',
            'infra@level-soft.local' => 'viewer',
        ], $roles);

        $project = Project::where('key', 'GPS')->firstOrFail();
        $this->assertSame(2, $project->sprints()->count());

        $sprintOne = Sprint::where('project_id', $project->id)->where('name', 'Sprint 1')->firstOrFail();
        $sprintTwo = Sprint::where('project_id', $project->id)->where('name', 'Sprint 2')->firstOrFail();
        $this->assertSame('active', $sprintOne->status->value);
        $this->assertSame('planned', $sprintTwo->status->value);
        $this->assertSame(1, $project->sprints()->where('status', 'active')->count());

        $this->assertSame(4, $sprintOne->tasks()->count());
        $this->assertSame(2, $sprintTwo->tasks()->count());
        $this->assertSame(2, $project->tasks()->whereNull('sprint_id')->count());

        // Todos os responsáveis são membros do workspace com papel owner|manager|member (nunca viewer).
        $memberIds = $workspace->members()->wherePivotIn('role', ['owner', 'manager', 'member'])->pluck('users.id')->all();
        $project->tasks()->with('assignees')->get()->each(function ($task) use ($memberIds): void {
            foreach ($task->assignees as $assignee) {
                $this->assertContains($assignee->id, $memberIds);
            }
        });
        $this->assertGreaterThan(0, $project->tasks()->has('assignees')->count());

        // Ligação ao Controlo de Software: Level-RH na instalação Pitruca, módulos Front-end + Back-end.
        $project->refresh();
        $this->assertSame('Level-RH', $project->softwareProduct?->name);
        $this->assertSame('Pitruca', $project->client?->name);
        $this->assertEqualsCanonicalizing(['Front-end', 'Back-end'], $project->modules()->pluck('name')->all());
    }
}
