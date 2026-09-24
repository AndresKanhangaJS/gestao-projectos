<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\User;
use Database\Factories\Projects\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'project_id',
    'board_column_id',
    'sprint_id',
    'parent_id',
    'reporter_id',
    'type',
    'priority',
    'title',
    'description',
    'estimate',
    'starts_at',
    'due_at',
    'position',
])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => TaskType::class,
            'priority' => TaskPriority::class,
            'estimate' => 'decimal:2',
            'starts_at' => 'date',
            'due_at' => 'date',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<BoardColumn, $this> */
    public function boardColumn(): BelongsTo
    {
        return $this->belongsTo(BoardColumn::class);
    }

    /** @return BelongsTo<Sprint, $this> */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    /**
     * Tarefa-mãe (quando esta é uma subtarefa).
     *
     * @return BelongsTo<Task, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /** Subtarefas desta tarefa. */
    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees')
            ->withTimestamps();
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'task_labels');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function watchers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_watchers')
            ->withTimestamps();
    }

    /** @return MorphMany<ActivityLog, $this> */
    public function activityLogs(): MorphMany
    {
        return $this->morphMany(ActivityLog::class, 'subject');
    }

    /** Relações em que esta tarefa é a origem (ex.: "bloqueia"). */
    public function relationsFrom(): HasMany
    {
        return $this->hasMany(TaskRelation::class, 'task_id');
    }

    /** Relações em que esta tarefa é o destino. */
    public function relationsTo(): HasMany
    {
        return $this->hasMany(TaskRelation::class, 'related_task_id');
    }
}
