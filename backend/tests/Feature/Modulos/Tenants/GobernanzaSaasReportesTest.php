<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Tenants;

use App\Modulos\Tenants\DTOs\ActualizarPlanSuscripcionDTO;
use App\Modulos\Tenants\Servicios\GobernanzaSaasReportesService;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD del Sprint 8 (feat/admin-saas-reportes-ejecutivos).
 * Valida las reglas de las Pantallas Figma 60 a 67 y 70 a 74:
 * - Cuotas de planes Emprende, Crece y Pro + bloqueo de carga masiva CSV en Emprende.
 * - Privacidad por diseño del SuperAdmin (bloqueo de lectura de inventarios privados).
 * - Modo Vendedor (ocultamiento de costos y márgenes de ganancia).
 * - Cálculo de Reportes Ejecutivos (Valor del inventario, utilidad potencial e IVA recaudado).
 */
final class GobernanzaSaasReportesTest extends TestCase
{
    private const TENANT_ANDINA = '11111111-1111-4111-8111-111111111111';
    private const USUARIO_ADMIN = '99999999-9999-4999-8999-999999999999';

    public function test_evalua_cuotas_de_plan_crece_y_bloquea_carga_masiva_csv_en_plan_emprende(): void
    {
        $servicio = new GobernanzaSaasReportesService();

        $planCrece = new ActualizarPlanSuscripcionDTO(
            tenantId: self::TENANT_ANDINA,
            nombrePlan: ActualizarPlanSuscripcionDTO::PLAN_CRECE,
            estadoMembresia: ActualizarPlanSuscripcionDTO::ESTADO_ACTIVA,
            actorUsuarioId: self::USUARIO_ADMIN,
        );

        $consumo = $servicio->calcularConsumoCuotasPlan($planCrece, 4, 2, 1284);
        self::assertSame(80, $consumo['usuarios']['porcentaje']);
        self::assertSame(67, $consumo['bodegas']['porcentaje']);
        self::assertSame(26, $consumo['productos']['porcentaje']);

        $planEmprende = new ActualizarPlanSuscripcionDTO(
            tenantId: self::TENANT_ANDINA,
            nombrePlan: ActualizarPlanSuscripcionDTO::PLAN_EMPRENDE,
            estadoMembresia: ActualizarPlanSuscripcionDTO::ESTADO_ACTIVA,
            actorUsuarioId: self::USUARIO_ADMIN,
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Carga masiva disponible desde el plan Crece');
        $servicio->validarPermisoCargaMasivaCsv($planEmprende);
    }

    public function test_aplica_privacidad_por_diseno_impidiendo_que_superadmin_consulte_inventario_privado(): void
    {
        $servicio = new GobernanzaSaasReportesService();

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Privacidad por diseño');

        $servicio->proyectarCatalogoSegunRol(self::TENANT_ANDINA, 'superadmin', []);
    }

    public function test_modo_vendedor_oculta_costos_y_margenes_y_genera_reportes_ejecutivos_exactos(): void
    {
        $servicio = new GobernanzaSaasReportesService();

        $productos = [
            [
                'sku' => 'PRD-001',
                'nombre' => 'Teclado Mecánico Pro',
                'costo' => 50.0,
                'precio' => 100.0,
                'impuesto' => 19.0,
                'stock' => 10,
                'tenant_id' => self::TENANT_ANDINA,
            ],
        ];

        $vistaVendedor = $servicio->proyectarCatalogoSegunRol(self::TENANT_ANDINA, 'seller', $productos);
        self::assertTrue($vistaVendedor[0]['solo_lectura']);
        self::assertFalse(isset($vistaVendedor[0]['costo']));
        self::assertFalse(isset($vistaVendedor[0]['margen_porcentaje']));

        $vistaAdmin = $servicio->proyectarCatalogoSegunRol(self::TENANT_ANDINA, 'admin', $productos);
        self::assertFalse($vistaAdmin[0]['solo_lectura']);
        self::assertSame(50.0, $vistaAdmin[0]['costo']);
        self::assertSame(50.0, $vistaAdmin[0]['margen_porcentaje']);

        $reporte = $servicio->generarResumenReportesEjecutivos(
            self::TENANT_ANDINA,
            $productos,
            [
                ['total' => 238.0, 'iva' => 38.0, 'vendedor' => 'Laura Díaz', 'tenant_id' => self::TENANT_ANDINA],
            ],
        );

        self::assertSame(500.0, $reporte['costo_total_inventario']);
        self::assertSame(1000.0, $reporte['valor_venta_inventario']);
        self::assertSame(500.0, $reporte['utilidad_potencial']);
        self::assertSame(238.0, $reporte['ventas_totales_periodo']);
        self::assertSame(38.0, $reporte['impuestos_recaudados_iva']);
    }
}
