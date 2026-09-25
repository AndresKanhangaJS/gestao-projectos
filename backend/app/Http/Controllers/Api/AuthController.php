<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Requests\ChangeOwnPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\TransientToken;

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

        $credentials = $request->only('email', 'password');

        if (! Auth::validate($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais fornecidas não correspondem aos nossos registos.'],
            ]);
        }

        /** @var User $user */
        $user = User::query()->where('email', $credentials['email'])->firstOrFail();

        // Só depois de a password estar correcta: não revela o estado da conta a terceiros.
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => [EnsureUserIsActive::INACTIVE_MESSAGE],
            ]);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json(new UserResource($user));
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

    /**
     * O próprio utilizador muda a palavra-passe (obrigatório se
     * `must_change_password`). Mantém a sessão actual (novo id) e revoga as
     * restantes sessões/tokens. Responde como `GET /me`.
     */
    public function changePassword(ChangeOwnPasswordRequest $request, UserAccountService $accounts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $keepSessionId = null;
        if ($request->hasSession()) {
            $request->session()->regenerate(true);
            $keepSessionId = $request->session()->getId();
        }

        // Sessão SPA: TransientToken (não há token a preservar); Bearer: PersonalAccessToken.
        /** @var PersonalAccessToken|TransientToken|null $token */
        $token = $user->currentAccessToken();
        $keepTokenId = $token instanceof PersonalAccessToken ? (int) $token->getKey() : null;

        $user = $accounts->changeOwnPassword($user, (string) $request->validated('password'), $keepSessionId, $keepTokenId);

        // Novo remember_token: re-emite o cookie "lembrar-me" desta sessão (os dos outros dispositivos deixam de valer).
        if ($request->hasSession() && Auth::guard('web')->check()) {
            Auth::guard('web')->login($user, true);
        }

        return response()->json(new UserResource($user));
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
