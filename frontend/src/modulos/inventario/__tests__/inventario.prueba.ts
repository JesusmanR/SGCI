import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useInventarioStore } from '../almacen/useInventarioStore';
import BotonAurora from '../../../diseno/atomos/BotonAurora.vue';
import TarjetaIndicadorStock from '../../../diseno/moleculas/TarjetaIndicadorStock.vue';
import type {
  ProductoInventario,
  ExistenciaAlmacen,
  LoteInventario,
  EventoStockWebSocket,
} from '../../../compartido/tipos/entidadBase';

// ---------------------------------------------------------------------------
// Datos de Prueba (Fixtures) Multi-Tenant
// ---------------------------------------------------------------------------

const TENANT_A = 'tenant_empresa_alfa_001';
const TENANT_B = 'tenant_empresa_beta_999';

const productoBase: ProductoInventario = {
  id: 'prod_sku_100',
  tenant_id: TENANT_A,
  sku: 'AC-100-FLEX',
  codigo_barras: '7501234567890',
  nombre: 'Válvula de Presión Industrial 2"',
  descripcion: 'Válvula para líneas de vapor de alta presión',
  categoria_id: 'cat_valvulas',
  unidad_medida: 'PZA',
  stock_minimo: 10,
  stock_maximo: 100,
  punto_reorden: 25,
  control_lotes: true,
  metodo_valoracion: 'PEPS',
  estado: 'ACTIVO',
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-01-15T08:00:00Z',
  deleted_at: null,
  created_by: 'usr_jefe_almacen',
  updated_by: null,
};

const existenciaCritica: ExistenciaAlmacen = {
  id: 'exis_001',
  tenant_id: TENANT_A,
  producto_id: 'prod_sku_100',
  producto: productoBase,
  almacen_id: 'alm_central',
  almacen_nombre: 'Bodega Central Monterrey',
  ubicacion_pasillo: 'A',
  ubicacion_estante: '04',
  ubicacion_nivel: '02',
  cantidad_disponible: 5, // <= stock_minimo (10) -> CRITICO
  cantidad_reservada: 0,
  cantidad_bloqueada: 0,
  costo_promedio_actual: 450.0,
  valor_total_inventario: 2250.0,
  ultima_actualizacion_kardex: '2026-10-28T14:30:00Z',
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-10-28T14:30:00Z',
  deleted_at: null,
  created_by: 'usr_sistema',
  updated_by: null,
};

const existenciaOptima: ExistenciaAlmacen = {
  id: 'exis_002',
  tenant_id: TENANT_A,
  producto_id: 'prod_sku_200',
  producto: {
    ...productoBase,
    id: 'prod_sku_200',
    sku: 'MAN-500-HD',
    stock_minimo: 15,
    punto_reorden: 30,
    stock_maximo: 200,
  },
  almacen_id: 'alm_central',
  ubicacion_pasillo: 'B',
  ubicacion_estante: '01',
  ubicacion_nivel: '01',
  cantidad_disponible: 80, // > punto_reorden -> OPTIMO
  cantidad_reservada: 5,
  cantidad_bloqueada: 0,
  costo_promedio_actual: 120.0,
  valor_total_inventario: 9600.0,
  ultima_actualizacion_kardex: '2026-10-28T10:00:00Z',
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-10-28T10:00:00Z',
  deleted_at: null,
  created_by: 'usr_sistema',
  updated_by: null,
};

const lotePorVencer: LoteInventario = {
  id: 'lote_882',
  tenant_id: TENANT_A,
  producto_id: 'prod_sku_100',
  numero_lote: 'LOT-2026-OCT-882',
  fecha_fabricacion: '2025-10-01T00:00:00Z',
  fecha_vencimiento: '2026-11-15T00:00:00Z', // Vence próximamente
  cantidad_inicial: 50,
  cantidad_actual: 5,
  estado: 'DISPONIBLE',
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-10-28T08:00:00Z',
  deleted_at: null,
  created_by: 'usr_compras',
  updated_by: null,
};

// ---------------------------------------------------------------------------
// SUITE DE PRUEBAS TDD
// ---------------------------------------------------------------------------

describe('TDD: Store de Inventario - useInventarioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('debe rechazar operaciones si no se ha configurado un tenant_id', () => {
    const store = useInventarioStore();

    expect(() => {
      store.setExistencias([existenciaCritica]);
    }).toThrowError(/No se ha establecido un tenant_id válido/i);
  });

  it('debe aislar estrictamente las existencias por tenant_id', () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);

    const existenciaTenantB: ExistenciaAlmacen = {
      ...existenciaOptima,
      id: 'exis_tenant_b',
      tenant_id: TENANT_B,
    };

    // Al asignar, se deben descartar automáticamente los registros que violan el tenant
    store.setExistencias([existenciaCritica, existenciaTenantB]);

    expect(store.existencias.length).toBe(1);
    expect(store.existencias[0].tenant_id).toBe(TENANT_A);
    expect(store.existencias.find((e) => e.tenant_id === TENANT_B)).toBeUndefined();
  });

  it('debe detectar reactivamente productos en stock crítico y en reorden', () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);
    store.setExistencias([existenciaCritica, existenciaOptima]);

    // existenciaCritica tiene 5 disponibles (min=10, reorden=25) -> CRITICO
    expect(store.productosStockCritico.length).toBe(1);
    expect(store.productosStockCritico[0].producto_id).toBe('prod_sku_100');

    // existenciaOptima tiene 80 disponibles (min=15, reorden=30) -> NO está en reorden
    expect(store.productosEnReorden.length).toBe(0);
  });

  it('debe registrar movimientos en cola offline (PWA) y actualizar el stock optimistamente', () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);
    store.setExistencias([existenciaCritica]);

    expect(store.existencias[0].cantidad_disponible).toBe(5);

    // Operario en bodega sin conexión registra conteo / entrada de 10 unidades
    const movimiento = store.registrarMovimientoOffline({
      almacen_id: 'alm_central',
      producto_id: 'prod_sku_100',
      tipo_movimiento: 'ENTRADA',
      cantidad: 10,
      costo_unitario: 450.0,
      referencia_documento: 'CONTEO-CIEGO-001',
      motivo: 'Ajuste de conteo físico en bodega',
      creado_por_id: 'usr_auxiliar_bodega',
    });

    expect(movimiento.id_temporal).toMatch(/^offline_/);
    expect(movimiento.estado_sincronizacion).toBe('PENDIENTE');
    expect(store.totalMovimientosPendientes).toBe(1);

    // Verificación de actualización optimista: 5 + 10 = 15
    expect(store.existencias[0].cantidad_disponible).toBe(15);
  });

  it('debe sincronizar la cola offline cuando se restablece la conexión de red', async () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);
    store.setExistencias([existenciaCritica]);

    store.registrarMovimientoOffline({
      almacen_id: 'alm_central',
      producto_id: 'prod_sku_100',
      tipo_movimiento: 'SALIDA',
      cantidad: 2,
      costo_unitario: 450.0,
      referencia_documento: 'REM-2026-004',
      motivo: 'Despacho de picking',
      creado_por_id: 'usr_auxiliar_bodega',
    });

    const mockDespachador = vi.fn().mockResolvedValue({
      id_servidor: 'srv_kardex_9999',
      timestamp: '2026-10-28T19:00:00Z',
    });

    const resultado = await store.sincronizarColaOffline(mockDespachador);

    expect(resultado.exitosos).toBe(1);
    expect(resultado.fallidos).toBe(0);
    expect(mockDespachador).toHaveBeenCalledTimes(1);
    expect(store.colaOffline[0].estado_sincronizacion).toBe('SINCRONIZADO');
    expect(store.totalMovimientosPendientes).toBe(0);
  });

  it('debe rechazar eventos WebSockets que pertenezcan a otro tenant', () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);
    store.setExistencias([existenciaCritica]);

    const eventoWebSocketIntruso: EventoStockWebSocket = {
      tenant_id: TENANT_B, // Intento cross-tenant malicioso o paquete cruzado
      almacen_id: 'alm_central',
      producto_id: 'prod_sku_100',
      nueva_cantidad_disponible: 999,
      nuevo_costo_promedio: 10.0,
      nuevo_valor_total: 9990.0,
      tipo_movimiento: 'ENTRADA',
      timestamp: '2026-10-28T19:05:00Z',
    };

    const aplicado = store.recibirEventoStockWebSocket(eventoWebSocketIntruso);

    expect(aplicado).toBe(false);
    expect(store.existencias[0].cantidad_disponible).toBe(5); // El estado no debe mutar
  });

  it('debe aplicar eventos WebSockets legítimos del mismo tenant en tiempo real', () => {
    const store = useInventarioStore();
    store.fijarTenant(TENANT_A);
    store.setExistencias([existenciaCritica]);

    const eventoWebSocketLegitimo: EventoStockWebSocket = {
      tenant_id: TENANT_A,
      almacen_id: 'alm_central',
      producto_id: 'prod_sku_100',
      nueva_cantidad_disponible: 18,
      nuevo_costo_promedio: 450.0,
      nuevo_valor_total: 8100.0,
      tipo_movimiento: 'ENTRADA',
      timestamp: '2026-10-28T19:10:00Z',
    };

    const aplicado = store.recibirEventoStockWebSocket(eventoWebSocketLegitimo);

    expect(aplicado).toBe(true);
    expect(store.existencias[0].cantidad_disponible).toBe(18);
    expect(store.existencias[0].valor_total_inventario).toBe(8100.0);
  });
});

describe('TDD: Componentes Atómicos y Moleculares con Paleta Aurora Mist', () => {
  it('BotonAurora debe respetar el tamaño táctil accesible mínimo de 44px para mobile-first', () => {
    const wrapper = mount(BotonAurora, {
      slots: {
        default: 'Escanear Código',
      },
      props: {
        variante: 'primario',
      },
    });

    const boton = wrapper.find('button');
    expect(boton.exists()).toBe(true);
    // Garantiza cumplimiento de clase accesible mínima min-h-[44px]
    expect(boton.classes()).toContain('min-h-[44px]');
    expect(boton.classes()).toContain('min-w-[44px]');
    // Paleta Aurora Mist - Primario (#416772)
    expect(boton.classes().some((c) => c.includes('bg-[#416772]'))).toBe(true);
    expect(boton.text()).toContain('Escanear Código');
  });

  it('BotonAurora debe mostrar el spinner accesible y deshabilitarse cuando cargando=true', async () => {
    const wrapper = mount(BotonAurora, {
      props: {
        cargando: true,
      },
      slots: {
        default: 'Confirmar Conteo',
      },
    });

    const boton = wrapper.find('button');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
    expect(wrapper.find('[data-testid="spinner-carga"]').exists()).toBe(true);

    await boton.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('TarjetaIndicadorStock debe renderizar el semáforo crítico y emitir eventos', async () => {
    const wrapper = mount(TarjetaIndicadorStock, {
      props: {
        producto: productoBase,
        existencia: existenciaCritica,
        loteProximo: lotePorVencer,
        almacenNombre: 'Bodega Monterrey',
      },
    });

    expect(wrapper.text()).toContain('AC-100-FLEX');
    expect(wrapper.text()).toContain('Válvula de Presión Industrial 2"');

    // Badge de semáforo crítico
    const badge = wrapper.find('[data-testid="badge-nivel-stock"]');
    expect(badge.text()).toBe('CRITICO');

    // Cantidad disponible
    const cantidad = wrapper.find('[data-testid="cantidad-disponible"]');
    expect(cantidad.text()).toBe('5');

    // Alerta de lote próximo a vencer
    const infoLote = wrapper.find('[data-testid="info-lote-proximo"]');
    expect(infoLote.exists()).toBe(true);
    expect(infoLote.text()).toContain('LOT-2026-OCT-882');

    // Click en botón de reordenar
    const botones = wrapper.findAllComponents(BotonAurora);
    const botonReorden = botones.find((b) => b.text().includes('Reordenar'));
    expect(botonReorden?.exists()).toBe(true);

    await botonReorden!.trigger('click');
    expect(wrapper.emitted('reordenar')).toBeDefined();
    expect(wrapper.emitted('reordenar')![0]).toEqual(['prod_sku_100']);
  });
});
