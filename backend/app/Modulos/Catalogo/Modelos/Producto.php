<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Eloquent para el Maestro de Productos / Artículos (`products`).
 *
 * Centraliza el código SKU único por Tenant, código de barras EAN-13/QR,
 * método de valoración contable (`PEPS`, `UEPS`, `PROMEDIO_PONDERADO`)
 * y umbrales de control de inventario (`stock_minimo`, `punto_reorden`, `stock_maximo`).
 */
class Producto extends ModeloBaseTenant
{
    protected $table = 'products';

    protected $fillable = [
        'category_id',
        'unit_of_measure_id',
        'sku',
        'barcode',
        'name',
        'description',
        'metodo_valoracion',
        'stock_minimo',
        'stock_maximo',
        'punto_reorden',
        'maneja_lotes',
        'perecedero',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'stock_minimo' => 'float',
        'stock_maximo' => 'float',
        'punto_reorden' => 'float',
        'maneja_lotes' => 'boolean',
        'perecedero' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Categoría a la que pertenece el artículo.
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'category_id');
    }

    /**
     * Unidad de medida base en la que se expresa el Kardex.
     */
    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class, 'unit_of_measure_id');
    }

    /**
     * Evalúa el estado del semáforo de stock frente a los umbrales parametrizados.
     *
     * @return string 'CRITICO' | 'REORDEN' | 'SOBREINVENTARIO' | 'OPTIMO'
     */
    public function evaluarNivelStock(float $stockDisponible): string
    {
        $minimo = (float) $this->stock_minimo;
        $reorden = (float) $this->punto_reorden;
        $maximo = (float) $this->stock_maximo;

        if ($stockDisponible <= $minimo) {
            return 'CRITICO';
        }

        if ($stockDisponible <= $reorden) {
            return 'REORDEN';
        }

        if ($maximo > 0 && $stockDisponible > $maximo) {
            return 'SOBREINVENTARIO';
        }

        return 'OPTIMO';
    }

    /**
     * Determina si el producto requiere disparar una alerta de Punto de Reorden (ROP).
     */
    public function requiereReabastecimiento(float $stockDisponible): bool
    {
        return $stockDisponible <= (float) $this->punto_reorden;
    }

    /**
     * Calcula la cantidad sugerida de compra para recuperar el stock máximo.
     */
    public function calcularCantidadSugeridaCompra(float $stockDisponible): float
    {
        $maximo = (float) $this->stock_maximo;
        if ($maximo <= 0 || $stockDisponible >= $maximo) {
            return 0.0;
        }

        return round($maximo - max(0.0, $stockDisponible), 4);
    }
}
