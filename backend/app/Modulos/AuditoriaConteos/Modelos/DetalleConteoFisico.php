<?php

declare(strict_types=1);

namespace App\Modulos\AuditoriaConteos\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Catalogo\Modelos\Producto;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Eloquent para el detalle por producto/ubicación de un Conteo Físico (`physical_audit_items`).
 *
 * Soporta modalidad de Conteo Ciego (el operador captura `cantidad_fisica` sin ver `cantidad_sistema`
 * hasta el paso de revisión y conciliación `44-ajuste-revision`).
 */
class DetalleConteoFisico extends ModeloBaseTenant
{
    protected $table = 'physical_audit_items';

    protected $fillable = [
        'physical_audit_id',
        'product_id',
        'location_id',
        'lot_id',
        'cantidad_sistema',
        'cantidad_fisica',
        'diferencia',
        'costo_unitario',
        'valor_diferencia',
        'motivo_ajuste',
        'observaciones',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'cantidad_sistema' => 'float',
        'cantidad_fisica' => 'float',
        'diferencia' => 'float',
        'costo_unitario' => 'float',
        'valor_diferencia' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function conteoFisico(): BelongsTo
    {
        return $this->belongsTo(ConteoFisico::class, 'physical_audit_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }
}
