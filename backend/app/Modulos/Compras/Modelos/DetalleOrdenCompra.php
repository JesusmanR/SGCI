<?php

declare(strict_types=1);

namespace App\Modulos\Compras\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Catalogo\Modelos\Producto;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Eloquent para los renglones de una Orden de Compra (`purchase_order_items`).
 */
class DetalleOrdenCompra extends ModeloBaseTenant
{
    protected $table = 'purchase_order_items';

    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'cantidad_solicitada',
        'cantidad_recibida',
        'precio_unitario',
        'subtotal',
        'notas',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'cantidad_solicitada' => 'float',
        'cantidad_recibida' => 'float',
        'precio_unitario' => 'float',
        'subtotal' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function ordenCompra(): BelongsTo
    {
        return $this->belongsTo(OrdenCompra::class, 'purchase_order_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }

    /**
     * Calcula la cantidad pendiente por recibir de este renglón.
     */
    public function calcularCantidadPendiente(): float
    {
        return max(0.0, round((float) $this->cantidad_solicitada - (float) $this->cantidad_recibida, 4));
    }
}
