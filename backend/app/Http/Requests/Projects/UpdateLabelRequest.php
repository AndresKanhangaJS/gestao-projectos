<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Label;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Label $label */
        $label = $this->route('label');

        return (bool) $this->user()?->can('manageLabels', $label->project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
        ];
    }
}
