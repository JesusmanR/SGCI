<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Enums;

/**
 * Enumeración oficial de los 10 Roles RBAC de SGCI.
 * Sincronizado con `RolSistema` en `database/prisma/schema.prisma`.
 */
enum RolSistemaEnum: string
{
    case SUPER_ADMIN_SAAS = 'SUPER_ADMIN_SAAS';
    case ADMIN_TENANT = 'ADMIN_TENANT';
    case GERENTE_OPERACIONES = 'GERENTE_OPERACIONES';
    case JEFE_ALMACEN = 'JEFE_ALMACEN';
    case SUPERVISOR_INVENTARIO = 'SUPERVISOR_INVENTARIO';
    case ALMACENISTA_OPERADOR = 'ALMACENISTA_OPERADOR';
    case COMPRADOR_ABASTECIMIENTO = 'COMPRADOR_ABASTECIMIENTO';
    case AUDITOR_INVENTARIO = 'AUDITOR_INVENTARIO';
    case CONTADOR_COSTOS = 'CONTADOR_COSTOS';
    case VISOR_CONSULTA = 'VISOR_CONSULTA';

    /**
     * Indica si el rol requiere validación de asignación física a una bodega/almacén específico.
     */
    public function requiereAlcancePorAlmacen(): bool
    {
        return match ($this) {
            self::JEFE_ALMACEN,
            self::ALMACENISTA_OPERADOR => true,
            default => false,
        };
    }

    /**
     * Retorna la lista de permisos canónicos otorgados al rol.
     *
     * @return array<int, string>
     */
    public function permisos(): array
    {
        return match ($this) {
            self::SUPER_ADMIN_SAAS => ['*'],
            self::ADMIN_TENANT => [
                'tenants.configurar',
                'usuarios.gestionar',
                'catalogo.gestionar',
                'almacenes.gestionar',
                'lotes.gestionar',
                'kardex.registrar',
                'kardex.consultar',
                'compras.gestionar',
                'auditoria.aprobar_ajuste',
                'alertas.configurar',
            ],
            self::GERENTE_OPERACIONES => [
                'catalogo.gestionar',
                'almacenes.gestionar',
                'lotes.gestionar',
                'kardex.consultar',
                'compras.aprobar',
                'auditoria.aprobar_ajuste',
                'alertas.consultar',
            ],
            self::JEFE_ALMACEN => [
                'catalogo.consultar',
                'almacenes.operar',
                'lotes.gestionar',
                'kardex.registrar',
                'kardex.consultar',
                'compras.recepcionar',
                'auditoria.iniciar_conteo',
                'alertas.consultar',
            ],
            self::SUPERVISOR_INVENTARIO => [
                'catalogo.consultar',
                'almacenes.consultar',
                'lotes.gestionar',
                'kardex.consultar',
                'auditoria.gestionar_ciclicos',
                'alertas.consultar',
            ],
            self::ALMACENISTA_OPERADOR => [
                'catalogo.escanear',
                'almacenes.consultar',
                'lotes.consultar',
                'kardex.registrar_operacion',
                'compras.recepcionar_pwa',
                'auditoria.ejecutar_conteo_ciego',
            ],
            self::COMPRADOR_ABASTECIMIENTO => [
                'catalogo.gestionar',
                'proveedores.gestionar',
                'compras.gestionar',
                'kardex.consultar',
                'alertas.consultar',
            ],
            self::AUDITOR_INVENTARIO => [
                'catalogo.consultar',
                'almacenes.consultar',
                'lotes.consultar',
                'kardex.auditar',
                'auditoria.ejecutar_conteo_ciego',
                'auditoria.conciliar',
            ],
            self::CONTADOR_COSTOS => [
                'catalogo.consultar',
                'kardex.auditar',
                'kardex.valorizar',
                'kardex.cerrar_periodo',
                'auditoria.aprobar_ajuste',
            ],
            self::VISOR_CONSULTA => [
                'catalogo.consultar',
                'almacenes.consultar',
                'kardex.consultar',
            ],
        };
    }

    /**
     * Verifica si el rol posee un permiso específico.
     */
    public function tienePermiso(string $permiso): bool
    {
        $permisos = $this->permisos();

        return in_array('*', $permisos, true) || in_array($permiso, $permisos, true);
    }
}
