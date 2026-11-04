<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Middlewares;

use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de Control de Acceso Basado en Roles (RBAC - 10 Roles Canónicos).
 *
 * Verifica:
 * 1. Que el usuario autenticado posea al menos uno de los roles permitidos en la ruta.
 * 2. Si el rol es operativo de bodega (`JEFE_ALMACEN`, `ALMACENISTA_OPERADOR`) y la ruta
 *    incluye un parámetro o cabecera de almacén (`almacen_id` / `X-Warehouse-ID`), valida
 *    que dicho almacén esté dentro de los almacenes asignados al operador.
 */
final class AutorizarRolRbacMiddleware
{
    /**
     * @param string ...$rolesPermitidos Códigos de los 10 roles RBAC aceptados por la ruta.
     */
    public function handle(Request $request, Closure $next, string ...$rolesPermitidos): Response
    {
        /** @var array<string, mixed> $claims */
        $claims = (array) $request->attributes->get('jwt_claims', []);
        /** @var array<int, string> $rolesUsuario */
        $rolesUsuario = isset($claims['roles']) && is_array($claims['roles'])
            ? array_map('strval', $claims['roles'])
            : [];

        if ($rolesUsuario === []) {
            return response()->json([
                'exito' => false,
                'codigo' => 'RBAC_SIN_ROLES',
                'mensaje' => 'El usuario no posee roles RBAC asignados en este Tenant.',
            ], Response::HTTP_FORBIDDEN);
        }

        // SUPER_ADMIN_SAAS y ADMIN_TENANT tienen acceso transversal dentro de su ámbito
        $rolesCoincidentes = array_intersect($rolesUsuario, $rolesPermitidos);
        if ($rolesCoincidentes === [] && ! in_array(RolSistemaEnum::SUPER_ADMIN_SAAS->value, $rolesUsuario, true)) {
            return response()->json([
                'exito' => false,
                'codigo' => 'RBAC_ROL_NO_AUTORIZADO',
                'mensaje' => sprintf(
                    'Acceso denegado. Se requiere alguno de los roles: [%s].',
                    implode(', ', $rolesPermitidos)
                ),
            ], Response::HTTP_FORBIDDEN);
        }

        // Validación de alcance por almacén para roles exclusivos de bodega
        $almacenSolicitado = (string) ($request->route('almacenId')
            ?? $request->input('almacen_id')
            ?? $request->header('X-Warehouse-ID', ''));

        if ($almacenSolicitado !== '' && $this->soloPoseeRolesDeAlmacen($rolesUsuario)) {
            /** @var array<int, string> $almacenesAsignados */
            $almacenesAsignados = isset($claims['warehouses']) && is_array($claims['warehouses'])
                ? array_map('strval', $claims['warehouses'])
                : [];

            if ($almacenesAsignados !== [] && ! in_array($almacenSolicitado, $almacenesAsignados, true)) {
                return response()->json([
                    'exito' => false,
                    'codigo' => 'RBAC_ALMACEN_NO_ASIGNADO',
                    'mensaje' => 'El operador no tiene autorización para operar sobre el almacén solicitado.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        return $next($request);
    }

    /**
     * Determina si todos los roles del usuario requieren restricción estricta por almacén asignado.
     *
     * @param array<int, string> $rolesUsuario
     */
    private function soloPoseeRolesDeAlmacen(array $rolesUsuario): bool
    {
        foreach ($rolesUsuario as $codigoRol) {
            $enum = RolSistemaEnum::tryFrom($codigoRol);
            if ($enum !== null && ! $enum->requiereAlcancePorAlmacen()) {
                return false;
            }
        }

        return true;
    }
}
