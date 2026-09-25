<?php

declare(strict_types=1);

namespace App\Rules\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Sprint;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Não permite colocar tarefas num sprint concluído. `$currentSprintId`
 * (edição) permite reenviar o sprint que a tarefa já tem, para que gravar o
 * formulário de uma tarefa antiga não falhe.
 */
class OpenSprint implements ValidationRule
{
    public const string MESSAGE = 'Não é possível colocar tarefas num sprint concluído.';

    public function __construct(private readonly ?int $currentSprintId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value) || (int) $value === $this->currentSprintId) {
            return;
        }

        $sprint = Sprint::query()->find((int) $value);

        if ($sprint !== null && $sprint->status === SprintStatus::Completed) {
            $fail(self::MESSAGE);
        }
    }
}
