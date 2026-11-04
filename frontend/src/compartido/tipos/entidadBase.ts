/**
 * Tipos e Interfaces Fundamentales del SGCI (Sistema de Gestión de Control de Inventarios)
 * Frontend Vue 3 + TypeScript Estricto
 * Multi-Tenancy nativo y auditoría en cada entidad.
 */

// ---------------------------------------------------------------------------
// 1. Contrato Base de Auditoría y Multi-Tenancy
// ---------------------------------------------------------------------------

export interface EntidadBaseTenant {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// 2. Roles RBAC Canónicos (10 Roles Empresariales SGCI)
// ---------------------------------------------------------------------------

export const ROLES_SGCI = {
  // Matriz Oficial Canónica (ADR-001 y Modelo de Datos Multi-Tenant §3.2)
  SUPER_ADMIN_SAAS: 'SUPER_ADMIN_SAAS',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_TENANT: 'ADMIN_TENANT',
  GERENTE_OPERACIONES: 'GERENTE_OPERACIONES',
  JEFE_ALMACEN: 'JEFE_ALMACEN',
  SUPERVISOR_INVENTARIO: 'SUPERVISOR_INVENTARIO',
  ALMACENISTA_OPERADOR: 'ALMACENISTA_OPERADOR',
  COMPRADOR_ABASTECIMIENTO: 'COMPRADOR_ABASTECIMIENTO',
  AUDITOR_INVENTARIO: 'AUDITOR_INVENTARIO',
  CONTADOR_COSTOS: 'CONTADOR_COSTOS',
  VISOR_CONSULTA: 'VISOR_CONSULTA',

  // Alias de compatibilidad semántica
  ADMINISTRADOR_EMPRESA: 'ADMIN_TENANT',
  ANALISTA_INVENTARIOS: 'SUPERVISOR_INVENTARIO',
  ENCARGADO_COMPRAS: 'COMPRADOR_ABASTECIMIENTO',
  AUXILIAR_BODEGA: 'ALMACENISTA_OPERADOR',
  AUDITOR_INTERNO: 'AUDITOR_INVENTARIO',
  SUPERVISOR_CALIDAD: 'CONTADOR_COSTOS',
  OPERADOR_LOGISTICO: 'VISOR_CONSULTA',
} as const;

export type RolSGCI = (typeof ROLES_SGCI)[keyof typeof ROLES_SGCI];

export interface UsuarioAutenticado extends EntidadBaseTenant {
  email: string;
  nombre_completo: string;
  rol: RolSGCI;
  almacenes_asignados_ids: string[];
  activo: boolean;
  avatar_url?: string;
}

// ---------------------------------------------------------------------------
// 3. Catálogo y Productos
// ---------------------------------------------------------------------------

export type MetodoValoracion = 'PEPS' | 'CPP'; // Primeras Entradas Primeras Salidas | Costo Promedio Ponderado
export type EstadoProducto = 'ACTIVO' | 'INACTIVO' | 'DESCONTINUADO';

export interface ProductoInventario extends EntidadBaseTenant {
  sku: string;
  codigo_barras: string;
  nombre: string;
  descripcion: string;
  categoria_id: string;
  categoria_nombre?: string;
  unidad_medida: string; // 'PZA', 'KG', 'LITRO', 'CAJA', 'TARIMA'
  stock_minimo: number;
  stock_maximo: number;
  punto_reorden: number;
  control_lotes: boolean;
  metodo_valoracion: MetodoValoracion;
  estado: EstadoProducto;
  peso_kg?: number;
  temperatura_controlada?: boolean;
}

// ---------------------------------------------------------------------------
// 4. Lotes y Trazabilidad
// ---------------------------------------------------------------------------

export type EstadoLote = 'DISPONIBLE' | 'CUARENTENA' | 'VENCIDO' | 'AGOTADO';

export interface LoteInventario extends EntidadBaseTenant {
  producto_id: string;
  numero_lote: string;
  fecha_fabricacion: string;
  fecha_vencimiento: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: EstadoLote;
  proveedor_id?: string;
  certificado_calidad_url?: string;
}

// ---------------------------------------------------------------------------
// 5. Existencias por Almacén y Ubicación
// ---------------------------------------------------------------------------

export type NivelStockSemaforo = 'CRITICO' | 'REORDEN' | 'OPTIMO' | 'SOBREINVENTARIO';

export interface ExistenciaAlmacen extends EntidadBaseTenant {
  producto_id: string;
  producto?: ProductoInventario;
  almacen_id: string;
  almacen_nombre?: string;
  ubicacion_pasillo: string;
  ubicacion_estante: string;
  ubicacion_nivel: string;
  cantidad_disponible: number;
  cantidad_reservada: number;
  cantidad_bloqueada: number;
  costo_promedio_actual: number;
  valor_total_inventario: number;
  lote_proximo_vencer?: LoteInventario | null;
  ultima_actualizacion_kardex: string;
}

// ---------------------------------------------------------------------------
// 6. Kardex y Movimientos
// ---------------------------------------------------------------------------

export type TipoMovimientoKardex =
  | 'ENTRADA'
  | 'SALIDA'
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'SALIDA_DESPACHO'
  | 'ENTRADA_TRANSFERENCIA'
  | 'SALIDA_TRANSFERENCIA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'PRODUCCION_ENTRADA'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR'
  | 'MERMA_DANO'
  | 'MERMA_DESECHO';

export interface MovimientoKardex extends EntidadBaseTenant {
  producto_id: string;
  almacen_id: string;
  tipo_movimiento: TipoMovimientoKardex;
  motivo: string;
  referencia_documento: string; // Ej: FACT-2026-0091, REM-552, TRF-8812, ADJ-CIEGO-04
  lote_id: string | null;
  numero_lote?: string | null;
  fecha_movimiento: string;

  // Unidades y Costos del Movimiento
  cantidad: number;
  costo_unitario: number;
  costo_total: number;

  // Saldos Resultantes (Auditoría Inmutable)
  saldo_cantidad: number;
  saldo_costo_unitario: number;
  saldo_costo_total: number;

  // Información del operador
  operador_nombre?: string;
  observaciones?: string;
}

// ---------------------------------------------------------------------------
// 7. PWA Offline & Sincronización
// ---------------------------------------------------------------------------

export type EstadoSincronizacionOffline = 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR';

export interface MovimientoOffline {
  id_temporal: string;
  tenant_id: string;
  almacen_id: string;
  producto_id: string;
  tipo_movimiento: TipoMovimientoKardex;
  cantidad: number;
  costo_unitario: number;
  referencia_documento: string;
  motivo: string;
  lote_id: string | null;
  fecha_registro_local: string;
  creado_por_id: string;
  estado_sincronizacion: EstadoSincronizacionOffline;
  intentos: number;
  error_mensaje?: string | null;
}

// ---------------------------------------------------------------------------
// 8. Eventos WebSockets en Tiempo Real
// ---------------------------------------------------------------------------

export interface EventoStockWebSocket {
  tenant_id: string;
  almacen_id: string;
  producto_id: string;
  nueva_cantidad_disponible: number;
  nuevo_costo_promedio: number;
  nuevo_valor_total: number;
  tipo_movimiento: TipoMovimientoKardex;
  timestamp: string;
}
