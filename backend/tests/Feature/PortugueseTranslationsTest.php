<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Arr;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PortugueseTranslationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // O ambiente já usa APP_LOCALE=pt; fixado aqui para o teste ser determinístico.
        $this->app->setLocale('pt');
    }

    public function test_validation_errors_are_returned_in_portuguese_with_readable_attributes(): void
    {
        Role::findOrCreate('infra', 'web');
        $user = User::factory()->create();
        $user->assignRole('infra');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/infra/clients', ['contact_email' => 'nao-e-email'])
            ->assertUnprocessable();

        $response->assertJsonPath('errors.name.0', 'O campo nome é obrigatório.')
            ->assertJsonPath('errors.contact_email.0', 'O campo email do contacto tem de ser um endereço de email válido.')
            ->assertJsonPath('message', 'O campo nome é obrigatório. (e mais 1 erro)');

        $this->assertStringNotContainsString('validation.', $response->getContent());
    }

    public function test_nested_attributes_and_size_rules_are_translated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/projects/search?q=a')
            ->assertUnprocessable()
            ->assertJsonPath('errors.q.0', 'O campo pesquisa tem de ter pelo menos 2 caracteres.');
    }

    /** Todas as chaves de validação do Laravel têm tradução pt (evita "validation.xxx" na UI). */
    public function test_portuguese_files_cover_every_framework_key(): void
    {
        $frameworkLang = base_path('vendor/laravel/framework/src/Illuminate/Translation/lang/en');

        foreach (['validation', 'auth', 'pagination', 'passwords'] as $file) {
            $en = Arr::dot(Arr::except(require "{$frameworkLang}/{$file}.php", ['custom', 'attributes']));
            $pt = Arr::dot(Arr::except(require lang_path("pt/{$file}.php"), ['custom', 'attributes']));

            $this->assertSame([], array_values(array_diff(array_keys($en), array_keys($pt))), "Chaves em falta em lang/pt/{$file}.php");
        }
    }
}
