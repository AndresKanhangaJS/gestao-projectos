<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enquanto `must_change_password` estiver ligado (conta criada ou password
 * reposta pelo admin), bloqueia (403) todos os pedidos autenticados excepto
 * `GET /me`, `PUT /me/password` e `POST /logout` (excluídos nas rotas).
 * Alias `password.changed`, a seguir a `auth:sanctum` + `active`.
 */
class EnsurePasswordChanged
{
    public const string MESSAGE = 'Tem de alterar a sua palavra-passe antes de continuar.';

    public const string CODE = 'password_change_required';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->must_change_password === true) {
            return response()->json(['message' => self::MESSAGE, 'code' => self::CODE], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
