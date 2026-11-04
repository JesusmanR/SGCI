<?php

declare(strict_types=1);

namespace App\Modulos\Lotes\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Catalogo\Modelos\Producto;
use DateTimeImmutable;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Eloquent para Lotes de Producto (`product_lots`).
 *
 * Implementa la lógica de dominio para:
 * - Trazabilidad por lote de fabricación/importación.
 * - Cálculo de días remanentes de vida útil.
 * - Semáforo sanitario/industrial de caducidad (VIGENTE, ADVERTENCIA, PROXIMO_A_VENCER, VENCIDO, CUARENTENA).
 * - Elegibilidad de despacho bajo regla FEFO (First Expired, First Out).
 */
class LoteProducto extends ModeloBaseTenant
{
    protected $table = 'product_lots';

    protected $fillable = [
        'product_id',
        'numero_lote',
        'fecha_fabricacion',
        'fecha_vencimiento',
        'costo_unitario_entrada',
        'stock_inicial',
        'stock_actual',
        'is_active',
        'en_cuarentena',
        'motivo_cuarentena',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'fecha_fabricacion' => 'date',
        'fecha_vencimiento' => 'date',
        'costo_unitario_entrada' => 'float',
        'stock_inicial' => 'float',
        'stock_actual' => 'float',
        'is_active' => 'boolean',
        'en_cuarentena' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Producto asociado al lote.
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }

    /**
     * Calcula los días calendario restantes hasta la fecha de vencimiento.
     * Retorna `null` si el lote no posee fecha de caducidad.
     */
    public function calcularDiasParaVencimiento(?DateTimeInterface $fechaReferencia = null): ?int
    {
        if ($this->fecha_vencimiento === null) {
            return null;
        }

        $referencia = $fechaReferencia !== null
            ? DateTimeImmutable::createFromInterface($fechaReferencia)->setTime(0, 0, 0)
            : new DateTimeImmutable('today');

        $vencimiento = DateTimeImmutable::createFromInterface($this->fecha_vencimiento)->setTime(0, 0, 0);
        $diferencia = $referencia->diff($vencimiento);

        return (int) $diferencia->format('%r%a');
    }

    /**
     * Evalúa el estado del semáforo de caducidad del lote:
     * - `CUARENTENA`: Lote bloqueado por control de calidad o inactivo.
     * - `VENCIDO`: 0 días o menos (bloqueado para despacho).
     * - `PROXIMO_A_VENCER`: Entre 1 y 30 días (prioridad crítica de salida FEFO).
     * - `ADVERTENCIA`: Entre 31 y 60 días (alerta preventiva).
     * - `VIGENTE`: Más de 60 días.
     * - `SIN_CADUCIDAD`: Lote industrial no perecedero.
     */
    public function evaluarSemaforoCaducidad(?DateTimeInterface $fechaReferencia = null): string
    {
        if ((bool) $this->en_cuarentena || !$this->is_active) {
            return 'CUARENTENA';
        }

        $dias = $this->calcularDiasParaVencimiento($fechaReferencia);

        if ($dias === null) {
            return 'SIN_CADUCIDAD';
        }

        if ($dias <= 0) {
            return 'VENCIDO';
        }

        if ($dias <= 30) {
            return 'PROXIMO_A_VENCER';
        }

        if ($dias <= 60) {
            return 'ADVERTENCIA';
        }

        return 'VIGENTE';
    }

    /**
     * Determina si el lote puede ser utilizado en operaciones de picking/salida.
     */
    public function esAptoParaDespacho(?DateTimeInterface $fechaReferencia = null): bool
    {
        if ((float) $this->stock_actual <= 0.0) {
            return false;
        }

        $semaforo = $this->evaluarSemaforoCaducidad($fechaReferencia);

        return !in_array($semaforo, ['CUARENTENA', 'VENCIDO'], true);
    }
}
