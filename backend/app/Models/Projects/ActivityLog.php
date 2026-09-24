<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\ActivityEvent;
use App\Models\User;
use Database\Factories\Projects\ActivityLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Registo imutável do histórico de actividade (escrito por App\Services\Projects\ActivityLogger).
 *
 * @property ActivityEvent $event
 * @property array<string, mixed>|null $changes
 */
#[Fillable(['project_id', 'subject_type', 'subject_id', 'causer_id', 'event', 'changes'])]
class ActivityLog extends Model
{
    /** @use HasFactory<ActivityLogFactory> */
    use HasFactory;

    /**
     * Registos de auditoria são imutáveis: só existe `created_at`.
     */
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'changes' => 'array',
            'event' => ActivityEvent::class,
        ];
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function causer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'causer_id');
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
