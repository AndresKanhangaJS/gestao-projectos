<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Models\Infra\SoftwareProduct;
use Illuminate\Foundation\Http\FormRequest;

class StoreSoftwareProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('create', SoftwareProduct::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ];
    }
}
