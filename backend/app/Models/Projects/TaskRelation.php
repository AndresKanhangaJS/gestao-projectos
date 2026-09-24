<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\TaskRelationType;
use Database\Factories\Projects\TaskRelationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property TaskRelationType $type
 */
#[Fillable(['task_id', 'related_task_id', 'type'])]
class TaskRelation extends Model
{
    /** @use HasFactory<TaskRelationFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => TaskRelationType::class,
        ];
    }

    /**
     * Tarefa de origem da relação.
     *
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Tarefa relacionada (destino).
     *
     * @return BelongsTo<Task, $this>
     */
    public function relatedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'related_task_id');
    }
}
