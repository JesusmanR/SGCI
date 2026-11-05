<?php

declare(strict_types=1);

namespace App\Modulos\Compras\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Proveedores Homologados (`suppliers`).
 *
 * Aislado por `tenant_id`, almacena identificación fiscal (`tax_id`: RFC/NIT/RUC),
 * datos de contacto comercial y relación con órdenes de compra.
 */
class Proveedor extends ModeloBaseTenant
{
    protected $table = 'suppliers';

    protected $fillable = [
        'code',
        'tax_id',
        'name',
        'commercial_name',
        'email',
        'phone',
        'address',
        'contact_name',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Órdenes de compra emitidas a este proveedor.
     */
    public function ordenesCompra(): HasMany
    {
        return $this->hasMany(OrdenCompra::class, 'supplier_id');
    }
}
