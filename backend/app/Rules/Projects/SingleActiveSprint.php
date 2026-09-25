<?php

declare(strict_types=1);

namespace App\Rules\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Um projecto tem no máximo um sprint activo: rejeita `status=active` se já
 * existir outro sprint activo no projecto (ignorando o próprio, na edição).
 */
class SingleActiveSprint implements ValidationRule
{
    public const string MESSAGE = 'Já existe um sprint activo neste projecto.';

    public function __construct(
        private readonly Project $project,
        private readonly ?Sprint $ignore = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== SprintStatus::Active->value) {
            return;
        }

        $query = $this->project->sprints()->where('status', SprintStatus::Active->value);

        if ($this->ignore !== null) {
            $query->whereKeyNot($this->ignore->getKey());
        }

        if ($query->exists()) {
            $fail(self::MESSAGE);
        }
    }
}
