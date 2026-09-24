<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\CredentialType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('credential'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'required', Rule::enum(CredentialType::class)],
            'username' => ['nullable', 'string', 'max:255'],
            // Omitido = não altera; presente tem de ser não vazio (nunca apagar o segredo com null/"").
            'secret' => ['sometimes', 'filled', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
