<?php

declare(strict_types=1);

namespace App\Modulos\Tenants\Servicios;

use App\Modulos\Tenants\DTOs\ActualizarPlanSuscripcionDTO;
use DomainException;

/**
 * Servicio de dominio para Gobernanza SaaS Multi-Tenant, Privacidad por Diseño (SuperAdmin),
 * Reportes Ejecutivos y Modo Vendedor (Pantallas Figma 60 a 67 y 70 a 74).
 */
final class GobernanzaSaasReportesService
{
    /**
     * Verifica si el plan activo permite ejecutar carga masiva CSV de precios o productos
     * (Pantalla Figma 49 / 2168: "Carga masiva disponible desde el plan Crece").
     */
    public function validarPermisoCargaMasivaCsv(ActualizarPlanSuscripcionDTO $suscripcion): void
    {
        if ($suscripcion->estadoMembresia !== ActualizarPlanSuscripcionDTO::ESTADO_ACTIVA
            && $suscripcion->estadoMembresia !== ActualizarPlanSuscripcionDTO::ESTADO_PRUEBA
        ) {
            throw new DomainException(
                'Esta empresa está desactivada. Operación temporalmente restringida.'
            );
        }

        $limites = $suscripcion->obtenerLimitesPlan();
        if (! $limites['permite_carga_masiva_csv']) {
            throw new DomainException(
                'Carga masiva disponible desde el plan Crece. En Emprende puedes administrar productos y precios individualmente.'
            );
        }
    }

    /**
     * Evalúa el consumo porcentual de cuotas del plan (Pantalla Figma 64-membresias-planes).
     *
     * @return array{
     *   plan: string,
     *   precio_cop_mes: int,
     *   usuarios: array{actual: int, maximo: int, porcentaje: int},
     *   bodegas: array{actual: int, maximo: int, porcentaje: int},
     *   productos: array{actual: int, maximo: int|null, porcentaje: int}
     * }
     */
    public function calcularConsumoCuotasPlan(
        ActualizarPlanSuscripcionDTO $suscripcion,
        int $usuariosActuales,
        int $bodegasActuales,
        int $productosActuales,
    ): array {
        $limites = $suscripcion->obtenerLimitesPlan();

        if ($usuariosActuales > $limites['max_usuarios']) {
            throw new DomainException(
                "El plan {$suscripcion->nombrePlan} permite hasta {$limites['max_usuarios']} usuarios."
            );
        }

        if ($bodegasActuales > $limites['max_bodegas']) {
            throw new DomainException(
                "El plan {$suscripcion->nombrePlan} permite hasta {$limites['max_bodegas']} bodegas."
            );
        }

        if ($limites['max_productos'] !== null && $productosActuales > $limites['max_productos']) {
            throw new DomainException(
                "El plan {$suscripcion->nombrePlan} permite hasta {$limites['max_productos']} productos."
            );
        }

        $pctUsuarios = (int) round(($usuariosActuales / $limites['max_usuarios']) * 100);
        $pctBodegas = (int) round(($bodegasActuales / $limites['max_bodegas']) * 100);
        $pctProductos = $limites['max_productos'] !== null
            ? (int) round(($productosActuales / $limites['max_productos']) * 100)
            : 35;

        return [
            'plan' => $suscripcion->nombrePlan,
            'precio_cop_mes' => $limites['precio_cop_mes'],
            'usuarios' => [
                'actual' => $usuariosActuales,
                'maximo' => $limites['max_usuarios'],
                'porcentaje' => min(100, $pctUsuarios),
            ],
            'bodegas' => [
                'actual' => $bodegasActuales,
                'maximo' => $limites['max_bodegas'],
                'porcentaje' => min(100, $pctBodegas),
            ],
            'productos' => [
                'actual' => $productosActuales,
                'maximo' => $limites['max_productos'],
                'porcentaje' => min(100, $pctProductos),
            ],
        ];
    }

    /**
     * Aplica la política de "Privacidad por diseño" (Pantalla Figma 66-admin-empresas):
     * El SuperAdmin solo administra empresas, accesos y membresías; tiene prohibido leer
     * el inventario, costos, clientes o ventas privadas de un inquilino.
     */
    public function verificarAccesoOperativoPrivado(string $rolUsuario): void
    {
        if (mb_strtolower(trim($rolUsuario)) === 'superadmin') {
            throw new DomainException(
                'Privacidad por diseño: El SuperAdmin solo administra empresas, accesos y membresías. Los productos, ventas, clientes e inventarios de cada empresa permanecen aislados.'
            );
        }
    }

    /**
     * Proyecta la lista de precios según el rol (Pantallas Figma 70 a 74 — Modo Vendedor):
     * Si el rol es "seller" / "vendedor", oculta estrictamente el costo unitario y el margen de ganancia.
     *
     * @param list<array{sku: string, nombre: string, costo: float, precio: float, impuesto: float, stock: int, tenant_id: string}> $productos
     * @return list<array<string, mixed>>
     */
    public function proyectarCatalogoSegunRol(
        string $tenantId,
        string $rolUsuario,
        array $productos,
    ): array {
        $this->verificarAccesoOperativoPrivado($rolUsuario);
        $esVendedor = in_array(mb_strtolower(trim($rolUsuario)), ['seller', 'vendedor'], true);

        $resultado = [];
        foreach ($productos as $prod) {
            if ($prod['tenant_id'] !== $tenantId) {
                throw new DomainException('Violación Multi-Tenant al proyectar catálogo.');
            }

            if ($esVendedor) {
                $resultado[] = [
                    'sku' => $prod['sku'],
                    'nombre' => $prod['nombre'],
                    'precio' => round($prod['precio'], 2),
                    'stock' => $prod['stock'],
                    'solo_lectura' => true,
                ];
            } else {
                $margen = $prod['precio'] > 0
                    ? round((($prod['precio'] - $prod['costo']) / $prod['precio']) * 100.0, 2)
                    : 0.0;

                $resultado[] = [
                    'sku' => $prod['sku'],
                    'nombre' => $prod['nombre'],
                    'costo' => round($prod['costo'], 2),
                    'margen_porcentaje' => $margen,
                    'precio' => round($prod['precio'], 2),
                    'impuesto' => $prod['impuesto'],
                    'stock' => $prod['stock'],
                    'solo_lectura' => false,
                ];
            }
        }

        return $resultado;
    }

    /**
     * Genera el resumen analítico de los 6 Reportes Ejecutivos (Pantalla Figma 63-reportes-analitica).
     *
     * @param list<array{sku: string, costo: float, precio: float, stock: int, tenant_id: string}> $productos
     * @param list<array{total: float, iva: float, vendedor: string, tenant_id: string}> $ventas
     * @return array{
     *   costo_total_inventario: float,
     *   valor_venta_inventario: float,
     *   utilidad_potencial: float,
     *   ventas_totales_periodo: float,
     *   impuestos_recaudados_iva: float,
     *   transacciones_periodo: int,
     *   ticket_promedio: float
     * }
     */
    public function generarResumenReportesEjecutivos(
        string $tenantId,
        array $productos,
        array $ventas,
    ): array {
        $costoTotalInventario = 0.0;
        $valorVentaInventario = 0.0;

        foreach ($productos as $prod) {
            if ($prod['tenant_id'] !== $tenantId) {
                throw new DomainException('Violación Multi-Tenant en cálculo de valor del inventario.');
            }
            $costoTotalInventario += $prod['costo'] * $prod['stock'];
            $valorVentaInventario += $prod['precio'] * $prod['stock'];
        }

        $ventasTotales = 0.0;
        $impuestosRecaudados = 0.0;
        foreach ($ventas as $v) {
            if ($v['tenant_id'] !== $tenantId) {
                throw new DomainException('Violación Multi-Tenant en reporte de ventas.');
            }
            $ventasTotales += $v['total'];
            $impuestosRecaudados += $v['iva'];
        }

        $numTransacciones = count($ventas);
        $ticketPromedio = $numTransacciones > 0 ? round($ventasTotales / $numTransacciones, 2) : 0.0;

        return [
            'costo_total_inventario' => round($costoTotalInventario, 2),
            'valor_venta_inventario' => round($valorVentaInventario, 2),
            'utilidad_potencial' => round($valorVentaInventario - $costoTotalInventario, 2),
            'ventas_totales_periodo' => round($ventasTotales, 2),
            'impuestos_recaudados_iva' => round($impuestosRecaudados, 2),
            'transacciones_periodo' => $numTransacciones,
            'ticket_promedio' => $ticketPromedio,
        ];
    }
}
