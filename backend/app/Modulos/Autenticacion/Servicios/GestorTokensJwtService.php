<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Servicios;

use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Servicio de emisión de JWT (Access Token de corta duración: 15 min)
 * y rotación criptográfica de Refresh Token (7 días) con detección de reúso (Theft Detection).
 */
final class GestorTokensJwtService
{
    public const ACCESS_TOKEN_TTL_SEGUNDOS = 900; // 15 minutos
    public const REFRESH_TOKEN_TTL_DIAS = 7;

    /**
     * Emite un nuevo par de Access Token (JWT HS256) y Refresh Token opaco (SHA-256 en DB).
     *
     * @param array<int, string> $roles
     * @param array<int, string> $almacenesIds
     * @return array{
     *     access_token: string,
     *     refresh_token: string,
     *     token_type: string,
     *     expires_in: int,
     *     tenant_id: string
     * }
     */
    public function emitirParTokens(
        string $tenantId,
        string $usuarioId,
        array $roles,
        array $almacenesIds = [],
        ?string $userAgent = null,
        ?string $ipAddress = null,
    ): array {
        $ahora = now();
        $expiraEn = $ahora->copy()->addSeconds(self::ACCESS_TOKEN_TTL_SEGUNDOS);

        $payload = [
            'iss' => 'sgci-auth-service',
            'sub' => $usuarioId,
            'tenant_id' => $tenantId,
            'roles' => array_values($roles),
            'warehouses' => array_values($almacenesIds),
            'iat' => $ahora->getTimestamp(),
            'exp' => $expiraEn->getTimestamp(),
            'jti' => (string) Str::uuid(),
        ];

        $accessToken = $this->firmarJwt($payload);
        $refreshTokenPlano = Str::random(64);
        $refreshTokenHash = hash('sha256', $refreshTokenPlano);

        DB::table('refresh_tokens')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id' => $usuarioId,
            'token_hash' => $refreshTokenHash,
            'expires_at' => $ahora->copy()->addDays(self::REFRESH_TOKEN_TTL_DIAS),
            'revoked' => false,
            'revoked_at' => null,
            'user_agent' => $userAgent,
            'ip_address' => $ipAddress,
            'created_at' => $ahora,
            'updated_at' => $ahora,
            'deleted_at' => null,
            'created_by' => $usuarioId,
            'updated_by' => $usuarioId,
        ]);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshTokenPlano,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_TTL_SEGUNDOS,
            'tenant_id' => $tenantId,
        ];
    }

    /**
     * Rota un Refresh Token. Si detecta el reúso de un Refresh Token previamente revocado,
     * ejecuta revocación en cascada de todas las sesiones del usuario en el Tenant.
     *
     * @return array{
     *     access_token: string,
     *     refresh_token: string,
     *     token_type: string,
     *     expires_in: int,
     *     tenant_id: string
     * }
     */
    public function rotarRefreshToken(string $refreshTokenPlano): array
    {
        $hash = hash('sha256', $refreshTokenPlano);

        $registro = DB::table('refresh_tokens')
            ->where('token_hash', '=', $hash)
            ->whereNull('deleted_at')
            ->first();

        if ($registro === null) {
            throw new DomainException('Refresh token inválido o inexistente.');
        }

        // Detección de robo/reúso de Refresh Token ya revocado -> Revocación en cascada
        if ((bool) $registro->revoked) {
            DB::table('refresh_tokens')
                ->where('tenant_id', '=', (string) $registro->tenant_id)
                ->where('user_id', '=', (string) $registro->user_id)
                ->update([
                    'revoked' => true,
                    'revoked_at' => now(),
                    'updated_at' => now(),
                ]);

            throw new DomainException(
                'Alerta de seguridad: Se detectó reúso de un Refresh Token revocado. Todas las sesiones han sido invalidadas.'
            );
        }

        if (now()->greaterThan($registro->expires_at)) {
            throw new DomainException('El Refresh Token ha expirado.');
        }

        // Marcar el token actual como consumido/revocado inmediatamente
        DB::table('refresh_tokens')
            ->where('id', '=', (string) $registro->id)
            ->update([
                'revoked' => true,
                'revoked_at' => now(),
                'updated_at' => now(),
            ]);

        $roles = DB::table('user_roles')
            ->where('tenant_id', '=', (string) $registro->tenant_id)
            ->where('user_id', '=', (string) $registro->user_id)
            ->whereNull('deleted_at')
            ->pluck('role')
            ->map(static fn (mixed $r): string => (string) $r)
            ->all();

        $almacenes = DB::table('user_roles')
            ->where('tenant_id', '=', (string) $registro->tenant_id)
            ->where('user_id', '=', (string) $registro->user_id)
            ->whereNotNull('warehouse_id')
            ->whereNull('deleted_at')
            ->pluck('warehouse_id')
            ->map(static fn (mixed $w): string => (string) $w)
            ->all();

        return $this->emitirParTokens(
            tenantId: (string) $registro->tenant_id,
            usuarioId: (string) $registro->user_id,
            roles: $roles,
            almacenesIds: $almacenes,
        );
    }

    /**
     * Decodifica y verifica la firma e integridad de un Access Token JWT.
     *
     * @return array<string, mixed>
     */
    public function verificarAccessToken(string $jwt): array
    {
        $partes = explode('.', $jwt);
        if (count($partes) !== 3) {
            throw new DomainException('Formato de token JWT inválido.');
        }

        [$headerB64, $payloadB64, $firmaB64] = $partes;
        $firmaEsperada = $this->base64UrlEncode(
            hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $this->obtenerSecretoJwt(), true)
        );

        if (! hash_equals($firmaEsperada, $firmaB64)) {
            throw new DomainException('Firma criptográfica del token JWT inválida.');
        }

        /** @var array<string, mixed>|null $payload */
        $payload = json_decode($this->base64UrlDecode($payloadB64), true);
        if (! is_array($payload)) {
            throw new DomainException('Payload de token JWT corrupto.');
        }

        if (isset($payload['exp']) && (int) $payload['exp'] < now()->getTimestamp()) {
            throw new DomainException('El Access Token JWT ha expirado.');
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function firmarJwt(array $payload): string
    {
        $header = $this->base64UrlEncode((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $cuerpo = $this->base64UrlEncode((string) json_encode($payload));
        $firma = $this->base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $cuerpo, $this->obtenerSecretoJwt(), true)
        );

        return sprintf('%s.%s.%s', $header, $cuerpo, $firma);
    }

    private function obtenerSecretoJwt(): string
    {
        $secreto = (string) config('app.key', 'sgci-jwt-secret-key-2026-multi-tenant');

        return $secreto !== '' ? $secreto : 'sgci-jwt-secret-key-2026-multi-tenant';
    }

    private function base64UrlEncode(string $datos): string
    {
        return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $datos): string
    {
        $resto = strlen($datos) % 4;
        if ($resto > 0) {
            $datos .= str_repeat('=', 4 - $resto);
        }

        return (string) base64_decode(strtr($datos, '-_', '+/'));
    }
}
