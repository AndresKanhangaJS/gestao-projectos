<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Autenticação SPA (Sanctum stateful, cookie de sessão).
 *
 * O Sanctum só arranca a sessão quando o pedido vem de um domínio listado em
 * SANCTUM_STATEFUL_DOMAINS (Origin/Referer). Fora disso não há sessão e
 * login/registo não são possíveis: responde-se 419 com mensagem clara em vez
 * de rebentar com 500 ("Session store not set on request").
 */
class AuthController extends Controller
{
    /** HTTP 419 ("Page Expired"), o mesmo código que o Laravel usa para sessão/CSRF inválidos. */
    private const int SESSION_UNAVAILABLE = 419;

    private const string NO_SESSION_MESSAGE = 'Sessão indisponível: o pedido não foi reconhecido como vindo da aplicação (domínio não autorizado). Obtenha primeiro /sanctum/csrf-cookie a partir de um domínio autorizado e tente novamente.';

    public function register(RegisterRequest $request): JsonResponse
    {
        $this->ensureSession($request);

        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => Hash::make($request->string('password')->toString()),
        ]);

        $user->assignRole('member');

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(new UserResource($user), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $this->ensureSession($request);

        if (! Auth::attempt($request->only('email', 'password'), true)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais fornecidas não correspondem aos nossos registos.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json(new UserResource(Auth::user()));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Sessão terminada.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource($request->user()));
    }

    private function ensureSession(Request $request): void
    {
        abort_unless($request->hasSession(), self::SESSION_UNAVAILABLE, self::NO_SESSION_MESSAGE);
    }
}
