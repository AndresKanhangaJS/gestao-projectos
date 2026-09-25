<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\BoardColumn;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBoardColumnRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var BoardColumn $column */
        $column = $this->route('column');

        return (bool) $this->user()?->can('manageBoard', $column->board->project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_done_column' => ['sometimes', 'boolean'],
        ];
    }
}
