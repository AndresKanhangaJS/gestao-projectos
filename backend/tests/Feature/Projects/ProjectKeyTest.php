<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class ProjectKeyTest extends TestCase
{
    use BuildsProjectContext;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_key_is_stored_uppercase_without_spaces(): void
    {
        $this->postJson("/api/projects/workspaces/{$this->workspace->id}/projects", [
            'key' => ' level rh ',
            'name' => 'Level RH',
        ])->assertCreated()->assertJsonPath('data.key', 'LEVELRH');
    }

    public function test_key_rejects_invalid_characters(): void
    {
        $this->postJson("/api/projects/workspaces/{$this->workspace->id}/projects", [
            'key' => 'RH#1',
            'name' => 'Level RH',
        ])->assertUnprocessable()->assertJsonValidationErrors(['key']);
    }

    public function test_key_must_be_unique_regardless_of_case(): void
    {
        $this->project->update(['key' => 'GPS']);

        $this->postJson("/api/projects/workspaces/{$this->workspace->id}/projects", [
            'key' => 'gps',
            'name' => 'Outro',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.key.0', 'Já existe um projecto com esta chave.');
    }

    public function test_key_is_normalised_on_update(): void
    {
        $this->patchJson("/api/projects/{$this->project->id}", ['key' => 'novo-proj'])
            ->assertOk()
            ->assertJsonPath('data.key', 'NOVO-PROJ');
    }
}
