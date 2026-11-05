<?php

declare(strict_types=1);

namespace App\Modulos\AlertasTiempoReal\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;

/**
 * Modelo Eloquent Multi-Tenant para Alertas Operativas y Centro de Notificaciones.
 * Alineado con las pantallas Figma:
 * - 68-notificaciones (Bandeja de alertas con contador de no leídas)
 * - 69-notificaciones-leidas ("Marcar todas como leídas")
 */
class AlertaInventario extends ModeloBaseTenant
{
    protected $table = 'alertas_inventario';

    public const TIPO_STOCK_CRITICO = 'STOCK_CRITICO';
    public const TIPO_LOTE_PROXIMO_VENCER = 'LOTE_PROXIMO_VENCER';
    public const TIPO_ORDEN_COMPRA_PENDIENTE = 'ORDEN_COMPRA_PENDIENTE';
    public const TIPO_PRECIO_BAJO_COSTO = 'PRECIO_BAJO_COSTO';

    public const SEVERIDAD_CRITICA = 'CRITICA';
    public const SEVERIDAD_ADVERTENCIA = 'ADVERTENCIA';
    public const SEVERIDAD_INFORMATIVA = 'INFORMATIVA';

    protected $fillable = [
        'id',
        'tenant_id',
        'almacen_id',
        'producto_id',
        'tipo_alerta',
        'severidad',
        'titulo',
        'detalle',
        'leida',
        'leida_en',
        'vista_destino',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'leida' => 'boolean',
        'leida_en' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
}
