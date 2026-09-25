<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\GlobalRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** `GET /admin/users?search=&role=&status=active|inactive&page=`. */
class IndexUsersRequest extends FormRequest
{
    public const array STATUSES = ['active', 'inactive'];

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', User::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', Rule::enum(GlobalRole::class)],
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
        ];
    }
}
