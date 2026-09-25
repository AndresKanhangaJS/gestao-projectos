<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Board;
use Illuminate\Foundation\Http\FormRequest;

class StoreBoardColumnRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Board $board */
        $board = $this->route('board');

        return (bool) $this->user()?->can('manageBoard', $board->project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'integer', 'min:0'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_done_column' => ['nullable', 'boolean'],
        ];
    }
}
