<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\ClientSoftwareStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientSoftwareRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('client_software'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'software_product_id' => ['sometimes', 'required', 'integer', 'exists:software_products,id'],
            'status' => ['sometimes', Rule::enum(ClientSoftwareStatus::class)],
            'activated_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
