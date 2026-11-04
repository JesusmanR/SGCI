<?php

declare(strict_types=1);

namespace App\Compartido\Modelos;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Clase base abstracta para modelos con persistencia multi-tenant aislada.
 *
 * Implementa:
 * - Identificadores primarios UUIDv4 no secuenciales.
 * - Borrado lógico (SoftDeletes) con registro de marca temporal `deleted_at`.
 * - Global Scope estricto para aislamiento automático de consultas por `tenant_id`.
 * - Inyección automática de `tenant_id`, `created_by` y `updated_by` en el ciclo de vida del modelo.
 */
abstract class ModeloBaseTenant extends Model
{
    use HasUuids;
    use SoftDeletes;

    /**
     * El tipo de la clave primaria.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indica si los identificadores son autoincrementales.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * Variable estática para forzar o sobreescribir el ID de tenant activo (útil en tests y jobs).
     */
    protected static ?string $tenantIdEnContexto = null;

    /**
     * Configuración del ciclo de vida del modelo y registro de Global Scopes.
     */
    protected static function booted(): void
    {
        parent::booted();

        // 1. Global Scope: Aplica filtrado automático por `tenant_id` con principio Fail-Closed
        static::addGlobalScope('tenant_isolation', function (Builder $builder): void {
            $tenantId = static::obtenerTenantIdActual();

            if ($tenantId !== null && $tenantId !== '') {
                $builder->where($builder->getModel()->getTable() . '.tenant_id', '=', $tenantId);
            } else {
                // FAIL-CLOSED: Si no hay tenant en contexto, bloquea la consulta para prevenir fugas cross-tenant
                $builder->whereRaw('1 = 0');
            }
        });

        // 2. Evento Creating: Asignación automática y blindaje de tenant_id, created_by
        static::creating(function (ModeloBaseTenant $modelo): void {
            $tenantId = static::obtenerTenantIdActual();

            if ($tenantId === null || $tenantId === '') {
                throw new RuntimeException(
                    sprintf('No se puede crear una entidad [%s] sin un contexto de tenant_id activo.', static::class)
                );
            }

            // Blindaje contra inyección / manipulación de tenant_id por asignación masiva (Mass Assignment)
            if (!empty($modelo->tenant_id) && $modelo->tenant_id !== $tenantId) {
                throw new RuntimeException(
                    sprintf(
                        'Violación de Aislamiento Cross-Tenant detectada en [%s]. Tenant esperado: [%s], Tenant recibido: [%s]',
                        static::class,
                        $tenantId,
                        $modelo->tenant_id
                    )
                );
            }

            $modelo->tenant_id = $tenantId;

            if (empty($modelo->created_by) && Auth::check()) {
                $modelo->created_by = (string) Auth::id();
            }

            if (empty($modelo->updated_by) && Auth::check()) {
                $modelo->updated_by = (string) Auth::id();
            }
        });

        // 3. Evento Updating: Asignación automática de updated_by
        static::updating(function (ModeloBaseTenant $modelo): void {
            if (Auth::check()) {
                $modelo->updated_by = (string) Auth::id();
            }
        });
    }

    /**
     * Obtiene el identificador del tenant en el contexto de ejecución actual.
     * Resuelve por prioridad:
     * 1. Variable estática explícita (testing / CLI / queue jobs).
     * 2. Contexto registrado en el contenedor de servicios de Laravel.
     * 3. Tenant asociado al usuario autenticado (JWT Claim).
     * 4. Encabezado HTTP `X-Tenant-ID`.
     */
    public static function obtenerTenantIdActual(): ?string
    {
        if (static::$tenantIdEnContexto !== null) {
            return static::$tenantIdEnContexto;
        }

        if (app()->bound('tenant_id')) {
            $contextTenant = app('tenant_id');
            if (is_string($contextTenant) && $contextTenant !== '') {
                return $contextTenant;
            }
        }

        if (Auth::check()) {
            $usuario = Auth::user();
            if (isset($usuario->tenant_id) && is_string($usuario->tenant_id) && $usuario->tenant_id !== '') {
                // Si la petición incluye X-Tenant-ID, verificar concordancia criptográfica con el token
                if (request()->hasHeader('X-Tenant-ID')) {
                    $headerTenant = request()->header('X-Tenant-ID');
                    if ($headerTenant !== $usuario->tenant_id) {
                        throw new RuntimeException('Discrepancia crítica: Encabezado X-Tenant-ID no coincide con el tenant_id autenticado.');
                    }
                }
                return $usuario->tenant_id;
            }
        }

        if (request()->hasHeader('X-Tenant-ID')) {
            $headerTenant = request()->header('X-Tenant-ID');
            if (is_string($headerTenant) && $headerTenant !== '') {
                return $headerTenant;
            }
        }

        return null;
    }

    /**
     * Fija explícitamente el tenant en contexto (para suites de testing o tareas asíncronas).
     */
    public static function fijarTenantContexto(?string $tenantId): void
    {
        static::$tenantIdEnContexto = $tenantId;
    }

    /**
     * Scope local para consultar registros omitiendo el aislamiento de tenant (Super Admin).
     */
    public function scopeSinAislamientoTenant(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant_isolation');
    }
}
