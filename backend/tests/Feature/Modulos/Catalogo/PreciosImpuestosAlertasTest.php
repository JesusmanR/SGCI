<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Catalogo;

use App\Modulos\AlertasTiempoReal\Servicios\GestorAlertasInventarioService;
use App\Modulos\Catalogo\DTOs\ReglaGananciaImpuestoDTO;
use App\Modulos\Catalogo\Servicios\CalculadoraPreciosImpuestosService;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD del Sprint 6 (feat/precios-impuestos-estados-pwa).
 * Valida las reglas de negocio de las Pantallas Figma 46 a 52, 68, 69 y 77.
 */
final class PreciosImpuestosAlertasTest extends TestCase
{
    private const TENANT_A = '11111111-1111-4111-8111-111111111111';
    private const TENANT_B = '22222222-2222-4222-8222-222222222222';
    private const USUARIO_ADMIN = '99999999-9999-4999-8999-999999999999';

    public function test_calcula_precio_sugerido_con_recargo_sobre_el_costo_y_margen_sobre_la_venta(): void
    {
        $servicio = new CalculadoraPreciosImpuestosService();

        // Pantalla Figma 46-impuestos-ganancia: Recargo sobre el costo (markup 35%, IVA 19%)
        $reglaMarkup = new ReglaGananciaImpuestoDTO(
            tenantId: self::TENANT_A,
            tasaIvaPorcentaje: 19.0,
            metodoGanancia: ReglaGananciaImpuestoDTO::METODO_RECARGO_COSTO,
            porcentajeGanancia: 35.0,
            usuarioId: self::USUARIO_ADMIN,
        );

        $desgloseMarkup = $servicio->simularDesglosePrecio(100.0, $reglaMarkup);
        self::assertSame(135.0, $desgloseMarkup['precio_antes_impuestos']);
        self::assertSame(35.0, $desgloseMarkup['ganancia_valor']);
        self::assertSame(25.65, $desgloseMarkup['iva_valor']);
        self::assertSame(160.65, $desgloseMarkup['precio_final_cliente']);

        // Pantalla Figma 47-margen-venta: Margen sobre la venta (margin 25%, IVA 19%) -> 100 / (1 - 0.25) = 133.33
        $reglaMargin = new ReglaGananciaImpuestoDTO(
            tenantId: self::TENANT_A,
            tasaIvaPorcentaje: 19.0,
            metodoGanancia: ReglaGananciaImpuestoDTO::METODO_MARGEN_VENTA,
            porcentajeGanancia: 25.0,
            usuarioId: self::USUARIO_ADMIN,
        );

        $desgloseMargin = $servicio->simularDesglosePrecio(100.0, $reglaMargin);
        self::assertSame(133.33, $desgloseMargin['precio_antes_impuestos']);
    }

    public function test_procesa_csv_de_precios_y_exige_confirmacion_explicita_cuando_hay_precios_bajo_costo(): void
    {
        $servicio = new CalculadoraPreciosImpuestosService();

        $catalogo = [
            'SKU-101' => [
                'sku' => 'SKU-101',
                'nombre' => 'Teclado Mecánico Pro',
                'costo' => 54.0,
                'precio' => 89.0,
                'tenant_id' => self::TENANT_A,
            ],
            'SKU-102' => [
                'sku' => 'SKU-102',
                'nombre' => 'Monitor IPS 27"',
                'costo' => 165.0,
                'precio' => 249.0,
                'tenant_id' => self::TENANT_A,
            ],
        ];

        // En SKU-102 el nuevo precio (150) está por debajo del nuevo costo (170) -> Pantalla Figma 77
        $csv = "SKU,Costo,Precio\nSKU-101,56,95\nSKU-102,170,150";

        $cambios = $servicio->procesarImportacionCsv($csv, self::TENANT_A, $catalogo);

        self::assertCount(2, $cambios);
        self::assertFalse($cambios[0]['bajo_costo']);
        self::assertTrue($cambios[1]['bajo_costo']);

        // Si autorizaBajoCosto es false, debe bloquear la publicación
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Confirma que autorizas precios por debajo del costo antes de aplicar.');
        $servicio->confirmarPublicacionPrecios($cambios, false);
    }

    public function test_permite_publicar_precios_bajo_costo_cuando_el_usuario_marca_autorizacion_explicita(): void
    {
        $servicio = new CalculadoraPreciosImpuestosService();

        $cambios = [
            [
                'sku' => 'SKU-102',
                'nuevo_costo' => 170.0,
                'nuevo_precio' => 150.0,
                'bajo_costo' => true,
            ],
        ];

        $resultado = $servicio->confirmarPublicacionPrecios($cambios, true);
        self::assertSame(1, $resultado['actualizados']);
        self::assertSame('Lista de precios actualizada (1 productos).', $resultado['mensaje']);
    }

    public function test_genera_alertas_de_stock_bajo_y_marca_todas_como_leidas_respetando_tenant_id(): void
    {
        $gestor = new GestorAlertasInventarioService();

        $productos = [
            [
                'id' => 'p-1',
                'tenant_id' => self::TENANT_A,
                'sku' => 'SKU-102',
                'nombre' => 'Monitor IPS 27"',
                'stock_actual' => 5,
                'stock_minimo' => 8,
                'bodega' => 'Bodega principal',
            ],
        ];

        $alertas = $gestor->generarAlertasStockBajo(self::TENANT_A, $productos);
        self::assertCount(1, $alertas);
        self::assertFalse($alertas[0]['leida']);

        $actualizadas = $gestor->marcarTodasComoLeidas(self::TENANT_A, $alertas);
        self::assertTrue($actualizadas[0]['leida']);

        $this->expectException(DomainException::class);
        $gestor->marcarTodasComoLeidas(self::TENANT_B, $alertas);
    }
}
