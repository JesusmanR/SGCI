<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\AuditoriaConteos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\AuditoriaConteos\Acciones\AplicarAjusteInventarioKardexAction;
use App\Modulos\AuditoriaConteos\DTOs\RegistrarAjusteInventarioDTO;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Suite TDD — Sprint 5 (`feat/auditoria-conteos-ciegos` · Pantallas Figma `42` a `45` y `78`):
 * - Validación de motivos obligatorios (`Conteo físico`, `Producto dañado / merma`, `Pérdida`, `Corrección de registro`, `Otro`).
 * - Exigencia de observaciones cuando el motivo es `Otro`.
 * - Generación automática de asientos `AJUSTE_POSITIVO`, `AJUSTE_NEGATIVO` y `MERMA_DANO` en el Kardex.
 * - Regla de Doble Firma de Autorización y segregación de funciones para discrepancias de alto impacto monetario.
 */
class AuditoriaConteosTest extends TestCase
{
    private const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';
    private const TENANT_BETA = '99999999-8888-4777-8666-555555555555';

    protected function setUp(): void
    {
        parent::setUp();
        ModeloBaseTenant::fijarTenantContexto(self::TENANT_ALFA);
    }

    protected function tearDown(): void
    {
        ModeloBaseTenant::fijarTenantContexto(null);
        parent::tearDown();
    }

    /**
     * @test
     */
    public function aplica_ajuste_por_conteo_fisico_y_genera_asiento_kardex_con_mensaje_de_confirmacion_figma(): void
    {
        $action = new AplicarAjusteInventarioKardexAction(umbralDobleFirmaMonetario: 1000.0);

        $dto = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-principal-01',
            productId: 'PRD-002',
            sku: 'PRD-002',
            nombreProducto: 'Teclado Mecánico K2',
            stockActualSistema: 8.0,
            cantidadRealContada: 14.0,
            costoUnitarioActual: 41.20,
            motivoAjuste: 'Conteo físico',
            observaciones: 'Hallazgo de caja sellada en Rack B2',
            usuarioResponsableId: 'usr-alex-morgan',
        );

        $resultado = $action->ejecutar($dto);

        $this->assertSame(6.0, $resultado['variacion']);
        $this->assertSame(14.0, $resultado['nuevo_stock']);
        $this->assertSame('AJUSTE_POSITIVO', $resultado['asiento_kardex']['tipo_movimiento']);
        $this->assertSame('Ajuste registrado: Teclado Mecánico K2 ahora tiene 14 unidades.', $resultado['mensaje_confirmacion']);
    }

    /**
     * @test
     */
    public function clasifica_merma_dano_y_exige_descripcion_cuando_el_motivo_es_otro(): void
    {
        $dtoMerma = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-principal-01',
            productId: 'PRD-004',
            sku: 'PRD-004',
            nombreProducto: 'Lámpara Halo Desk',
            stockActualSistema: 4.0,
            cantidadRealContada: 2.0,
            costoUnitarioActual: 25.50,
            motivoAjuste: 'Producto dañado / merma',
            observaciones: 'Rotura en traslado interno',
            usuarioResponsableId: 'usr-alex-morgan',
        );

        $this->assertSame(-2.0, $dtoMerma->variacionUnidades);
        $this->assertSame('MERMA_DANO', $dtoMerma->tipoMovimientoKardex);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Describe el motivo del ajuste en las observaciones cuando seleccionas "Otro".');

        new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-principal-01',
            productId: 'PRD-004',
            sku: 'PRD-004',
            nombreProducto: 'Lámpara Halo Desk',
            stockActualSistema: 4.0,
            cantidadRealContada: 3.0,
            costoUnitarioActual: 25.50,
            motivoAjuste: 'Otro',
            observaciones: '   ',
        );
    }

    /**
     * @test
     */
    public function exige_doble_firma_con_segregacion_de_funciones_cuando_el_impacto_supera_el_umbral(): void
    {
        $action = new AplicarAjusteInventarioKardexAction(umbralDobleFirmaMonetario: 1000.0);

        // Variación de -10 unidades a $236.00 = -$2,360.00 (supera umbral de $1,000.00)
        $dtoSinSegundaFirma = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-principal-01',
            productId: 'PRD-005',
            sku: 'PRD-005',
            nombreProducto: 'Monitor Studio 27”',
            stockActualSistema: 21.0,
            cantidadRealContada: 11.0,
            costoUnitarioActual: 236.00,
            motivoAjuste: 'Pérdida',
            observaciones: 'Faltante detectado en auditoría trimestral',
            usuarioResponsableId: 'usr-operador-01',
            usuarioAutorizadorId: null,
        );

        try {
            $action->ejecutar($dtoSinSegundaFirma);
            $this->fail('Debió exigir segunda firma de autorización.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('requiere segunda firma de autorización', $e->getMessage());
        }

        // Con segunda firma de un supervisor distinto debe aprobarse
        $dtoConDobleFirma = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-principal-01',
            productId: 'PRD-005',
            sku: 'PRD-005',
            nombreProducto: 'Monitor Studio 27”',
            stockActualSistema: 21.0,
            cantidadRealContada: 11.0,
            costoUnitarioActual: 236.00,
            motivoAjuste: 'Pérdida',
            observaciones: 'Faltante autorizado tras acta forense',
            usuarioResponsableId: 'usr-operador-01',
            usuarioAutorizadorId: 'usr-jefe-almacen-02',
        );

        $aprobado = $action->ejecutar($dtoConDobleFirma);
        $this->assertTrue($aprobado['requirio_doble_firma']);
        $this->assertSame('usr-jefe-almacen-02', $aprobado['asiento_kardex']['authorized_by']);
    }

    /**
     * @test
     */
    public function bloquea_ajuste_cross_tenant(): void
    {
        $action = new AplicarAjusteInventarioKardexAction();

        $dtoIntruso = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_BETA,
            warehouseId: 'alm-01',
            productId: 'PRD-001',
            sku: 'PRD-001',
            nombreProducto: 'Auriculares Nova Pro',
            stockActualSistema: 34.0,
            cantidadRealContada: 30.0,
            costoUnitarioActual: 52.0,
            motivoAjuste: 'Conteo físico',
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Violación de aislamiento Multi-Tenant al aplicar ajuste de inventario');

        $action->ejecutar($dtoIntruso);
    }
}
