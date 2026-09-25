<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Board;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBoardRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
