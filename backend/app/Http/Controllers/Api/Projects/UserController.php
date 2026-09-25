<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\IndexUsersRequest;
use App\Http\Resources\Projects\UserSummaryResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/** Directório de utilizadores para o seletor de membros do workspace. */
class UserController extends Controller
{
    private const int PER_PAGE = 20;

    public function index(IndexUsersRequest $request): JsonResponse
    {
        $term = $request->term();

        $users = User::query()
            ->when($term, fn (Builder $query, string $term) => $query->where(
                fn (Builder $q) => $q->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")
            ))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return UserSummaryResource::collection($users)->response();
    }
}
