<?php

declare(strict_types=1);

namespace App\Modulos\AuditoriaConteos\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Almacenes\Modelos\Almacen;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Auditorías y Conteos Físicos de Inventario (`physical_audits`).
 *
 * Alinea con las pantallas Figma `42-historial-inventario`, `43-nuevo-ajuste`,
 * `44-ajuste-revision`, `45-ajuste-confirmado` y `78-inventario-sin-movimientos`.
 */
class ConteoFisico extends ModeloBaseTenant
{
    protected $table = 'physical_audits';

    protected $fillable = [
        'warehouse_id',
        'numero_conteo',
        'estado',
        'fecha_programada',
        'fecha_inicio',
        'fecha_cierre',
        'notas',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'fecha_programada' => 'date',
        'fecha_inicio' => 'datetime',
        'fecha_cierre' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'warehouse_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleConteoFisico::class, 'physical_audit_id');
    }
}
