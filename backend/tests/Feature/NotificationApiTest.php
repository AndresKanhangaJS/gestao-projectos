<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Projects\Task;
use App\Models\User;
use App\Notifications\Projects\TaskAssigned;
use App\Notifications\Projects\TaskCommented;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $actor;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actor = User::factory()->create(['name' => 'Carlos Infra']);
        $this->task = Task::factory()->create(['title' => 'Actualizar dependências']);
    }

    public function test_guest_cannot_access_notifications(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->postJson('/api/notifications/read-all')->assertUnauthorized();
        $this->postJson('/api/notifications/some-id/read')->assertUnauthorized();
    }

    public function test_lists_own_notifications_with_flattened_data_and_unread_count(): void
    {
        $this->user->notify(new TaskAssigned($this->task, $this->actor));
        $this->user->notify(new TaskCommented($this->task, $this->actor));
        $this->user->notifications()->where('type', 'task_assigned')->firstOrFail()->markAsRead();
        $this->actor->notify(new TaskCommented($this->task, $this->user));

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.unread_count', 1)
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonStructure([
                'data' => [['id', 'kind', 'message', 'task_id', 'task_title', 'project_id', 'actor' => ['id', 'name'], 'read_at', 'created_at']],
                'links',
                'meta' => ['current_page', 'total', 'unread_count'],
            ]);

        $commented = collect($response->json('data'))->firstWhere('kind', 'task_commented');
        $this->assertIsArray($commented);
        $this->assertIsString($commented['id']);
        $this->assertSame('Carlos Infra comentou a tarefa "Actualizar dependências".', $commented['message']);
        $this->assertSame($this->task->id, $commented['task_id']);
        $this->assertSame('Actualizar dependências', $commented['task_title']);
        $this->assertSame($this->task->project_id, $commented['project_id']);
        $this->assertSame(['id' => $this->actor->id, 'name' => 'Carlos Infra'], $commented['actor']);
        $this->assertNull($commented['read_at']);
        $this->assertIsString($commented['created_at']);

        $assigned = collect($response->json('data'))->firstWhere('kind', 'task_assigned');
        $this->assertIsArray($assigned);
        $this->assertIsString($assigned['read_at']);
    }

    public function test_unread_filter_returns_only_unread_notifications(): void
    {
        $this->user->notify(new TaskAssigned($this->task, $this->actor));
        $this->user->notify(new TaskCommented($this->task, $this->actor));
        $this->user->notifications()->where('type', 'task_assigned')->firstOrFail()->markAsRead();

        Sanctum::actingAs($this->user);

        $this->getJson('/api/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kind', 'task_commented')
            ->assertJsonPath('meta.unread_count', 1);
    }

    public function test_listing_is_paginated_by_15(): void
    {
        for ($i = 0; $i < 17; $i++) {
            $this->user->notify(new TaskCommented($this->task, $this->actor));
        }

        Sanctum::actingAs($this->user);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.total', 17)
            ->assertJsonPath('meta.unread_count', 17);

        $this->getJson('/api/notifications?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_user_can_mark_own_notification_as_read(): void
    {
        $this->user->notify(new TaskAssigned($this->task, $this->actor));
        $notification = $this->user->notifications()->firstOrFail();

        Sanctum::actingAs($this->user);

        $this->postJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $notification->id)
            ->assertJsonPath('data.kind', 'task_assigned');

        $this->assertNotNull($notification->fresh()?->read_at);
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $this->actor->notify(new TaskAssigned($this->task, $this->user));
        $foreign = $this->actor->notifications()->firstOrFail();

        Sanctum::actingAs($this->user);

        $this->postJson("/api/notifications/{$foreign->id}/read")->assertNotFound();

        $this->assertNull($foreign->fresh()?->read_at);
    }

    public function test_read_all_marks_only_own_notifications(): void
    {
        $this->user->notify(new TaskAssigned($this->task, $this->actor));
        $this->user->notify(new TaskCommented($this->task, $this->actor));
        $this->actor->notify(new TaskCommented($this->task, $this->user));

        Sanctum::actingAs($this->user);

        $this->postJson('/api/notifications/read-all')->assertNoContent();

        $this->assertSame(0, $this->user->unreadNotifications()->count());
        $this->assertSame(1, $this->actor->unreadNotifications()->count());

        $this->getJson('/api/notifications')->assertJsonPath('meta.unread_count', 0);
    }
}
