import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EntidadBaseTenant } from '../../../compartido/tipos/entidadBase';
import { redondearMoneda } from '../../precios/almacen/usePreciosImpuestosStore';

export type MedioPagoFigma = 'Efectivo' | 'Tarjeta' | 'Transferencia';

export interface ProductoFacturable extends EntidadBaseTenant {
  sku: string;
  nombre: string;
  precioSinIva: number;
  tasaIva: number;
  stockActual: number;
}

export interface LineaFacturaFigma {
  sku: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  tasaIva: number;
}

export interface FacturaEnCajaFigma {
  referencia: string;
  cliente: string;
  descuentoPorcentaje: number;
  subtotal: number;
  descuentoValor: number;
  impuestosValor: number;
  total: number;
  lineas: LineaFacturaFigma[];
}

export interface ComprobanteCobroFigma extends EntidadBaseTenant {
  comprobanteId: string;
  referenciaFactura: string;
  metodoPago: MedioPagoFigma;
  importe: number;
  referenciaTransaccion: string;
}

export interface ReporteArqueoCierreFigma {
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  ventasTotales: number;
  observaciones: string;
}

/**
 * Store Pinia del Sprint 7: Facturación POS, Cobros en Caja, Descuento en Kardex y Arqueo/Cierre.
 * Réplica exacta de las Pantallas Figma 21 a 35, 75 y 76.
 */
export const useFacturacionCajaStore = defineStore('facturacionCaja', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');
  const cajaAbierta = ref<boolean>(true);
  const baseInicialEfectivo = ref<number>(100);

  const productos = ref<ProductoFacturable[]>([]);
  const lineasBorrador = ref<LineaFacturaFigma[]>([]);
  const clienteFactura = ref<string>('Cliente mostrador');
  const descuentoPorcentaje = ref<number>(0);

  const facturaPendienteEnCaja = ref<FacturaEnCajaFigma | null>(null);
  const cobrosConfirmados = ref<ComprobanteCobroFigma[]>([]);
  const reporteUltimoCierre = ref<ReporteArqueoCierreFigma | null>(null);
  const avisoCaja = ref<string | null>(null);

  const productosDelTenant = computed<ProductoFacturable[]>(() =>
    productos.value.filter(
      (prod) => prod.tenant_id === tenantActivoId.value && prod.deleted_at === null,
    ),
  );

  const cobrosDelTenant = computed<ComprobanteCobroFigma[]>(() =>
    cobrosConfirmados.value.filter(
      (c) => c.tenant_id === tenantActivoId.value && c.deleted_at === null,
    ),
  );

  const subtotalBorrador = computed<number>(() =>
    redondearMoneda(
      lineasBorrador.value.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0),
    ),
  );

  const descuentoValorBorrador = computed<number>(() =>
    redondearMoneda((subtotalBorrador.value * descuentoPorcentaje.value) / 100),
  );

  const baseImponibleBorrador = computed<number>(() =>
    redondearMoneda(subtotalBorrador.value - descuentoValorBorrador.value),
  );

  const impuestosValorBorrador = computed<number>(() => {
    const factorDescuento = 1 - descuentoPorcentaje.value / 100;
    return redondearMoneda(
      lineasBorrador.value.reduce(
        (acc, l) =>
          acc + l.cantidad * l.precioUnitario * factorDescuento * (l.tasaIva / 100),
        0,
      ),
    );
  });

  const totalBorrador = computed<number>(() =>
    redondearMoneda(baseImponibleBorrador.value + impuestosValorBorrador.value),
  );

  const ventasTotalesSesion = computed<number>(() =>
    redondearMoneda(cobrosDelTenant.value.reduce((acc, c) => acc + c.importe, 0)),
  );

  const ventasEfectivoSesion = computed<number>(() =>
    redondearMoneda(
      cobrosDelTenant.value
        .filter((c) => c.metodoPago === 'Efectivo')
        .reduce((acc, c) => acc + c.importe, 0),
    ),
  );

  const ventasTarjetaYTransferenciaSesion = computed<number>(() =>
    redondearMoneda(ventasTotalesSesion.value - ventasEfectivoSesion.value),
  );

  const efectivoEsperadoEnCaja = computed<number>(() =>
    redondearMoneda(baseInicialEfectivo.value + ventasEfectivoSesion.value),
  );

  function establecerTenantActivo(tenantId: string): void {
    tenantActivoId.value = tenantId;
    lineasBorrador.value = [];
    facturaPendienteEnCaja.value = null;
    avisoCaja.value = null;
  }

  function cargarProductosFacturables(lista: ProductoFacturable[]): void {
    productos.value = [...lista];
  }

  function agregarLineaFactura(sku: string, cantidad = 1): void {
    const prod = productosDelTenant.value.find((p) => p.sku === sku);
    if (!prod) {
      throw new Error(`El SKU ${sku} no existe en el catálogo del inquilino activo.`);
    }
    if (cantidad <= 0 || cantidad > prod.stockActual) {
      throw new Error('Stock insuficiente para agregar la cantidad solicitada.');
    }

    const existente = lineasBorrador.value.find((l) => l.sku === sku);
    if (existente) {
      if (existente.cantidad + cantidad > prod.stockActual) {
        throw new Error('Stock insuficiente. Revisa las cantidades en la factura.');
      }
      existente.cantidad += cantidad;
      return;
    }

    lineasBorrador.value.push({
      sku: prod.sku,
      nombre: prod.nombre,
      cantidad,
      precioUnitario: prod.precioSinIva,
      tasaIva: prod.tasaIva,
    });
  }

  function vaciarFacturaBorrador(): void {
    lineasBorrador.value = [];
    descuentoPorcentaje.value = 0;
  }

  /**
   * Envía la factura en preparación hacia el Punto de Cobro (Pantalla Figma 24-factura-enviada-caja).
   */
  function enviarFacturaACaja(referencia = 'FAC-1042'): FacturaEnCajaFigma {
    if (lineasBorrador.value.length === 0) {
      throw new Error('Agrega al menos un producto antes de enviar la factura a caja.');
    }

    const factura: FacturaEnCajaFigma = {
      referencia,
      cliente: clienteFactura.value,
      descuentoPorcentaje: descuentoPorcentaje.value,
      subtotal: subtotalBorrador.value,
      descuentoValor: descuentoValorBorrador.value,
      impuestosValor: impuestosValorBorrador.value,
      total: totalBorrador.value,
      lineas: lineasBorrador.value.map((l) => ({ ...l })),
    };

    facturaPendienteEnCaja.value = factura;
    avisoCaja.value = `Factura ${referencia} enviada a caja por $${factura.total.toFixed(2)}.`;
    return factura;
  }

  /**
   * Registra el cobro de la factura pendiente y descuenta existencias (Pantallas Figma 26 a 29).
   */
  function confirmarCobroFactura(opciones: {
    metodoPago: MedioPagoFigma;
    efectivoRecibido?: number;
    referenciaTransaccion?: string;
    usuarioId?: string;
  }): { comprobante: ComprobanteCobroFigma; cambioDevolver: number } {
    if (!cajaAbierta.value) {
      throw new Error('Abre la caja antes de cobrar.');
    }
    if (!facturaPendienteEnCaja.value) {
      throw new Error('No hay ninguna factura pendiente de cobro en caja.');
    }

    const factura = facturaPendienteEnCaja.value;

    // Verificar disponibilidad de stock antes de descontar
    for (const linea of factura.lineas) {
      const prod = productosDelTenant.value.find((p) => p.sku === linea.sku);
      if (!prod || linea.cantidad > prod.stockActual) {
        throw new Error('Stock insuficiente. Revisa las cantidades en la factura.');
      }
    }

    let cambioDevolver = 0;
    const refTransaccion = (opciones.referenciaTransaccion ?? '').trim();

    if (opciones.metodoPago === 'Efectivo') {
      const recibido = Number(opciones.efectivoRecibido ?? 0);
      if (recibido < factura.total) {
        throw new Error('El efectivo recibido no cubre el total.');
      }
      cambioDevolver = redondearMoneda(recibido - factura.total);
    } else if (!refTransaccion) {
      throw new Error('Ingresa la referencia del pago.');
    }

    // Descontar stock de cada producto
    for (const linea of factura.lineas) {
      const prod = productosDelTenant.value.find((p) => p.sku === linea.sku)!;
      prod.stockActual -= linea.cantidad;
    }

    const ahoraIso = new Date().toISOString();
    const usuarioId = opciones.usuarioId ?? '99999999-9999-4999-8999-999999999999';
    const comprobante: ComprobanteCobroFigma = {
      id: crypto.randomUUID(),
      tenant_id: tenantActivoId.value,
      comprobanteId: `CB-${1049 + cobrosConfirmados.value.length}`,
      referenciaFactura: factura.referencia,
      metodoPago: opciones.metodoPago,
      importe: factura.total,
      referenciaTransaccion: refTransaccion || factura.referencia,
      created_at: ahoraIso,
      updated_at: ahoraIso,
      deleted_at: null,
      created_by: usuarioId,
      updated_by: usuarioId,
    };

    cobrosConfirmados.value = [comprobante, ...cobrosConfirmados.value];
    facturaPendienteEnCaja.value = null;
    lineasBorrador.value = [];
    avisoCaja.value = 'Cobro confirmado. Se actualizó el stock y el resumen de caja.';

    return { comprobante, cambioDevolver };
  }

  /**
   * Cierra la sesión de caja validando arqueo físico (Pantallas Figma 31 a 34).
   */
  function cerrarSesionCaja(
    efectivoFisicoContado: number,
    observaciones = '',
  ): ReporteArqueoCierreFigma {
    if (!Number.isFinite(efectivoFisicoContado) || efectivoFisicoContado < 0) {
      throw new Error('Ingresa un monto de efectivo contado válido.');
    }

    const diferencia = redondearMoneda(efectivoFisicoContado - efectivoEsperadoEnCaja.value);
    const notaLimpia = observaciones.trim();

    if (diferencia !== 0 && notaLimpia.length === 0) {
      throw new Error('Indica el motivo de la diferencia para cerrar la caja.');
    }

    const reporte: ReporteArqueoCierreFigma = {
      efectivoEsperado: efectivoEsperadoEnCaja.value,
      efectivoContado: redondearMoneda(efectivoFisicoContado),
      diferencia,
      ventasTotales: ventasTotalesSesion.value,
      observaciones: notaLimpia || 'Sin diferencias',
    };

    reporteUltimoCierre.value = reporte;
    cajaAbierta.value = false;
    avisoCaja.value =
      'Caja cerrada. El arqueo y la diferencia quedaron registrados en esta sesión.';

    return reporte;
  }

  /**
   * Abre una nueva sesión de caja con base inicial (Pantalla Figma 35-apertura-caja).
   */
  function abrirNuevaSesionCaja(nuevaBaseEfectivo: number): void {
    if (!Number.isFinite(nuevaBaseEfectivo) || nuevaBaseEfectivo < 0) {
      throw new Error('La base inicial de efectivo no puede ser negativa.');
    }
    baseInicialEfectivo.value = redondearMoneda(nuevaBaseEfectivo);
    cobrosConfirmados.value = [];
    reporteUltimoCierre.value = null;
    cajaAbierta.value = true;
    avisoCaja.value = 'Nueva sesión de caja abierta.';
  }

  return {
    tenantActivoId,
    cajaAbierta,
    baseInicialEfectivo,
    productos,
    lineasBorrador,
    clienteFactura,
    descuentoPorcentaje,
    facturaPendienteEnCaja,
    cobrosConfirmados,
    reporteUltimoCierre,
    avisoCaja,
    productosDelTenant,
    cobrosDelTenant,
    subtotalBorrador,
    descuentoValorBorrador,
    impuestosValorBorrador,
    totalBorrador,
    ventasTotalesSesion,
    ventasEfectivoSesion,
    ventasTarjetaYTransferenciaSesion,
    efectivoEsperadoEnCaja,
    establecerTenantActivo,
    cargarProductosFacturables,
    agregarLineaFactura,
    vaciarFacturaBorrador,
    enviarFacturaACaja,
    confirmarCobroFactura,
    cerrarSesionCaja,
    abrirNuevaSesionCaja,
  };
});
