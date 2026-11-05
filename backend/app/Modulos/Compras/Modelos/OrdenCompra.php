<?php

declare(strict_types=1);

namespace App\Modulos\Compras\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Almacenes\Modelos\Almacen;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Órdenes de Compra (`purchase_orders`).
 *
 * Estados canónicos (`EstadoOrdenCompra`):
 * - `BORRADOR`
 * - `APROBADA`
 * - `ENVIADA`
 * - `RECIBIDA_PARCIAL`
 * - `RECIBIDA_COMPLETA`
 * - `CANCELADA`
 */
class OrdenCompra extends ModeloBaseTenant
{
    protected $table = 'purchase_orders';

    protected $fillable = [
        'supplier_id',
        'warehouse_id',
        'numero_orden',
        'estado',
        'fecha_emision',
        'fecha_entrega_esperada',
        'subtotal',
        'impuestos',
        'total',
        'notas',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_entrega_esperada' => 'date',
        'subtotal' => 'float',
        'impuestos' => 'float',
        'total' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Proveedor adjudicado.
     */
    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'supplier_id');
    }

    /**
     * Almacén de destino donde se recibirá la mercadería.
     */
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'warehouse_id');
    }

    /**
     * Renglones de productos solicitados en la orden.
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleOrdenCompra::class, 'purchase_order_id');
    }

    /**
     * Indica si la orden se encuentra en un estado apto para recepción física en muelle.
     */
    public function permiteRecepcionEnMuelle(): bool
    {
        return in_array((string) $this->estado, ['APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'], true);
    }
}
