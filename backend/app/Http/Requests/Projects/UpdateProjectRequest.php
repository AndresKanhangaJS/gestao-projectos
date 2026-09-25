<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Http\Requests\Projects\Concerns\ValidatesProjectLinks;
use App\Models\Projects\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

class UpdateProjectRequest extends FormRequest
{
    use ValidatesProjectLinks;

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->project());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $project = $this->project();

        return [
            'key' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('projects', 'key')->ignore($project)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', new Enum(ProjectStatus::class)],
            ...$this->projectLinkRules(),
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validateProjectLinks($validator, $this->project()),
        ];
    }

    private function project(): Project
    {
        /** @var Project $project */
        $project = $this->route('project');

        return $project;
    }
}
