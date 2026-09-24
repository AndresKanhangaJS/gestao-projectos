<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

class StoreBoardRequest extends FormRequest
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
