<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\Estrategias;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Implementación del Patrón Strategy para el método de valoración
 * Costo Promedio Ponderado (CPP).
 */
final class ValoracionPromedioPonderado implements EstrategiaValoracionInterface
{
    public const NOMBRE = 'PROMEDIO_PONDERADO';

    public function obtenerNombre(): string
    {
        return self::NOMBRE;
    }

    public function obtenerNombreMetodo(): string
    {
        return self::NOMBRE;
    }

    /**
     * Calcula el nuevo saldo y costo unitario promedio ponderado tras una entrada de mercadería.
     *
     * @return array{saldo_cantidad: float, saldo_costo_unitario: float, saldo_valor_total: float}
     */
    public function calcularEntrada(
        float $cantidadActual,
        float $costoUnitarioActual,
        float $cantidadEntrada,
        float $costoUnitarioEntrada
    ): array {
        $valorPrevio = $cantidadActual * $costoUnitarioActual;
        $valorEntrada = $cantidadEntrada * $costoUnitarioEntrada;
        $nuevoSaldoCantidad = round($cantidadActual + $cantidadEntrada, 4);
        $nuevoValorTotal = round($valorPrevio + $valorEntrada, 4);
        $nuevoCostoUnitario = $nuevoSaldoCantidad > 0.0
            ? round($nuevoValorTotal / $nuevoSaldoCantidad, 4)
            : 0.0;

        return [
            'saldo_cantidad' => $nuevoSaldoCantidad,
            'saldo_costo_unitario' => $nuevoCostoUnitario,
            'saldo_valor_total' => $nuevoValorTotal,
        ];
    }

    /**
     * Calcula el costo que se aplicará a un movimiento de egreso bajo Costo Promedio Ponderado.
     *
     * @throws StockInsuficienteException
     */
    public function calcularCostoSalida(
        string $tenantId,
        string $almacenId,
        string $productoId,
        float $cantidadSalida,
        ?string $loteId = null
    ): ResultadoValoracionSalida {
        if ($cantidadSalida <= 0.0) {
            throw new InvalidArgumentException('La cantidad solicitada de salida debe ser mayor a 0.');
        }

        $query = DB::table('existencias_almacen')
            ->where('tenant_id', '=', $tenantId)
            ->where('almacen_id', '=', $almacenId)
            ->where('producto_id', '=', $productoId)
            ->whereNull('deleted_at');

        if ($loteId !== null) {
            $query->where('lote_id', '=', $loteId);
        }

        $existencia = $query->select([
            DB::raw('COALESCE(SUM(cantidad_disponible), 0) as total_disponible'),
            DB::raw('COALESCE(SUM(valor_total), 0) as total_valorizado'),
        ])->first();

        $stockDisponible = (float) ($existencia->total_disponible ?? 0.0);
        $totalValorizado = (float) ($existencia->total_valorizado ?? 0.0);

        if ($stockDisponible < $cantidadSalida) {
            throw new StockInsuficienteException(
                disponible: $stockDisponible,
                solicitada: $cantidadSalida,
                mensaje: sprintf(
                    'No hay existencias suficientes para el producto [%s] en el almacén [%s] bajo CPP.',
                    $productoId,
                    $almacenId
                )
            );
        }

        $costoUnitario = $stockDisponible > 0.0
            ? round($totalValorizado / $stockDisponible, 4)
            : 0.0;

        $costoTotal = round($cantidadSalida * $costoUnitario, 4);

        $capaConsumida = [
            'capa_id' => 'CPP-CONSOLIDADO',
            'lote_id' => $loteId,
            'cantidad' => $cantidadSalida,
            'costo_unitario' => $costoUnitario,
            'subtotal' => $costoTotal,
        ];

        return new ResultadoValoracionSalida(
            costoTotal: $costoTotal,
            costoUnitario: $costoUnitario,
            capasConsumidas: [$capaConsumida]
        );
    }

    /**
     * Calcula la valorización total del saldo actual del producto en el almacén.
     */
    public function calcularValoracionExistencias(
        string $tenantId,
        string $almacenId,
        string $productoId
    ): float {
        $existencia = DB::table('existencias_almacen')
            ->where('tenant_id', '=', $tenantId)
            ->where('almacen_id', '=', $almacenId)
            ->where('producto_id', '=', $productoId)
            ->whereNull('deleted_at')
            ->select(DB::raw('COALESCE(SUM(valor_total), 0) as total_valorizado'))
            ->first();

        return round((float) ($existencia->total_valorizado ?? 0.0), 4);
    }
}
