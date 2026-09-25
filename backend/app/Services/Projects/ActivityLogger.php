<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Enums\Projects\ActivityEvent;
use App\Enums\Projects\TaskRelationType;
use App\Models\Projects\ActivityLog;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Label;
use App\Models\Projects\Task;
use App\Models\Projects\TaskAttachment;
use App\Models\Projects\TaskComment;
use App\Models\Projects\TaskRelation;
use App\Models\User;
use BackedEnum;
use Illuminate\Support\Str;

/**
 * Escreve (e descreve) o histórico de actividade das tarefas.
 *
 * Todos os registos têm como `subject` a tarefa afectada e guardam o
 * `project_id` desnormalizado, para que o histórico do projecto sobreviva à
 * remoção da tarefa. `changes` é sempre um objecto JSON (ou null):
 * - task_updated: `{campo: {old, new}}` apenas para os campos alterados;
 * - restantes eventos: o contexto mínimo para descrever a acção.
 */
class ActivityLogger
{
    /**
     * Campos da tarefa acompanhados em `task_updated` e o respectivo rótulo (pt).
     *
     * @var array<string, string>
     */
    public const array TRACKED_TASK_FIELDS = [
        'title' => 'título',
        'description' => 'descrição',
        'type' => 'tipo',
        'priority' => 'prioridade',
        'sprint_id' => 'sprint',
        'parent_id' => 'tarefa-mãe',
        'estimate' => 'estimativa',
        'starts_at' => 'data de início',
        'due_at' => 'prazo',
    ];

    private const int COMMENT_EXCERPT_LENGTH = 120;

    /**
     * @param  array<string, mixed>|null  $changes
     */
    public function log(Task $task, ActivityEvent $event, ?User $actor, ?array $changes = null): ActivityLog
    {
        return ActivityLog::create([
            'project_id' => $task->project_id,
            'subject_type' => $task->getMorphClass(),
            'subject_id' => $task->getKey(),
            'causer_id' => $actor?->getKey(),
            'event' => $event,
            'changes' => $changes === [] ? null : $changes,
        ]);
    }

    public function taskCreated(Task $task, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::TaskCreated, $actor, [
            'title' => ['old' => null, 'new' => $task->title],
        ]);
    }

    /**
     * Regista apenas os campos efectivamente alterados. Não escreve nada se
     * nenhum campo acompanhado mudou.
     *
     * @param  array<string, mixed>  $before  atributos "raw" antes da actualização (`$task->getRawOriginal()`)
     */
    public function taskUpdated(Task $task, array $before, ?User $actor): ?ActivityLog
    {
        $changes = [];

        foreach (array_keys(self::TRACKED_TASK_FIELDS) as $field) {
            $old = $this->normalize($field, $before[$field] ?? null);
            $new = $this->normalize($field, $task->getRawOriginal($field));

            if ($old !== $new) {
                $changes[$field] = ['old' => $old, 'new' => $new];
            }
        }

        return $changes === [] ? null : $this->log($task, ActivityEvent::TaskUpdated, $actor, $changes);
    }

    public function taskMoved(Task $task, BoardColumn $from, BoardColumn $to, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::TaskMoved, $actor, [
            'board_column' => [
                'old' => ['id' => $from->id, 'name' => $from->name],
                'new' => ['id' => $to->id, 'name' => $to->name],
            ],
        ]);
    }

    public function taskDeleted(Task $task, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::TaskDeleted, $actor, [
            'title' => ['old' => $task->title, 'new' => null],
        ]);
    }

    public function commentAdded(Task $task, TaskComment $comment, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::CommentAdded, $actor, [
            'comment' => [
                'id' => $comment->id,
                'excerpt' => Str::limit((string) $comment->body, self::COMMENT_EXCERPT_LENGTH),
            ],
        ]);
    }

    /**
     * @param  array<int, int|string>  $attachedIds
     * @param  array<int, int|string>  $detachedIds
     */
    public function assigneesChanged(Task $task, array $attachedIds, array $detachedIds, ?User $actor): ?ActivityLog
    {
        if ($attachedIds === [] && $detachedIds === []) {
            return null;
        }

        return $this->log($task, ActivityEvent::AssigneesChanged, $actor, [
            'assignees' => [
                'added' => $this->userSummaries($attachedIds),
                'removed' => $this->userSummaries($detachedIds),
            ],
        ]);
    }

    /**
     * @param  array<int, int|string>  $attachedIds
     * @param  array<int, int|string>  $detachedIds
     */
    public function labelsChanged(Task $task, array $attachedIds, array $detachedIds, ?User $actor): ?ActivityLog
    {
        if ($attachedIds === [] && $detachedIds === []) {
            return null;
        }

        return $this->log($task, ActivityEvent::LabelsChanged, $actor, [
            'labels' => [
                'added' => $this->labelSummaries($attachedIds),
                'removed' => $this->labelSummaries($detachedIds),
            ],
        ]);
    }

    public function attachmentAdded(Task $task, TaskAttachment $attachment, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::AttachmentAdded, $actor, [
            'attachment' => ['id' => $attachment->id, 'name' => $attachment->original_name],
        ]);
    }

    public function attachmentRemoved(Task $task, TaskAttachment $attachment, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::AttachmentRemoved, $actor, [
            'attachment' => ['id' => $attachment->id, 'name' => $attachment->original_name],
        ]);
    }

    public function subtaskCreated(Task $parent, Task $subtask, ?User $actor): ActivityLog
    {
        return $this->log($parent, ActivityEvent::SubtaskCreated, $actor, [
            'subtask' => ['id' => $subtask->id, 'title' => $subtask->title],
        ]);
    }

    public function relationAdded(Task $task, TaskRelation $relation, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::RelationAdded, $actor, ['relation' => $this->relationSummary($relation)]);
    }

    public function relationRemoved(Task $task, TaskRelation $relation, ?User $actor): ActivityLog
    {
        return $this->log($task, ActivityEvent::RelationRemoved, $actor, ['relation' => $this->relationSummary($relation)]);
    }

    /**
     * Frase legível (pt) que descreve o registo, ex.:
     * "Ana Silva moveu a tarefa «Corrigir login» de «Por fazer» para «Em curso».".
     * Espera `causer` e `subject` carregados (evita N+1 nas listagens).
     */
    public function describe(ActivityLog $log): string
    {
        $actor = $log->causer instanceof User ? $log->causer->name : 'Sistema';
        $changes = $log->changes ?? [];
        $subject = $log->subject;
        $title = $subject instanceof Task
            ? $subject->title
            : ($changes['title']['old'] ?? $changes['title']['new'] ?? '#'.$log->subject_id);

        $sentence = sprintf('%s %s «%s»', $actor, $log->event->verb(), $title);

        $suffix = match ($log->event) {
            ActivityEvent::TaskUpdated => ' ('.implode(', ', array_map(
                fn (string $field): string => self::TRACKED_TASK_FIELDS[$field] ?? $field,
                array_keys($changes),
            )).')',
            ActivityEvent::TaskMoved => sprintf(
                ' de «%s» para «%s»',
                $changes['board_column']['old']['name'] ?? '?',
                $changes['board_column']['new']['name'] ?? '?',
            ),
            ActivityEvent::SubtaskCreated => sprintf(': «%s»', $changes['subtask']['title'] ?? '?'),
            ActivityEvent::AttachmentAdded, ActivityEvent::AttachmentRemoved => sprintf(
                ' («%s»)',
                $changes['attachment']['name'] ?? '?',
            ),
            ActivityEvent::RelationAdded, ActivityEvent::RelationRemoved => sprintf(
                ' (%s «%s»)',
                TaskRelationType::tryFrom((string) ($changes['relation']['type'] ?? ''))?->label() ?? '?',
                $changes['relation']['related_task']['title'] ?? '?',
            ),
            default => '',
        };

        return $sentence.$suffix.'.';
    }

    /** @return array{id: int, type: string, related_task: array{id: int, title: string|null}} */
    private function relationSummary(TaskRelation $relation): array
    {
        /** @var Task|null $related */
        $related = $relation->relatedTask;

        return [
            'id' => (int) $relation->id,
            'type' => $relation->type->value,
            'related_task' => ['id' => (int) $relation->related_task_id, 'title' => $related?->title],
        ];
    }

    /**
     * @param  array<int, int|string>  $ids
     * @return list<array{id: int, name: string}>
     */
    private function userSummaries(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return User::query()->whereKey($ids)->orderBy('id')->get(['id', 'name'])
            ->map(fn (User $user): array => ['id' => (int) $user->id, 'name' => (string) $user->name])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int|string>  $ids
     * @return list<array{id: int, name: string}>
     */
    private function labelSummaries(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return Label::query()->whereKey($ids)->orderBy('id')->get(['id', 'name'])
            ->map(fn (Label $label): array => ['id' => (int) $label->id, 'name' => (string) $label->name])
            ->values()
            ->all();
    }

    private function normalize(string $field, mixed $value): string|int|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof BackedEnum) {
            $value = $value->value;
        }

        return match ($field) {
            'starts_at', 'due_at' => substr((string) $value, 0, 10),
            'estimate' => sprintf('%.2f', (float) $value),
            'sprint_id', 'parent_id' => (int) $value,
            default => (string) $value,
        };
    }
}
