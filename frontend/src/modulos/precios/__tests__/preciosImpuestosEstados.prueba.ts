import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  calcularPrecioSugerido,
  usePreciosImpuestosStore,
  type NotificacionOperativaFigma,
  type ProductoPrecioComercial,
} from '../almacen/usePreciosImpuestosStore';

describe('Sprint 6 — Impuestos, Reglas de Ganancia, CSV de Precios, Alertas y Estados del Sistema (Pantallas Figma 46-59, 68-69 y 77)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';
  const USUARIO_ID = '99999999-9999-4999-8999-999999999999';

  const productosSemilla: ProductoPrecioComercial[] = [
    {
      id: 'prod-1',
      tenant_id: TENANT_A,
      sku: 'SKU-101',
      nombre: 'Teclado Mecánico Pro',
      categoria: 'Periféricos',
      costo: 54,
      precioSinIva: 89,
      tasaIva: 19,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: USUARIO_ID,
      updated_by: USUARIO_ID,
    },
    {
      id: 'prod-2',
      tenant_id: TENANT_A,
      sku: 'SKU-102',
      nombre: 'Monitor IPS 27"',
      categoria: 'Pantallas',
      costo: 165,
      precioSinIva: 249,
      tasaIva: 19,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: USUARIO_ID,
      updated_by: USUARIO_ID,
    },
  ];

  const notificacionesSemilla: NotificacionOperativaFigma[] = [
    {
      id: 'notif-1',
      tenant_id: TENANT_A,
      titulo: 'Stock bajo en Monitor IPS 27"',
      detalle: 'Quedan 5 uds. en Bodega principal (mínimo 8).',
      tono: 'low',
      vistaDestino: 'orders',
      leida: false,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: USUARIO_ID,
      updated_by: USUARIO_ID,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('calcula precio sugerido con Recargo sobre el costo (markup) y Margen sobre la venta (margin) (Pantallas Figma 46-48)', () => {
    expect(calcularPrecioSugerido(100, { tax: 19, method: 'markup', profit: 35 })).toBe(135);
    expect(calcularPrecioSugerido(100, { tax: 19, method: 'margin', profit: 25 })).toBe(133.33);

    const store = usePreciosImpuestosStore();
    store.establecerTenantActivo(TENANT_A);
    store.cargarProductosIniciales(productosSemilla);

    store.guardarReglaComercial({ tax: 5, method: 'margin', profit: 25 });
    expect(store.avisoComercial).toContain(
      'Configuración guardada. El impuesto ya se aplica en facturación.',
    );
    expect(store.productosDelTenant[0].tasaIva).toBe(5);
  });

  it('analiza CSV de precios y exige confirmación explícita cuando algún precio es menor al costo (Pantallas Figma 51, 52 y 77)', () => {
    const store = usePreciosImpuestosStore();
    store.establecerTenantActivo(TENANT_A);
    store.cargarProductosIniciales(productosSemilla);

    const csv = 'SKU,Costo,Precio\nSKU-101,56,95\nSKU-102,170,150';
    const propuestos = store.analizarArchivoCsvPrecios(csv, 'precios-noviembre.csv');

    expect(propuestos).toHaveLength(2);
    expect(store.totalPreciosQueAumentan).toBe(1);
    expect(store.totalPreciosBajoCosto).toBe(1);

    // Sin marcar autorizaBajoCosto debe lanzar excepción (Pantalla Figma 77)
    expect(() => store.aplicarCambiosDePrecios()).toThrow(
      /Confirma que autorizas precios por debajo del costo/i,
    );

    // Marcando autorizaBajoCosto publica los cambios (Pantalla Figma 52)
    store.autorizaBajoCosto = true;
    store.aplicarCambiosDePrecios();

    expect(store.avisoComercial).toBe('Lista de precios actualizada (2 productos).');
    expect(store.productosDelTenant.find((p) => p.sku === 'SKU-102')?.precioSinIva).toBe(150);
  });

  it('gestiona las notificaciones operativas y los estados del sistema (Pantallas Figma 53-59 y 68-69)', () => {
    const store = usePreciosImpuestosStore();
    store.establecerTenantActivo(TENANT_A);
    store.cargarNotificacionesIniciales(notificacionesSemilla);

    expect(store.totalNotificacionesNoLeidas).toBe(1);
    store.marcarTodasNotificacionesLeidas();
    expect(store.totalNotificacionesNoLeidas).toBe(0);

    store.seleccionarPestanaEstado('error');
    expect(store.conexionRestablecida).toBe(false);
    store.reintentarConexionSimulada();
    expect(store.conexionRestablecida).toBe(true);
  });
});
