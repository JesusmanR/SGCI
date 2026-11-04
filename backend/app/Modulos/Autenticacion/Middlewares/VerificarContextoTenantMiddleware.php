<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Middlewares;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Autenticacion\Servicios\GestorTokensJwtService;
use Closure;
use DomainException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de Aislamiento Multi-Tenant (`VerificarContextoTenantMiddleware`).
 *
 * 1. Extrae y verifica el token JWT Bearer.
 * 2. Verifica que el `tenant_id` del claim JWT exista y coincida con el encabezado `X-Tenant-ID` (Anti-Spoofing).
 * 3. Fija el contexto en `ModeloBaseTenant::fijarTenantContexto()` para activar el Global Scope Fail-Closed.
 */
final class VerificarContextoTenantMiddleware
{
    public function __construct(
        private readonly GestorTokensJwtService $gestorJwt
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();
        if ($bearer === null || trim($bearer) === '') {
            return response()->json([
                'exito' => false,
                'codigo' => 'TOKEN_AUSENTE',
                'mensaje' => 'Se requiere autenticación mediante Bearer Token JWT.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $claims = $this->gestorJwt->verificarAccessToken($bearer);
        } catch (DomainException $e) {
            return response()->json([
                'exito' => false,
                'codigo' => 'TOKEN_INVALIDO',
                'mensaje' => $e->getMessage(),
            ], Response::HTTP_UNAUTHORIZED);
        }

        $jwtTenantId = isset($claims['tenant_id']) ? (string) $claims['tenant_id'] : '';
        if ($jwtTenantId === '') {
            return response()->json([
                'exito' => false,
                'codigo' => 'TENANT_CLAIM_AUSENTE',
                'mensaje' => 'El token JWT no contiene un contexto de inquilino (tenant_id) válido.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Validación Anti-Spoofing contra cabecera X-Tenant-ID
        $headerTenantId = $request->header('X-Tenant-ID');
        if (is_string($headerTenantId) && $headerTenantId !== '' && ! hash_equals($jwtTenantId, $headerTenantId)) {
            return response()->json([
                'exito' => false,
                'codigo' => 'TENANT_SPOOFING_DETECTADO',
                'mensaje' => 'Violación de aislamiento Multi-Tenant: X-Tenant-ID no coincide con el token autenticado.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Fijar contexto en el contenedor y en ModeloBaseTenant
        app()->instance('tenant_id', $jwtTenantId);
        ModeloBaseTenant::fijarTenantContexto($jwtTenantId);

        $request->attributes->set('jwt_claims', $claims);
        $request->attributes->set('tenant_id', $jwtTenantId);

        return $next($request);
    }
}
