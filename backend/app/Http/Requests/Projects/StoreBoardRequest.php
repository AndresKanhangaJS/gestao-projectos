<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Project $project */
        $project = $this->route('project');

        return (bool) $this->user()?->can('manageBoard', $project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'is_default' => ['nullable', 'boolean'],
            // Por omissão (true) o quadro nasce com as colunas base de ProjectService::DEFAULT_COLUMNS.
            'with_default_columns' => ['sometimes', 'boolean'],
        ];
    }

    public function withDefaultColumns(): bool
    {
        return $this->boolean('with_default_columns', true);
    }
}
