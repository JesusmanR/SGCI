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
        \App\Modulos\Tenants\Middleware\VerificarContextoTenantMiddleware::class,
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
                RolSistemaEnum::ADMIN_EMPRESA,
            ],
            'pantallas_figma' => ['66-admin-empresas', '67-planes-suscripcion'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/offline/sincronizar-lote',
            'accion' => [OperacionesApiV1Controller::class, 'sincronizarColaOffline'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_EMPRESA,
                RolSistemaEnum::JEFE_BODEGA,
                RolSistemaEnum::OPERADOR_PISO,
                RolSistemaEnum::AUDITOR_CONTEOS,
            ],
            'pantallas_figma' => ['55-sin-conexion-pendientes', '59-error-critico-reintento'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/facturacion/cobros',
            'accion' => [OperacionesApiV1Controller::class, 'registrarCobroFactura'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_EMPRESA,
                RolSistemaEnum::CONTADOR_COSTOS,
                RolSistemaEnum::VENDEDOR_MOSTRADOR,
            ],
            'pantallas_figma' => ['21-facturacion-listado', '28-registrar-pago', '35-arqueo-caja'],
        ],
        [
            'metodo' => 'POST',
            'uri' => '/api/v1/inventario/ajustes',
            'accion' => [OperacionesApiV1Controller::class, 'aplicarAjusteInventario'],
            'roles_permitidos' => [
                RolSistemaEnum::ADMIN_EMPRESA,
                RolSistemaEnum::JEFE_BODEGA,
                RolSistemaEnum::AUDITOR_CONTEOS,
            ],
            'pantallas_figma' => ['42-ajustes-inventario-listado', '43-nuevo-ajuste-inventario', '45-kardex-movimientos'],
        ],
    ],
];
