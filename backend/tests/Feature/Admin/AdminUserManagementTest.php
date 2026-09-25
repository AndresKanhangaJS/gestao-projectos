<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Workspace;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->userWithRole('admin');
    }

    /** @return array<string, array{0: string, 1: string}> */
    public static function adminEndpoints(): array
    {
        return [
            'list users' => ['GET', '/api/admin/users?status=bogus'],
            'roles' => ['GET', '/api/admin/roles'],
            'create user' => ['POST', '/api/admin/users'],
            'update user' => ['PATCH', '/api/admin/users/{user}'],
            'reset password' => ['POST', '/api/admin/users/{user}/password'],
            'deactivate' => ['POST', '/api/admin/users/{user}/deactivate'],
            'activate' => ['POST', '/api/admin/users/{user}/activate'],
        ];
    }

    #[DataProvider('adminEndpoints')]
    public function test_non_admins_get_403_before_validation(string $method, string $uri): void
    {
        $target = User::factory()->create();
        $uri = str_replace('{user}', (string) $target->id, $uri);

        foreach (['project_manager', 'infra', 'member'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));
            $this->json($method, $uri, ['email' => 'not-an-email', 'roles' => ['client_viewer']])->assertForbidden();
        }

        Sanctum::actingAs(User::factory()->create());
        $this->json($method, $uri, [])->assertForbidden();
    }

    public function test_admin_endpoints_require_authentication(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_roles_lists_only_assignable_roles(): void
    {
        Sanctum::actingAs($this->admin);

        $roles = $this->getJson('/api/admin/roles')->assertOk()->json();

        $this->assertSame(['admin', 'project_manager', 'infra', 'member'], array_column($roles, 'name'));
        $this->assertSame('Administrador', $roles[0]['label_pt']);
        foreach ($roles as $role) {
            $this->assertSame(['name', 'label_pt', 'description_pt'], array_keys($role));
            $this->assertNotSame('', $role['description_pt']);
        }
    }

    public function test_index_lists_filters_and_paginates(): void
    {
        $pm = $this->userWithRole('project_manager');
        $pm->forceFill(['name' => 'Paula Gestora', 'email' => 'paula@example.test'])->save();
        $inactive = $this->userWithRole('member');
        $inactive->forceFill(['is_active' => false])->save();
        User::factory()->count(20)->create();

        $workspace = Workspace::factory()->create(['owner_id' => $pm->id]);
        $workspace->members()->attach($pm->id, ['role' => WorkspaceRole::Owner->value]);

        Sanctum::actingAs($this->admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 23);

        $this->getJson('/api/admin/users?search=paula@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0', [
                'id' => $pm->id,
                'name' => 'Paula Gestora',
                'email' => 'paula@example.test',
                'roles' => ['project_manager'],
                'is_active' => true,
                'must_change_password' => false,
                'last_login_at' => null,
                'created_at' => $pm->created_at?->toJSON(),
                'workspaces_count' => 1,
            ]);

        $this->assertSame([$pm->id], array_column($this->getJson('/api/admin/users?role=project_manager')->json('data'), 'id'));
        $this->assertSame([$inactive->id], array_column($this->getJson('/api/admin/users?status=inactive')->json('data'), 'id'));
        $this->assertSame(22, $this->getJson('/api/admin/users?status=active')->json('meta.total'));

        $this->getJson('/api/admin/users?status=bogus&role=bogus')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'role']);
    }

    public function test_admin_creates_user_with_roles(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/admin/users', [
            'name' => 'Nova Técnica',
            'email' => 'tecnica@example.test',
            'password' => 'segredo123',
            'password_confirmation' => 'segredo123',
            'roles' => ['infra', 'member'],
        ])->assertCreated()
            ->assertJsonPath('data.email', 'tecnica@example.test')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.workspaces_count', 0)
            ->assertJsonMissingPath('data.password');

        $this->assertEqualsCanonicalizing(['infra', 'member'], $response->json('data.roles'));
        $user = User::where('email', 'tecnica@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('segredo123', $user->password));
        $this->assertTrue($user->hasRole('infra'));
    }

    public function test_create_validation(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/admin/users', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'roles']);

        $this->postJson('/api/admin/users', [
            'name' => 'X',
            'email' => $this->admin->email,
            'password' => 'curta',
            'password_confirmation' => 'diferente',
            'roles' => [],
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'roles']);

        $this->postJson('/api/admin/users', [
            'name' => 'X',
            'email' => 'x@example.test',
            'password' => 'segredo123',
            'password_confirmation' => 'segredo123',
            'roles' => ['client_viewer'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['roles.0' => 'Papel inválido ou não atribuível.']);
    }

    public function test_admin_updates_name_email_and_roles(): void
    {
        $user = $this->userWithRole('member');
        Sanctum::actingAs($this->admin);

        $this->patchJson("/api/admin/users/{$user->id}", [
            'name' => 'Renomeado',
            'email' => 'renomeado@example.test',
            'roles' => ['project_manager'],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renomeado')
            ->assertJsonPath('data.roles', ['project_manager']);

        $this->assertFalse($user->fresh()?->hasRole('member'));

        $this->patchJson("/api/admin/users/{$user->id}", ['email' => $this->admin->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
        $this->patchJson("/api/admin/users/{$user->id}", ['roles' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('roles');
    }

    public function test_admin_cannot_remove_own_admin_role(): void
    {
        $this->userWithRole('admin'); // existe outro admin: a regra é mesmo "o próprio".
        Sanctum::actingAs($this->admin);

        $this->patchJson("/api/admin/users/{$this->admin->id}", ['roles' => ['member']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['roles' => 'Não pode retirar o seu próprio papel de administrador.']);

        $this->patchJson("/api/admin/users/{$this->admin->id}", ['roles' => ['admin', 'infra'], 'name' => 'Admin'])->assertOk();
    }

    public function test_admin_safeguards_on_deactivate_and_activate(): void
    {
        $target = $this->userWithRole('admin');
        Sanctum::actingAs($this->admin);

        // 2 admins activos: desactivar o outro é permitido.
        $this->postJson("/api/admin/users/{$target->id}/deactivate")->assertOk()->assertJsonPath('data.is_active', false);

        // Nunca a si próprio (e assim nunca se fica sem admin activo: o actor é sempre um).
        $this->postJson("/api/admin/users/{$this->admin->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'Não pode desactivar a sua própria conta.']);
        $this->assertTrue((bool) $this->admin->fresh()?->is_active);

        $this->postJson("/api/admin/users/{$target->id}/activate")->assertOk()->assertJsonPath('data.is_active', true);
    }

    public function test_active_admin_count_used_by_the_last_admin_safeguard(): void
    {
        $service = app(UserAccountService::class);
        $second = $this->userWithRole('admin');
        $inactive = $this->userWithRole('admin');
        $inactive->forceFill(['is_active' => false])->save();
        $this->userWithRole('project_manager');

        $this->assertSame(2, $service->activeAdminCount());
        $this->assertSame(1, $service->activeAdminCount($second));

        $second->forceFill(['is_active' => false])->save();
        // Só resta o $this->admin: retirar-lhe o admin/desactivá-lo deixaria 0 admins activos.
        $this->assertSame(0, $service->activeAdminCount($this->admin));
    }

    public function test_deactivate_revokes_tokens_sessions_and_blocks_requests(): void
    {
        $user = $this->userWithRole('member');
        $user->createToken('cli');
        DB::table('sessions')->insert([
            'id' => 'sess-1', 'user_id' => $user->id, 'payload' => 'x', 'last_activity' => time(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'sess-other', 'user_id' => $this->admin->id, 'payload' => 'x', 'last_activity' => time(),
        ]);
        $rememberBefore = $user->remember_token;

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/users/{$user->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['id' => 'sess-1']);
        $this->assertDatabaseHas('sessions', ['id' => 'sess-other']);
        $this->assertNotSame($rememberBefore, $user->fresh()?->remember_token);

        // Um pedido autenticado de uma conta inactiva é bloqueado (401).
        Sanctum::actingAs($user->fresh() ?? $user);
        $this->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'A sua conta está desactivada. Contacte um administrador.');
        $this->getJson('/api/projects/workspaces')->assertUnauthorized();
    }

    public function test_reset_password_revokes_access(): void
    {
        $user = $this->userWithRole('member');
        $user->createToken('cli');
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/users/{$user->id}/password", ['password' => 'curta'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson("/api/admin/users/{$user->id}/password", [
            'password' => 'nova-password',
            'password_confirmation' => 'nova-password',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('nova-password', (string) $user->fresh()?->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_me_includes_is_active(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/me')->assertOk()->assertJsonPath('is_active', true);
    }

    public function test_there_is_no_delete_endpoint(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($this->admin);

        $this->deleteJson("/api/admin/users/{$user->id}")->assertStatus(405);
        $this->assertModelExists($user);
    }
}
