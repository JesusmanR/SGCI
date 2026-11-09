import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSesionMultiTenantStore } from '../useSesionMultiTenantStore';
import { useComprasStore } from '../../modulos/compras/almacen/useComprasStore';
import { evaluarSemaforoCaducidadLote, type LoteExtendidaSGCI } from '../../modulos/lotes/almacen/useLotesStore';
import { useAuditoriaConteosStore, type ProductoInventarioAjustable } from '../../modulos/conteos/almacen/useAuditoriaConteosStore';
import { calcularPrecioSugerido } from '../../modulos/precios/almacen/usePreciosImpuestosStore';
import { useFacturacionCajaStore, type ProductoFacturable } from '../../modulos/caja/almacen/useFacturacionCajaStore';
import { useAnaliticaInventarioStore } from '../../modulos/analitica/almacen/useAnaliticaInventarioStore';
import { useGobernanzaSaasStore } from '../../modulos/gobernanza/almacen/useGobernanzaSaasStore';
import { useSincronizacionOfflineStore } from '../../modulos/offline/almacen/useSincronizacionOfflineStore';

describe('MVP v1.12.0 — Flujo Integral UAT Frontend (Pruebas de Aceptación de Usuario End-to-End)', () => {
  const TENANT_ALFA = '11111111-1111-4111-8111-111111111111';
  const ALMACEN_CENTRAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const USUARIO_JEFE = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('valida el flujo integral UAT de Cadena de Suministro: Multi-Tenant, Abastecimiento OC, Recepción en Muelle, Kardex, Lotes FEFO y Conteo Ciego', () => {
    // 1. Contexto Multi-Tenant y Gobernanza en Sesión
    const sesionStore = useSesionMultiTenantStore();
    expect(sesionStore.empresaActiva.id).toBe(TENANT_ALFA);
    expect(sesionStore.empresaActiva.nombre).toBe('Industrias Alfa S.A.S.');
    expect(sesionStore.rolActivo).toBe('admin');

    // 2. Abastecimiento y Emisión de Orden de Compra
    const comprasStore = useComprasStore();
    comprasStore.configurarContextoTenant(TENANT_ALFA);

    const orden = comprasStore.emitirOrdenCompra({
      id: 'oc-uat-001',
      tenant_id: TENANT_ALFA,
      numero_orden: 'OC-2026-UAT-001',
      supplier_id: 'prov-tech-01',
      proveedor_nombre: 'TechSource Industrial S.A.',
      warehouse_id: ALMACEN_CENTRAL,
      renglones: [
        {
          product_id: 'prod-valvula-01',
          sku: 'VALV-IND-200',
          nombre_producto: 'Válvula de Presión Industrial 2"',
          cantidad_solicitada: 50,
          precio_unitario: 120,
        },
      ],
      tasa_iva_porcentaje: 19,
      usuario_id: USUARIO_JEFE,
    });

    expect(orden.subtotal).toBe(6000);
    expect(orden.impuestos).toBe(1140);
    expect(orden.total).toBe(7140);

    // 3. Recepción Conforme en Muelle con Asiento en Kardex
    const recepcion = comprasStore.procesarRecepcionEnMuelle({
      orden_id: 'oc-uat-001',
      referencia_remision: 'REM-TECH-8891',
      usuario_receptor_id: USUARIO_JEFE,
      renglones_recibidos: [
        {
          product_id: 'prod-valvula-01',
          sku: 'VALV-IND-200',
          cantidad_conforme: 50,
          cantidad_averiada: 0,
          lote_id: 'LOTE-UAT-2026-A',
        },
      ],
    });

    expect(recepcion.nuevo_estado).toBe('RECIBIDA_COMPLETA');
    expect(recepcion.tiene_discrepancias).toBe(false);
    expect(recepcion.movimientos_kardex).toHaveLength(1);
    expect(recepcion.movimientos_kardex[0].tipo_movimiento).toBe('ENTRADA_COMPRA');
    expect(recepcion.movimientos_kardex[0].cantidad).toBe(50);

    // 4. Control de Trazabilidad y Caducidad de Lotes (FEFO)
    const loteRecibido: LoteExtendidaSGCI = {
      id: 'lote-uat-01',
      tenant_id: TENANT_ALFA,
      producto_id: 'prod-valvula-01',
      numero_lote: 'LOTE-UAT-2026-A',
      fecha_fabricacion: '2026-01-01',
      fecha_vencimiento: '2027-12-31',
      cantidad_inicial: 50,
      cantidad_actual: 50,
      costo_unitario_entrada: 120,
      estado: 'DISPONIBLE',
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      deleted_at: null,
      created_by: USUARIO_JEFE,
      updated_by: null,
    };

    const semaforoLote = evaluarSemaforoCaducidadLote(loteRecibido, '2026-11-09');
    expect(semaforoLote).toBe('VIGENTE');

    // 5. Auditoría Física y Conteo Ciego con Ajuste de Inventario
    const conteosStore = useAuditoriaConteosStore();
    conteosStore.establecerContextoTenant(TENANT_ALFA, ALMACEN_CENTRAL);

    const productoAuditable: ProductoInventarioAjustable = {
      id: 'prod-valvula-01',
      tenant_id: TENANT_ALFA,
      sku: 'VALV-IND-200',
      nombre: 'Válvula de Presión Industrial 2"',
      almacenId: ALMACEN_CENTRAL,
      bodegaNombre: 'Bodega Central Monterrey',
      stockActual: 50,
      stockMinimo: 15,
      costoUnitarioBase: 120,
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      deleted_at: null,
      created_by: USUARIO_JEFE,
      updated_by: USUARIO_JEFE,
    };

    conteosStore.cargarProductosIniciales([productoAuditable]);
    expect(conteosStore.productosDelTenant).toHaveLength(1);

    // Conteo ciego reporta 48 unidades (merma de 2 unidades por daño en estiba)
    const ajuste = conteosStore.registrarAjusteExistencias({
      tenantId: TENANT_ALFA,
      almacenId: ALMACEN_CENTRAL,
      productoId: 'prod-valvula-01',
      cantidadRealContada: 48,
      motivo: 'Producto dañado / merma',
      observaciones: 'Avería localizada en embalaje de estante 04 nivel 02',
      operadorId: USUARIO_JEFE,
    });

    expect(ajuste.variacion).toBe(-2);
    expect(conteosStore.productosDelTenant[0].stockActual).toBe(48);
  });

  it('valida el flujo integral UAT Comercial, Analítica Patrimonial Pareto ABC y Resiliencia PWA Offline con Background Sync', () => {
    // 1. Configuración de Precios, Recargo sobre Costo (Markup) e Impuestos
    const precioSugeridoMarkup = calcularPrecioSugerido(100, { tax: 19, method: 'markup', profit: 40 });
    expect(precioSugeridoMarkup).toBe(140);

    const precioSugeridoMargin = calcularPrecioSugerido(100, { tax: 19, method: 'margin', profit: 20 });
    expect(precioSugeridoMargin).toBe(125);

    // 2. Facturación POS y Cobro en Caja con Arqueo
    const cajaStore = useFacturacionCajaStore();
    cajaStore.establecerTenantActivo(TENANT_ALFA);

    const productoFacturable: ProductoFacturable = {
      id: 'prod-pos-01',
      tenant_id: TENANT_ALFA,
      sku: 'PRD-POS-01',
      nombre: 'Kit Terminal Escáner Industrial',
      precioSinIva: 140,
      tasaIva: 19,
      stockActual: 20,
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T10:00:00Z',
      deleted_at: null,
      created_by: USUARIO_JEFE,
      updated_by: USUARIO_JEFE,
    };

    cajaStore.cargarProductosFacturables([productoFacturable]);
    cajaStore.agregarLineaFactura('PRD-POS-01', 2);

    expect(cajaStore.subtotalBorrador).toBe(280);
    expect(cajaStore.impuestosValorBorrador).toBe(53.2);
    expect(cajaStore.totalBorrador).toBe(333.2);

    cajaStore.enviarFacturaACaja('FAC-UAT-2026-001');
    const { comprobante, cambioDevolver } = cajaStore.confirmarCobroFactura({
      metodoPago: 'Efectivo',
      efectivoRecibido: 350,
    });

    expect(comprobante.importe).toBe(333.2);
    expect(cambioDevolver).toBe(16.8);
    expect(cajaStore.productosDelTenant[0].stockActual).toBe(18);

    // 3. Analítica Patrimonial Consolidada y Pareto ABC Multi-Almacén
    const analiticaStore = useAnaliticaInventarioStore();
    analiticaStore.tenantActivoId = TENANT_ALFA;

    expect(analiticaStore.valorPatrimonialConsolidado).toBe(2441470);
    expect(analiticaStore.partidasClasificadasAbc[0].claseAbc).toBe('A');
    expect(analiticaStore.partidasClasificadasAbc[1].claseAbc).toBe('A');
    expect(analiticaStore.partidasClasificadasAbc[2].claseAbc).toBe('B');

    // Conmutación dinámica a UEPS y CPP
    analiticaStore.cambiarEstrategiaValoracion('UEPS');
    expect(analiticaStore.valorPatrimonialConsolidado).toBe(2418920);

    analiticaStore.cambiarEstrategiaValoracion('CPP');
    expect(analiticaStore.valorPatrimonialConsolidado).toBe(2430195);

    // 4. Gobernanza SaaS y Verificación de Límites
    const gobernanzaStore = useGobernanzaSaasStore();
    gobernanzaStore.establecerContexto(TENANT_ALFA);
    expect(gobernanzaStore.planActual).toBe('Crece');
    expect(gobernanzaStore.detallePlanActual.maxUsuarios).toBe(5);

    // 5. PWA Resiliencia Offline-First y Reconciliación con Background Sync
    const offlineStore = useSincronizacionOfflineStore();
    offlineStore.establecerContextoTenant(TENANT_ALFA);

    // Simulación de corte de conexión en bodega profunda
    offlineStore.cambiarEstadoRed(false);
    expect(offlineStore.enLinea).toBe(false);

    offlineStore.encolarOperacionOffline({
      idempotencyKey: 'idemp-uat-001',
      tenantId: TENANT_ALFA,
      tipoOperacion: 'CONTEO_FISICO_CIEGO',
      sku: 'VALV-IND-200',
      deltaCantidad: -2,
      updatedAtCliente: '2026-11-09T10:15:00.000Z',
    });

    offlineStore.encolarOperacionOffline({
      idempotencyKey: 'idemp-uat-002',
      tenantId: TENANT_ALFA,
      tipoOperacion: 'COBRO_POS_OFFLINE',
      sku: 'PRD-POS-01',
      deltaCantidad: -1,
      updatedAtCliente: '2026-11-09T10:16:00.000Z',
    });

    expect(offlineStore.operacionesPendientesDelTenant).toHaveLength(2);

    // Reconexión y reconciliación sin pérdidas
    const resultadoSync = offlineStore.drenarColaAlReconectar({
      'VALV-IND-200': { stockActual: 48, updatedAtServidor: '2026-11-09T10:00:00.000Z' },
      'PRD-POS-01': { stockActual: 18, updatedAtServidor: '2026-11-09T10:00:00.000Z' },
    });

    expect(resultadoSync.aplicadas).toBe(2);
    expect(resultadoSync.conflictos).toBe(0);
    expect(offlineStore.operacionesPendientesDelTenant).toHaveLength(0);
  });
});
