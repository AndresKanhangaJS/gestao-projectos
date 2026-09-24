<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

/** `GET /projects/search?q=...` — pesquisa por título/descrição da tarefa ou nome de etiqueta. */
class SearchTasksRequest extends FormRequest
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
            'q' => ['required', 'string', 'min:2', 'max:255'],
        ];
    }

    public function term(): string
    {
        return (string) $this->validated('q');
    }
}
