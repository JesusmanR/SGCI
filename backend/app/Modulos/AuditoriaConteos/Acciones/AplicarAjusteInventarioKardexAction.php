<?php

declare(strict_types=1);

namespace App\Modulos\AuditoriaConteos\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\AuditoriaConteos\DTOs\RegistrarAjusteInventarioDTO;
use InvalidArgumentException;
use RuntimeException;

/**
 * Caso de uso para aplicar un Ajuste de Inventario por Conteo Físico / Merma (`45-ajuste-confirmado`)
 * y generar automáticamente el asiento inmutable en el Libro Mayor de Kardex.
 *
 * Incluye regla de **Doble Firma de Autorización** cuando el impacto monetario absoluto
 * supera el umbral de control interno del Tenant (por defecto $1,000.00 USD).
 */
final class AplicarAjusteInventarioKardexAction
{
    public function __construct(
        private readonly float $umbralDobleFirmaMonetario = 1000.0,
    ) {
    }

    /**
     * Ejecuta la conciliación del conteo físico y genera el asiento inmutable de Kardex.
     *
     * @return array{
     *     id: string,
     *     tenant_id: string,
     *     warehouse_id: string,
     *     product_id: string,
     *     sku: string,
     *     nombre_producto: string,
     *     stock_anterior: float,
     *     nuevo_stock: float,
     *     variacion: float,
     *     motivo: string,
     *     observaciones: ?string,
     *     impacto_monetario: float,
     *     requirio_doble_firma: bool,
     *     asiento_kardex: array<string, mixed>,
     *     mensaje_confirmacion: string
     * }
     */
    public function ejecutar(RegistrarAjusteInventarioDTO $dto): array
    {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();

        if ($tenantActual === null || $tenantActual !== $dto->tenantId) {
            throw new RuntimeException(
                'Violación de aislamiento Multi-Tenant al aplicar ajuste de inventario.'
            );
        }

        $requiereDobleFirma = abs($dto->impactoMonetario) >= $this->umbralDobleFirmaMonetario;

        if ($requiereDobleFirma) {
            if ($dto->usuarioAutorizadorId === null || trim($dto->usuarioAutorizadorId) === '') {
                throw new InvalidArgumentException(
                    sprintf(
                        'El ajuste tiene un impacto patrimonial de $%.2f (umbral $%.2f) y requiere segunda firma de autorización (Jefe de Almacén / Contador).',
                        abs($dto->impactoMonetario),
                        $this->umbralDobleFirmaMonetario
                    )
                );
            }

            if ($dto->usuarioAutorizadorId === $dto->usuarioResponsableId) {
                throw new InvalidArgumentException(
                    'Segregación de funciones violada: El segundo autorizador del ajuste no puede ser el mismo operador que registró el conteo.'
                );
            }
        }

        $folioAjuste = 'ADJ-' . strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 8));
        $cantidadAbsoluta = abs($dto->variacionUnidades);
        $nuevoValorTotal = round($dto->cantidadRealContada * $dto->costoUnitarioActual, 4);

        $asientoKardex = [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $tenantActual,
            'warehouse_id' => $dto->warehouseId,
            'product_id' => $dto->productId,
            'sku' => $dto->sku,
            'lot_id' => $dto->loteId,
            'tipo_movimiento' => $dto->tipoMovimientoKardex,
            'motivo' => $dto->motivoAjuste,
            'referencia_documento' => $folioAjuste,
            'cantidad' => $cantidadAbsoluta,
            'variacion_con_signo' => $dto->variacionUnidades,
            'costo_unitario' => $dto->costoUnitarioActual,
            'costo_total' => round($cantidadAbsoluta * $dto->costoUnitarioActual, 4),
            'saldo_cantidad' => $dto->cantidadRealContada,
            'saldo_costo_unitario' => $dto->costoUnitarioActual,
            'saldo_valor_total' => $nuevoValorTotal,
            'created_by' => $dto->usuarioResponsableId,
            'authorized_by' => $dto->usuarioAutorizadorId,
        ];

        return [
            'id' => $folioAjuste,
            'tenant_id' => $tenantActual,
            'warehouse_id' => $dto->warehouseId,
            'product_id' => $dto->productId,
            'sku' => $dto->sku,
            'nombre_producto' => $dto->nombreProducto,
            'stock_anterior' => $dto->stockActualSistema,
            'nuevo_stock' => $dto->cantidadRealContada,
            'variacion' => $dto->variacionUnidades,
            'motivo' => $dto->motivoAjuste,
            'observaciones' => $dto->observaciones,
            'impacto_monetario' => $dto->impactoMonetario,
            'requirio_doble_firma' => $requiereDobleFirma,
            'asiento_kardex' => $asientoKardex,
            'mensaje_confirmacion' => sprintf(
                'Ajuste registrado: %s ahora tiene %s unidades.',
                $dto->nombreProducto,
                rtrim(rtrim(number_format($dto->cantidadRealContada, 4, '.', ''), '0'), '.')
            ),
        ];
    }
}
