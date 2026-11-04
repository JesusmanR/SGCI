<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\Estrategias;

use DomainException;

/**
 * Excepción de dominio lanzada cuando no existe stock físico o contable disponible
 * suficiente para procesar la salida solicitada.
 */
class StockInsuficienteException extends DomainException
{
    /**
     * @param float $disponible Cantidad actualmente disponible.
     * @param float $solicitada Cantidad requerida en la salida.
     */
    public function __construct(
        public readonly float $disponible,
        public readonly float $solicitada,
        string $mensaje = 'Stock insuficiente para procesar la salida solicitada.'
    ) {
        parent::__construct(
            sprintf('%s (Disponible: %.4f, Solicitada: %.4f)', $mensaje, $disponible, $solicitada)
        );
    }
}

/**
 * Estructura inmutable que transporta el desglose del costo calculado para una salida de inventario.
 */
final readonly class ResultadoValoracionSalida
{
    /**
     * @param float $costoTotal Costo total consolidado de la salida.
     * @param float $costoUnitario Costo unitario promedio ponderado resultante de esta salida.
     * @param array<int, array{
     *     capa_id?: string,
     *     lote_id?: string|null,
     *     cantidad: float,
     *     costo_unitario: float,
     *     subtotal: float
     * }> $capasConsumidas Desglose cronológico de las capas o saldos consumidos.
     */
    public function __construct(
        public float $costoTotal,
        public float $costoUnitario,
        public array $capasConsumidas = []
    ) {}
}

/**
 * Contrato del Patrón Strategy para la valoración contable y costeo de inventarios en el Kardex.
 */
interface EstrategiaValoracionInterface
{
    /**
     * Retorna el identificador unívoco de la estrategia de valoración.
     * Ejemplos: 'PROMEDIO_PONDERADO', 'PEPS', 'UEPS'.
     */
    public function obtenerNombre(): string;

    /**
     * Calcula el costo total y unitario que debe asignarse a un movimiento de salida.
     *
     * @param string $tenantId UUID de la organización tenant.
     * @param string $almacenId UUID del almacén de origen.
     * @param string $productoId UUID del producto.
     * @param float $cantidadSalida Cantidad que egresa del inventario (> 0).
     * @param string|null $loteId UUID del lote si la búsqueda es específica por lote.
     *
     * @return ResultadoValoracionSalida
     * @throws StockInsuficienteException Si las existencias no cubren la cantidad requerida.
     */
    public function calcularCostoSalida(
        string $tenantId,
        string $almacenId,
        string $productoId,
        float $cantidadSalida,
        ?string $loteId = null
    ): ResultadoValoracionSalida;

    /**
     * Calcula la valorización monetaria total de las existencias actuales de un producto en un almacén.
     *
     * @param string $tenantId UUID de la organización tenant.
     * @param string $almacenId UUID del almacén.
     * @param string $productoId UUID del producto.
     *
     * @return float Valoración total del saldo actual.
     */
    public function calcularValoracionExistencias(
        string $tenantId,
        string $almacenId,
        string $productoId
    ): float;
}
