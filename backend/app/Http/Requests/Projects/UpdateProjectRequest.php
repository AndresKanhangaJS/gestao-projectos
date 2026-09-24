<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\ProjectStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $project = $this->route('project');

        return [
            'key' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('projects', 'key')->ignore($project)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', new Enum(ProjectStatus::class)],
        ];
    }
}
