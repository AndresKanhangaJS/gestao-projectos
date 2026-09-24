<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\ClientStatus;
use App\Models\Infra\Client;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('create', Client::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', Rule::enum(ClientStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
