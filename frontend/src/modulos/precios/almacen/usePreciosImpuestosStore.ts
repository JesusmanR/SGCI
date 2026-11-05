import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EntidadBaseTenant } from '../../../compartido/tipos/entidadBase';

export type MetodoGananciaFigma = 'markup' | 'margin';
export type TasaIvaFigma = 19 | 5 | 0;

export type PestanaEstadoSistemaFigma =
  | 'empty'
  | 'loading'
  | 'error'
  | 'expired'
  | 'disabled'
  | 'password';

export interface ReglaComercialFigma {
  tax: TasaIvaFigma;
  method: MetodoGananciaFigma;
  profit: number;
}

export interface ProductoPrecioComercial extends EntidadBaseTenant {
  sku: string;
  nombre: string;
  categoria: string;
  costo: number;
  precioSinIva: number;
  tasaIva: TasaIvaFigma;
}

export interface CambioPrecioPropuesto {
  sku: string;
  nombre: string;
  costoActual: number;
  nuevoCosto: number;
  precioActual: number;
  nuevoPrecio: number;
  variacionPrecio: number;
  margenPorcentaje: number;
  bajoCosto: boolean;
}

export interface NotificacionOperativaFigma extends EntidadBaseTenant {
  titulo: string;
  detalle: string;
  tono: 'low' | 'info' | 'ok';
  vistaDestino: string;
  leida: boolean;
}

export function redondearMoneda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularPrecioSugerido(costo: number, regla: ReglaComercialFigma): number {
  const proporcion = regla.profit / 100;
  const resultado =
    regla.method === 'margin' ? costo / (1 - proporcion) : costo * (1 + proporcion);
  return redondearMoneda(resultado);
}

/**
 * Store Pinia del Sprint 6: Impuestos y Ganancia, Lista de Precios CSV,
 * Confirmación de Venta Bajo Costo, Alertas y Estados del Sistema.
 * Réplica exacta de las Pantallas Figma 46 a 59, 68, 69 y 77.
 */
export const usePreciosImpuestosStore = defineStore('preciosImpuestos', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');

  const reglaVigente = ref<ReglaComercialFigma>({
    tax: 19,
    method: 'markup',
    profit: 35,
  });

  const productos = ref<ProductoPrecioComercial[]>([]);
  const cambiosEnRevision = ref<CambioPrecioPropuesto[] | null>(null);
  const nombreOrigenRevision = ref<string>('');
  const autorizaBajoCosto = ref<boolean>(false);
  const avisoComercial = ref<string | null>(null);
  const errorComercial = ref<string | null>(null);

  // Estados del sistema (Pantallas Figma 53 a 59)
  const pestanaEstadoActiva = ref<PestanaEstadoSistemaFigma>('empty');
  const conexionRestablecida = ref<boolean>(false);

  // Notificaciones en tiempo real (Pantallas Figma 68 y 69)
  const notificaciones = ref<NotificacionOperativaFigma[]>([]);

  const productosDelTenant = computed<ProductoPrecioComercial[]>(() =>
    productos.value.filter(
      (prod) => prod.tenant_id === tenantActivoId.value && prod.deleted_at === null,
    ),
  );

  const notificacionesDelTenant = computed<NotificacionOperativaFigma[]>(() =>
    notificaciones.value.filter(
      (n) => n.tenant_id === tenantActivoId.value && n.deleted_at === null,
    ),
  );

  const totalNotificacionesNoLeidas = computed<number>(
    () => notificacionesDelTenant.value.filter((n) => !n.leida).length,
  );

  const totalPreciosQueAumentan = computed<number>(() => {
    if (!cambiosEnRevision.value) return 0;
    return cambiosEnRevision.value.filter((c) => c.nuevoPrecio > c.precioActual).length;
  });

  const totalPreciosBajoCosto = computed<number>(() => {
    if (!cambiosEnRevision.value) return 0;
    return cambiosEnRevision.value.filter((c) => c.bajoCosto).length;
  });

  function establecerTenantActivo(tenantId: string): void {
    tenantActivoId.value = tenantId;
    cambiosEnRevision.value = null;
    autorizaBajoCosto.value = false;
    avisoComercial.value = null;
    errorComercial.value = null;
  }

  function cargarProductosIniciales(lista: ProductoPrecioComercial[]): void {
    productos.value = [...lista];
  }

  function cargarNotificacionesIniciales(lista: NotificacionOperativaFigma[]): void {
    notificaciones.value = [...lista];
  }

  /**
   * Guarda la configuración de IVA y Regla de Ganancia (Pantalla Figma 48-impuestos-guardados).
   */
  function guardarReglaComercial(nuevaRegla: ReglaComercialFigma): void {
    if (nuevaRegla.profit < 0) {
      throw new Error('El porcentaje de ganancia no puede ser negativo.');
    }
    if (nuevaRegla.method === 'margin' && nuevaRegla.profit >= 100) {
      throw new Error('En margen sobre la venta el porcentaje debe ser menor a 100%.');
    }

    reglaVigente.value = { ...nuevaRegla };
    productos.value = productos.value.map((prod) =>
      prod.tenant_id === tenantActivoId.value
        ? { ...prod, tasaIva: nuevaRegla.tax }
        : prod,
    );

    avisoComercial.value =
      'Configuración guardada. El impuesto ya se aplica en facturación. Revisa los precios sugeridos antes de publicarlos.';
    errorComercial.value = null;
  }

  /**
   * Genera la vista previa de precios sugeridos por la regla vigente (Pantalla Figma 50-precios-sugeridos).
   */
  function prepararRevisionPreciosSugeridos(): CambioPrecioPropuesto[] {
    const propuestos: CambioPrecioPropuesto[] = productosDelTenant.value.map((prod) => {
      const nuevoPrecio = calcularPrecioSugerido(prod.costo, reglaVigente.value);
      const variacionPrecio = redondearMoneda(nuevoPrecio - prod.precioSinIva);
      const margenPorcentaje = redondearMoneda(((nuevoPrecio - prod.costo) / nuevoPrecio) * 100);

      return {
        sku: prod.sku,
        nombre: prod.nombre,
        costoActual: prod.costo,
        nuevoCosto: prod.costo,
        precioActual: prod.precioSinIva,
        nuevoPrecio,
        variacionPrecio,
        margenPorcentaje,
        bajoCosto: nuevoPrecio < prod.costo,
      };
    });

    cambiosEnRevision.value = propuestos;
    nombreOrigenRevision.value = 'Precios sugeridos por la regla de ganancia';
    autorizaBajoCosto.value = false;
    errorComercial.value = null;
    return propuestos;
  }

  /**
   * Analiza un archivo CSV con columnas SKU, Costo y Precio (Pantalla Figma 51-revision-csv).
   */
  function analizarArchivoCsvPrecios(
    textoCsv: string,
    nombreArchivo = 'importacion-precios.csv',
  ): CambioPrecioPropuesto[] {
    const limpio = textoCsv.replace(/^\uFEFF/, '').trim();
    if (!limpio) {
      throw new Error('El archivo no contiene productos.');
    }

    const lineas = limpio.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lineas.length < 2) {
      throw new Error('El archivo no contiene productos.');
    }

    const separador = lineas[0].includes(';') ? ';' : ',';
    const cabeceras = lineas[0]
      .split(separador)
      .map((col) => col.trim().replace(/^"|"$/g, '').toLowerCase());

    const idxSku = cabeceras.indexOf('sku');
    const idxCosto = cabeceras.indexOf('costo');
    const idxPrecio = cabeceras.indexOf('precio');

    if (idxSku < 0 || idxCosto < 0 || idxPrecio < 0) {
      throw new Error('El archivo debe incluir las columnas SKU, Costo y Precio.');
    }

    const skusVistos = new Set<string>();
    const propuestos: CambioPrecioPropuesto[] = [];

    for (let i = 1; i < lineas.length; i++) {
      const cols = lineas[i].split(separador).map((c) => c.trim().replace(/^"|"$/g, ''));
      const sku = cols[idxSku] ?? '';
      const prod = productosDelTenant.value.find((p) => p.sku === sku);

      if (!prod) {
        throw new Error(`Fila ${i + 1}: SKU desconocido (${sku || 'vacío'}).`);
      }
      if (skusVistos.has(sku)) {
        throw new Error(`Fila ${i + 1}: el SKU ${sku} está duplicado.`);
      }
      skusVistos.add(sku);

      const nuevoCosto = Number((cols[idxCosto] ?? '').replace(',', '.'));
      const nuevoPrecio = Number((cols[idxPrecio] ?? '').replace(',', '.'));

      if (
        !Number.isFinite(nuevoCosto) ||
        !Number.isFinite(nuevoPrecio) ||
        nuevoCosto < 0 ||
        nuevoPrecio <= 0
      ) {
        throw new Error(
          `Fila ${i + 1}: costo o precio inválido. Usa valores numéricos positivos.`,
        );
      }

      const costoRedondeado = redondearMoneda(nuevoCosto);
      const precioRedondeado = redondearMoneda(nuevoPrecio);

      propuestos.push({
        sku: prod.sku,
        nombre: prod.nombre,
        costoActual: prod.costo,
        nuevoCosto: costoRedondeado,
        precioActual: prod.precioSinIva,
        nuevoPrecio: precioRedondeado,
        variacionPrecio: redondearMoneda(precioRedondeado - prod.precioSinIva),
        margenPorcentaje: redondearMoneda(
          ((precioRedondeado - costoRedondeado) / precioRedondeado) * 100,
        ),
        bajoCosto: precioRedondeado < costoRedondeado,
      });
    }

    cambiosEnRevision.value = propuestos;
    nombreOrigenRevision.value = nombreArchivo;
    autorizaBajoCosto.value = false;
    errorComercial.value = null;
    return propuestos;
  }

  /**
   * Publica los precios en revisión exigiendo confirmación explícita si algún producto
   * queda por debajo del costo (Pantallas Figma 52-precios-actualizados y 77-confirmar-bajo-costo).
   */
  function aplicarCambiosDePrecios(): void {
    if (!cambiosEnRevision.value || cambiosEnRevision.value.length === 0) {
      throw new Error('No hay cambios de precios pendientes por aplicar.');
    }

    const existeBajoCosto = cambiosEnRevision.value.some((c) => c.bajoCosto);
    if (existeBajoCosto && !autorizaBajoCosto.value) {
      errorComercial.value =
        'Confirma que autorizas precios por debajo del costo antes de aplicar.';
      throw new Error(errorComercial.value);
    }

    const mapaCambios = new Map<string, CambioPrecioPropuesto>(
      cambiosEnRevision.value.map((c) => [c.sku, c]),
    );

    productos.value = productos.value.map((prod) => {
      if (prod.tenant_id !== tenantActivoId.value) return prod;
      const cambio = mapaCambios.get(prod.sku);
      if (!cambio) return prod;
      return {
        ...prod,
        costo: cambio.nuevoCosto,
        precioSinIva: cambio.nuevoPrecio,
      };
    });

    const cantidad = cambiosEnRevision.value.length;
    cambiosEnRevision.value = null;
    autorizaBajoCosto.value = false;
    errorComercial.value = null;
    avisoComercial.value = `Lista de precios actualizada (${cantidad} productos).`;
  }

  function cancelarRevisionPrecios(): void {
    cambiosEnRevision.value = null;
    autorizaBajoCosto.value = false;
    errorComercial.value = null;
  }

  /**
   * Marca todas las notificaciones del inquilino como leídas (Pantalla Figma 69-notificaciones-leidas).
   */
  function marcarTodasNotificacionesLeidas(): void {
    notificaciones.value = notificaciones.value.map((n) =>
      n.tenant_id === tenantActivoId.value ? { ...n, leida: true } : n,
    );
  }

  function seleccionarPestanaEstado(pestana: PestanaEstadoSistemaFigma): void {
    pestanaEstadoActiva.value = pestana;
    if (pestana !== 'error') {
      conexionRestablecida.value = false;
    }
  }

  function reintentarConexionSimulada(): void {
    conexionRestablecida.value = true;
    pestanaEstadoActiva.value = 'error';
  }

  return {
    tenantActivoId,
    reglaVigente,
    productos,
    cambiosEnRevision,
    nombreOrigenRevision,
    autorizaBajoCosto,
    avisoComercial,
    errorComercial,
    pestanaEstadoActiva,
    conexionRestablecida,
    notificaciones,
    productosDelTenant,
    notificacionesDelTenant,
    totalNotificacionesNoLeidas,
    totalPreciosQueAumentan,
    totalPreciosBajoCosto,
    establecerTenantActivo,
    cargarProductosIniciales,
    cargarNotificacionesIniciales,
    guardarReglaComercial,
    prepararRevisionPreciosSugeridos,
    analizarArchivoCsvPrecios,
    aplicarCambiosDePrecios,
    cancelarRevisionPrecios,
    marcarTodasNotificacionesLeidas,
    seleccionarPestanaEstado,
    reintentarConexionSimulada,
  };
});
