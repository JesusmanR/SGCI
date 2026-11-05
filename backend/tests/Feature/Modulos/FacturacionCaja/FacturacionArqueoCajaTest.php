<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\FacturacionCaja;

use App\Modulos\FacturacionCaja\DTOs\RegistrarCobroCajaDTO;
use App\Modulos\FacturacionCaja\Servicios\GestorFacturacionArqueoCajaService;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD del Sprint 7 (feat/facturacion-caja-galeria-figma).
 * Valida cobros en Efectivo/Tarjeta/Transferencia, descuento automático de stock
 * y cierre de caja con arqueo (Pantallas Figma 21 a 35, 75 y 76).
 */
final class FacturacionArqueoCajaTest extends TestCase
{
    private const TENANT_A = '11111111-1111-4111-8111-111111111111';
    private const TENANT_B = '22222222-2222-4222-8222-222222222222';
    private const ALMACEN_PRINCIPAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const CAJERO_ID = '99999999-9999-4999-8999-999999999999';

    public function test_confirma_cobro_en_efectivo_calcula_cambio_y_descuenta_stock_en_kardex(): void
    {
        $servicio = new GestorFacturacionArqueoCajaService();

        $inventario = [
            'PRD-001' => [
                'sku' => 'PRD-001',
                'nombre' => 'Teclado Mecánico Pro',
                'stock_actual' => 15,
                'tenant_id' => self::TENANT_A,
            ],
        ];

        $dto = new RegistrarCobroCajaDTO(
            tenantId: self::TENANT_A,
            almacenId: self::ALMACEN_PRINCIPAL,
            referenciaFactura: 'FAC-1042',
            lineasFactura: [
                ['sku' => 'PRD-001', 'cantidad' => 2, 'precio_unitario' => 89.0],
            ],
            totalFactura: 178.0,
            metodoPago: RegistrarCobroCajaDTO::METODO_EFECTIVO,
            efectivoRecibido: 200.0,
            referenciaPago: '',
            cajeroUsuarioId: self::CAJERO_ID,
        );

        $resultado = $servicio->confirmarCobroYDescontarStock($dto, true, $inventario, 1049);

        self::assertSame('CB-1049', $resultado['comprobante_id']);
        self::assertSame(22.0, $resultado['cambio_devolver']);
        self::assertSame(13, $resultado['inventario_actualizado']['PRD-001']['stock_actual']);
        self::assertSame(-2, $resultado['movimientos_kardex'][0]['variacion']);
    }

    public function test_cierre_de_caja_exige_observaciones_cuando_hay_diferencia_en_el_arqueo(): void
    {
        $servicio = new GestorFacturacionArqueoCajaService();

        $cobros = [
            ['metodo_pago' => 'Efectivo', 'total_cobrado' => 150.0],
            ['metodo_pago' => 'Tarjeta', 'total_cobrado' => 80.0],
        ];

        // Base 100 + Efectivo 150 = 250 esperado. Si se cuentan 240 (-10 de diferencia) sin nota, debe fallar
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Indica el motivo de la diferencia para cerrar la caja.');

        $servicio->ejecutarCierreArqueoCaja(
            baseInicialEfectivo: 100.0,
            cobrosSesion: $cobros,
            efectivoFisicoContado: 240.0,
            observaciones: '   ',
        );
    }

    public function test_bloquea_cobro_cross_tenant_sobre_inventario_de_otra_organizacion(): void
    {
        $servicio = new GestorFacturacionArqueoCajaService();

        $inventario = [
            'PRD-001' => [
                'sku' => 'PRD-001',
                'nombre' => 'Teclado Mecánico Pro',
                'stock_actual' => 15,
                'tenant_id' => self::TENANT_B,
            ],
        ];

        $dto = new RegistrarCobroCajaDTO(
            tenantId: self::TENANT_A,
            almacenId: self::ALMACEN_PRINCIPAL,
            referenciaFactura: 'FAC-9999',
            lineasFactura: [
                ['sku' => 'PRD-001', 'cantidad' => 1, 'precio_unitario' => 89.0],
            ],
            totalFactura: 89.0,
            metodoPago: RegistrarCobroCajaDTO::METODO_TARJETA,
            efectivoRecibido: 0.0,
            referenciaPago: 'AUT-88412',
            cajeroUsuarioId: self::CAJERO_ID,
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Violación Multi-Tenant');

        $servicio->confirmarCobroYDescontarStock($dto, true, $inventario);
    }
}
