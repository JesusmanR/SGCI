<?php

declare(strict_types=1);

/**
 * Definición Declarativa de Rutas API REST v1 — SGCI (Multi-Tenant SaaS).
 *
 * Todas las rutas de negocio están protegidas por:
 * 1. Autenticación JWT de vida corta (15 min) + Rotación de Refresh Token.
 * 2. VerificarContextoTenantMiddleware (Aislamiento estricto por tenant_id UUID).
 * 3. AutorizarRolRbacMiddleware (Matriz de 10 roles RBAC + Modo Vendedor).
 */

use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use App\Modulos\Compartido\Controladores\OperacionesApiV1Controller;

return [
    'prefijo' => '/api/v1',
    'middlewares_globales' => [
        'jwt.auth',
        \App\Modulos\Autenticacion\Middlewares\VerificarContextoTenantMiddleware::class,
    ],
    'endpoints' => [
        [
            'metodo' => 'GET',
            'uri' => '/api/v1/salud',
            'accion' => [OperacionesApiV1Controller::class, 'estadoSalud'],
            'roles_permitidos' => RolSistemaEnum::cases(),
            'pantallas_figma' => ['01-portada', '77-centro-notificaciones'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/gobernanza/suscripciones',
            'accion' => [OperacionesApiV1Controller::class, 'actualizarPlanSuscripcion'],
            'roles_permitidos' => [
                RolSistemaEnum::SUPER_ADMIN_SAAS,
                RolSistemaEnum::ADMIN_TENANT,
            ],
            'pantallas_figma' => ['66-admin-empresas', '67-planes-suscripcion'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/offline/sincronizar-lote',
            'accion' => [OperacionesApiV1Controller::class, 'sincronizarColaOffline'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_TENANT,
                RolSistemaEnum::JEFE_ALMACEN,
                RolSistemaEnum::ALMACENISTA_OPERADOR,
                RolSistemaEnum::AUDITOR_INVENTARIO,
            ],
            'pantallas_figma' => ['55-sin-conexion-pendientes', '59-error-critico-reintento'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/facturacion/cobros',
            'accion' => [OperacionesApiV1Controller::class, 'registrarCobroFactura'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_TENANT,
                RolSistemaEnum::CONTADOR_COSTOS,
                RolSistemaEnum::VISOR_CONSULTA,
            ],
            'pantallas_figma' => ['21-facturacion-listado', '28-registrar-pago', '35-arqueo-caja'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/inventario/ajustes',
            'accion' => [OperacionesApiV1Controller::class, 'aplicarAjusteInventario'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_TENANT,
                RolSistemaEnum::JEFE_ALMACEN,
                RolSistemaEnum::AUDITOR_INVENTARIO,
            ],
            'pantallas_figma' => ['42-ajustes-inventario-listado', '43-nuevo-ajuste-inventario', '45-kardex-movimientos'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/auth/restablecer-contrasena',
            'accion' => [OperacionesApiV1Controller::class, 'restablecerContrasena'],
            'roles_permitidos' => RolSistemaEnum::cases(),
            'pantallas_sgci' => ['04-Recuperacion', '05-Confirmacion-de-recuperacion', '05b-Nueva-contrasena-por-token'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/compras/recepciones-muelle',
            'accion' => [OperacionesApiV1Controller::class, 'procesarRecepcionMuelle'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_TENANT,
                RolSistemaEnum::JEFE_ALMACEN,
                RolSistemaEnum::COMPRADOR_ABASTECIMIENTO,
                RolSistemaEnum::ALMACENISTA_OPERADOR,
            ],
            'pantallas_sgci' => ['13-Abastecimiento', '13b-Recepcion-orden-compra-muelle', '10-Libro-Kardex'],
        ],
    ],
];
