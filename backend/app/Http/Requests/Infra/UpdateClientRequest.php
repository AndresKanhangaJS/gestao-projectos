<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\ClientStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('client'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', Rule::enum(ClientStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
