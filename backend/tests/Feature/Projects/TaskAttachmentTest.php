<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

class TaskAttachmentTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
        $this->buildProjectContext();
        Sanctum::actingAs($this->owner);
    }

    public function test_upload_stores_on_private_disk_and_returns_download_url_not_public_url(): void
    {
        $task = $this->makeTask();

        $response = $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent('notas.txt', 'conteúdo confidencial'),
        ])->assertCreated()
            ->assertJsonPath('data.original_name', 'notas.txt')
            ->assertJsonPath('data.uploader.id', $this->owner->id)
            ->assertJsonMissingPath('data.url');

        $attachment = TaskAttachment::findOrFail($response->json('data.id'));

        $response->assertJsonPath(
            'data.download_url',
            "/api/projects/tasks/{$task->id}/attachments/{$attachment->id}/download",
        );

        Storage::disk('local')->assertExists($attachment->path);
        $this->assertSame([], Storage::disk('public')->allFiles());

        $this->getJson("/api/projects/tasks/{$task->id}/attachments")
            ->assertOk()
            ->assertJsonPath('data.0.download_url', "/api/projects/tasks/{$task->id}/attachments/{$attachment->id}/download");
    }

    public function test_workspace_member_can_download_attachment(): void
    {
        $task = $this->makeTask();
        $attachmentId = $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent('notas.txt', 'conteúdo confidencial'),
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));

        $response = $this->get("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}/download");

        $response->assertOk();
        $this->assertStringContainsString('notas.txt', (string) $response->headers->get('Content-Disposition'));
        $this->assertSame('conteúdo confidencial', $response->streamedContent());
    }

    public function test_outsider_cannot_download_attachment(): void
    {
        $task = $this->makeTask();
        $attachmentId = $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent('notas.txt', 'conteúdo confidencial'),
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}/download")->assertForbidden();
        $this->getJson("/api/projects/tasks/{$task->id}/attachments")->assertForbidden();
    }

    public function test_attachment_of_another_task_returns_404(): void
    {
        $task = $this->makeTask();
        $other = $this->makeTask();
        $attachmentId = $this->postJson("/api/projects/tasks/{$other->id}/attachments", [
            'file' => UploadedFile::fake()->create('a.pdf', 5),
        ])->assertCreated()->json('data.id');

        $this->getJson("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}/download")->assertNotFound();
        $this->deleteJson("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}")->assertNotFound();
    }

    public function test_delete_removes_file_from_private_disk(): void
    {
        $task = $this->makeTask();
        $attachmentId = $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('a.pdf', 5),
        ])->assertCreated()->json('data.id');
        $path = TaskAttachment::findOrFail($attachmentId)->path;

        $this->deleteJson("/api/projects/tasks/{$task->id}/attachments/{$attachmentId}")->assertNoContent();

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('task_attachments', ['id' => $attachmentId]);
    }

    public function test_viewer_cannot_upload(): void
    {
        $task = $this->makeTask();
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));

        $this->postJson("/api/projects/tasks/{$task->id}/attachments", [
            'file' => UploadedFile::fake()->create('a.pdf', 5),
        ])->assertForbidden();
    }
}
