/**
 * Store Pinia: useCatalogoStore
 * Módulo 3: Catálogo de Productos, Categorías, Unidades de Medida y Escaneo EAN-13 / QR.
 * Garantiza aislamiento estricto por `tenant_id` y evaluación de Puntos de Reorden (ROP).
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  EntidadBaseTenant,
  NivelStockSemaforo,
  ProductoInventario,
} from '../../../compartido/tipos/entidadBase';

export interface CategoriaCatalogo extends EntidadBaseTenant {
  parent_id: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface ResultadoEscanerCatalogo {
  tipo: 'QR_SGCI' | 'EAN_13' | 'SKU_CODE128';
  skuDetectado: string | null;
  loteDetectado: string | null;
  productoEncontrado: ProductoInventario | null;
}

/**
 * Valida la suma de verificación GS1 Módulo 10 para códigos EAN-13.
 */
export function validarChecksumEan13(codigo: string): boolean {
  const limpio = codigo.trim();
  if (!/^\d{13}$/.test(limpio)) {
    return false;
  }

  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = Number(limpio[i]);
    const peso = i % 2 === 0 ? 1 : 3;
    suma += digito * peso;
  }

  const residuo = suma % 10;
  const digitoEsperado = residuo === 0 ? 0 : 10 - residuo;
  return digitoEsperado === Number(limpio[12]);
}

export const useCatalogoStore = defineStore('catalogo', () => {
  const tenantActivoId = ref<string>('');
  const productos = ref<ProductoInventario[]>([]);
  const categorias = ref<CategoriaCatalogo[]>([]);
  const terminoBusqueda = ref<string>('');
  const categoriaFiltroId = ref<string>('TODAS');

  function configurarContextoTenant(nuevoTenantId: string): void {
    if (!nuevoTenantId || nuevoTenantId.trim() === '') {
      throw new Error('El tenant_id es obligatorio para inicializar el Catálogo.');
    }
    if (tenantActivoId.value !== '' && tenantActivoId.value !== nuevoTenantId) {
      productos.value = [];
      categorias.value = [];
    }
    tenantActivoId.value = nuevoTenantId;
  }

  function registrarProductoEnCatalogo(nuevoProducto: ProductoInventario): void {
    if (!tenantActivoId.value) {
      throw new Error('Operación denegada: No existe un contexto tenant_id activo.');
    }
    if (nuevoProducto.tenant_id !== tenantActivoId.value) {
      throw new Error(
        `Violación Cross-Tenant en Catálogo: El producto pertenece a [${nuevoProducto.tenant_id}] pero el Tenant activo es [${tenantActivoId.value}].`,
      );
    }

    if (
      nuevoProducto.stock_minimo < 0 ||
      nuevoProducto.punto_reorden < nuevoProducto.stock_minimo ||
      (nuevoProducto.stock_maximo > 0 && nuevoProducto.stock_maximo < nuevoProducto.punto_reorden)
    ) {
      throw new Error(
        'Invariante de stock inválido: Se requiere 0 <= stock_minimo <= punto_reorden <= stock_maximo.',
      );
    }

    if (/^\d{13}$/.test(nuevoProducto.codigo_barras) && !validarChecksumEan13(nuevoProducto.codigo_barras)) {
      throw new Error(`El código EAN-13 [${nuevoProducto.codigo_barras}] posee un dígito verificador inválido.`);
    }

    const skuNorm = nuevoProducto.sku.trim().toUpperCase();
    const duplicado = productos.value.some(
      (p) => p.tenant_id === tenantActivoId.value && p.sku.toUpperCase() === skuNorm && p.id !== nuevoProducto.id,
    );

    if (duplicado) {
      throw new Error(`El código SKU [${skuNorm}] ya existe dentro del catálogo del Tenant activo.`);
    }

    productos.value.push({
      ...nuevoProducto,
      sku: skuNorm,
    });
  }

  const productosDelTenantFiltrados = computed<ProductoInventario[]>(() => {
    const termino = terminoBusqueda.value.trim().toUpperCase();

    return productos.value.filter((p) => {
      if (p.tenant_id !== tenantActivoId.value || p.deleted_at !== null) {
        return false;
      }

      if (categoriaFiltroId.value !== 'TODAS' && p.categoria_id !== categoriaFiltroId.value) {
        return false;
      }

      if (termino === '') {
        return true;
      }

      return (
        p.sku.toUpperCase().includes(termino) ||
        p.codigo_barras.toUpperCase().includes(termino) ||
        p.nombre.toUpperCase().includes(termino)
      );
    });
  });

  function evaluarSemaforoProducto(producto: ProductoInventario, stockActual: number): NivelStockSemaforo {
    if (stockActual <= producto.stock_minimo) {
      return 'CRITICO';
    }
    if (stockActual <= producto.punto_reorden) {
      return 'REORDEN';
    }
    if (producto.stock_maximo > 0 && stockActual > producto.stock_maximo) {
      return 'SOBREINVENTARIO';
    }
    return 'OPTIMO';
  }

  function resolverLecturaEscaner(lecturaCruda: string): ResultadoEscanerCatalogo {
    const limpia = lecturaCruda.trim();
    if (!limpia) {
      throw new Error('La lectura del escáner no puede estar vacía.');
    }

    // 1. Formato QR estructurado SGCI: SGCI|T:11111111|SKU:AC-100-FLEX|LOTE:LOTE-2026-089
    if (limpia.startsWith('SGCI|')) {
      const segmentos = limpia.split('|');
      let sku: string | null = null;
      let lote: string | null = null;

      for (const seg of segmentos) {
        if (seg.startsWith('SKU:')) sku = seg.replace('SKU:', '').trim().toUpperCase();
        if (seg.startsWith('LOTE:')) {
          const valLote = seg.replace('LOTE:', '').trim().toUpperCase();
          lote = valLote !== 'SIN-LOTE' ? valLote : null;
        }
      }

      const encontrado =
        productos.value.find(
          (p) => p.tenant_id === tenantActivoId.value && p.sku.toUpperCase() === sku,
        ) ?? null;

      return {
        tipo: 'QR_SGCI',
        skuDetectado: sku,
        loteDetectado: lote,
        productoEncontrado: encontrado,
      };
    }

    // 2. Formato numérico EAN-13
    if (/^\d{13}$/.test(limpia)) {
      if (!validarChecksumEan13(limpia)) {
        throw new Error(`El código EAN-13 [${limpia}] tiene un dígito de control inválido.`);
      }

      const encontrado =
        productos.value.find(
          (p) => p.tenant_id === tenantActivoId.value && p.codigo_barras === limpia,
        ) ?? null;

      return {
        tipo: 'EAN_13',
        skuDetectado: encontrado?.sku ?? null,
        loteDetectado: null,
        productoEncontrado: encontrado,
      };
    }

    // 3. Búsqueda directa por SKU / Code-128
    const skuBuscado = limpia.toUpperCase();
    const encontrado =
      productos.value.find(
        (p) => p.tenant_id === tenantActivoId.value && p.sku.toUpperCase() === skuBuscado,
      ) ?? null;

    return {
      tipo: 'SKU_CODE128',
      skuDetectado: skuBuscado,
      loteDetectado: null,
      productoEncontrado: encontrado,
    };
  }

  return {
    tenantActivoId,
    productos,
    categorias,
    terminoBusqueda,
    categoriaFiltroId,
    productosDelTenantFiltrados,
    configurarContextoTenant,
    registrarProductoEnCatalogo,
    evaluarSemaforoProducto,
    resolverLecturaEscaner,
  };
});
