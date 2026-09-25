<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Project;
use App\Rules\Projects\SingleActiveSprint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreSprintRequest extends FormRequest
{
    public const string CANNOT_CREATE_COMPLETED = 'Um sprint novo não pode ser criado já concluído.';

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('manageSprints', $this->project());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'goal' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => [
                'nullable',
                new Enum(SprintStatus::class),
                Rule::notIn([SprintStatus::Completed->value]),
                new SingleActiveSprint($this->project()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.not_in' => self::CANNOT_CREATE_COMPLETED,
        ];
    }

    private function project(): Project
    {
        /** @var Project $project */
        $project = $this->route('project');

        return $project;
    }
}
