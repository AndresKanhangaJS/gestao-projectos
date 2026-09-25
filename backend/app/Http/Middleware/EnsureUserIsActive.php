<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueia (401) qualquer pedido autenticado de uma conta desactivada — mesmo
 * que ainda exista uma sessão/token de antes da desactivação.
 * Usar a seguir a `auth:sanctum` (alias `active`).
 */
class EnsureUserIsActive
{
    public const string INACTIVE_MESSAGE = 'A sua conta está desactivada. Contacte um administrador.';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->is_active === false) {
            return response()->json(['message' => self::INACTIVE_MESSAGE], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
