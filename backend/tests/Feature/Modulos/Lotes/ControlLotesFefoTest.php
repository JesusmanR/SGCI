<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Lotes;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Lotes\Acciones\GestionarCuarentenaLoteAction;
use App\Modulos\Lotes\DTOs\RegistrarLoteDTO;
use App\Modulos\Lotes\Modelos\LoteProducto;
use App\Modulos\Lotes\Servicios\PlanificadorDespachoFefoService;
use DateTimeImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Suite TDD — Sprint 3 (`feat/lotes-caducidad`):
 * - Validación de invariantes de fechas en `RegistrarLoteDTO` (`fecha_vencimiento > fecha_fabricacion`).
 * - Semáforo de caducidad de 4 niveles (`VIGENTE`, `ADVERTENCIA`, `PROXIMO_A_VENCER`, `VENCIDO`) y `CUARENTENA`.
 * - Motor de asignación FEFO (`PlanificadorDespachoFefoService`) que prioriza el lote más próximo a vencer
 *   y omite automáticamente lotes vencidos o en cuarentena.
 * - Bloqueo y liberación de cuarentena con aislamiento estricto por `tenant_id`.
 */
class ControlLotesFefoTest extends TestCase
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
    public function bloquea_registro_de_lote_con_fecha_de_vencimiento_anterior_a_fabricacion(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('La fecha de vencimiento debe ser estrictamente posterior a la fecha de fabricación.');

        new RegistrarLoteDTO(
            tenantId: self::TENANT_ALFA,
            productId: 'prod-reactivo-01',
            numeroLote: 'LOTE-2026-ERR',
            fechaFabricacionIso: '2026-10-15',
            fechaVencimientoIso: '2026-09-01',
            costoUnitarioEntrada: 45.0,
            stockInicial: 100.0,
            esPerecedero: true,
        );
    }

    /**
     * @test
     */
    public function evalua_correctamente_el_semaforo_de_caducidad_en_los_cuatro_umbrales(): void
    {
        $fechaReferencia = new DateTimeImmutable('2026-11-01');

        $loteVigente = $this->crearLoteInstancia('LOTE-VIGENTE', '2027-02-15', 50.0); // +106 días
        $loteAdvertencia = $this->crearLoteInstancia('LOTE-ADVERTENCIA', '2026-12-16', 50.0); // +45 días
        $loteProximo = $this->crearLoteInstancia('LOTE-PROXIMO', '2026-11-15', 50.0); // +14 días
        $loteVencido = $this->crearLoteInstancia('LOTE-VENCIDO', '2026-10-25', 50.0); // -7 días

        $this->assertSame('VIGENTE', $loteVigente->evaluarSemaforoCaducidad($fechaReferencia));
        $this->assertSame('ADVERTENCIA', $loteAdvertencia->evaluarSemaforoCaducidad($fechaReferencia));
        $this->assertSame('PROXIMO_A_VENCER', $loteProximo->evaluarSemaforoCaducidad($fechaReferencia));
        $this->assertSame('VENCIDO', $loteVencido->evaluarSemaforoCaducidad($fechaReferencia));
        $this->assertFalse($loteVencido->esAptoParaDespacho($fechaReferencia));
    }

    /**
     * @test
     */
    public function asigna_salida_multilote_por_regla_fefo_omitiendo_vencidos_y_cuarentena(): void
    {
        $fechaReferencia = new DateTimeImmutable('2026-11-01');
        $planificador = new PlanificadorDespachoFefoService();

        // Lote 1: Vencido (-5 días) -> debe omitirse aunque tenga 100 unidades
        $loteVencido = $this->crearLoteInstancia('LOTE-2026-001', '2026-10-27', 100.0);

        // Lote 2: En cuarentena (+20 días) -> debe omitirse por bloqueo de calidad
        $loteCuarentena = $this->crearLoteInstancia('LOTE-2026-002', '2026-11-21', 80.0);
        $loteCuarentena->en_cuarentena = true;
        $loteCuarentena->is_active = false;

        // Lote 3: Próximo a vencer (+12 días, 25 unidades) -> Prioridad FEFO #1
        $loteFefo1 = $this->crearLoteInstancia('LOTE-2026-089', '2026-11-13', 25.0, 110.0);

        // Lote 4: Vigente (+90 días, 60 unidades) -> Prioridad FEFO #2
        $loteFefo2 = $this->crearLoteInstancia('LOTE-2026-140', '2027-01-30', 60.0, 118.0);

        // Solicitamos 40 unidades: debe tomar 25 de LOTE-2026-089 y 15 de LOTE-2026-140
        $resultado = $planificador->asignarLotesParaSalida(
            'prod-valvula-01',
            40.0,
            [$loteFefo2, $loteVencido, $loteCuarentena, $loteFefo1],
            $fechaReferencia
        );

        $this->assertSame(40.0, $resultado['cantidad_total_asignada']);
        $this->assertCount(2, $resultado['asignaciones']);

        // Primera asignación: el que vence primero (LOTE-2026-089)
        $this->assertSame('LOTE-2026-089', $resultado['asignaciones'][0]['numero_lote']);
        $this->assertSame(25.0, $resultado['asignaciones'][0]['cantidad_tomada']);
        $this->assertSame(0.0, $resultado['asignaciones'][0]['saldo_lote_restante']);
        $this->assertSame('PROXIMO_A_VENCER', $resultado['asignaciones'][0]['semaforo_caducidad']);

        // Segunda asignación: el siguiente en vencer (LOTE-2026-140)
        $this->assertSame('LOTE-2026-140', $resultado['asignaciones'][1]['numero_lote']);
        $this->assertSame(15.0, $resultado['asignaciones'][1]['cantidad_tomada']);
        $this->assertSame(45.0, $resultado['asignaciones'][1]['saldo_lote_restante']);

        // Verificar registro de lotes omitidos
        $this->assertCount(2, $resultado['lotes_omitidos']);
    }

    /**
     * @test
     */
    public function gestiona_cuarentena_e_impide_liberar_un_lote_que_ya_vencio(): void
    {
        $fechaReferencia = new DateTimeImmutable('2026-11-01');
        $action = new GestionarCuarentenaLoteAction();

        $lote = $this->crearLoteInstancia('LOTE-2026-500', '2026-10-20', 30.0); // Ya venció (-12 días)
        $action->colocarEnCuarentena($lote, 'Empaque primario con humedad en muelle', 'usr-auditor-01');

        $this->assertTrue((bool) $lote->en_cuarentena);
        $this->assertSame('CUARENTENA', $lote->evaluarSemaforoCaducidad($fechaReferencia));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('No es posible liberar de cuarentena el lote [LOTE-2026-500] porque ya se encuentra vencido');

        $action->liberarDeCuarentena($lote, 'usr-auditor-01', $fechaReferencia);
    }

    /**
     * @test
     */
    public function bloquea_contaminacion_cross_tenant_en_motor_fefo(): void
    {
        $planificador = new PlanificadorDespachoFefoService();
        $loteIntruso = $this->crearLoteInstancia('LOTE-INTRUSO', '2027-01-01', 50.0, 100.0, self::TENANT_BETA);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Violación Cross-Tenant en motor FEFO');

        $planificador->asignarLotesParaSalida('prod-valvula-01', 10.0, [$loteIntruso]);
    }

    private function crearLoteInstancia(
        string $numeroLote,
        string $fechaVencimientoIso,
        float $stockActual,
        float $costoUnitario = 100.0,
        string $tenantId = self::TENANT_ALFA
    ): LoteProducto {
        $lote = new LoteProducto([
            'product_id' => 'prod-valvula-01',
            'numero_lote' => $numeroLote,
            'fecha_fabricacion' => '2026-01-10',
            'fecha_vencimiento' => $fechaVencimientoIso,
            'costo_unitario_entrada' => $costoUnitario,
            'stock_inicial' => $stockActual,
            'stock_actual' => $stockActual,
            'is_active' => true,
            'en_cuarentena' => false,
        ]);

        $lote->id = 'id-' . strtolower($numeroLote);
        $lote->tenant_id = $tenantId;

        return $lote;
    }
}
