<script setup lang="ts">
import { ref, computed } from 'vue';
import type {
  MovimientoKardex,
  TipoMovimientoKardex,
  MetodoValoracion,
} from '@/compartido/tipos/entidadBase';
import BotonAurora from '@/diseno/atomos/BotonAurora.vue';

interface Props {
  movimientos: MovimientoKardex[];
  cargando?: boolean;
  metodoValoracion?: MetodoValoracion;
  nombreAlmacen?: string;
  skuProducto?: string;
}

const props = withDefaults(defineProps<Props>(), {
  cargando: false,
  metodoValoracion: 'PEPS',
  nombreAlmacen: 'Almacén Central Bodega A',
  skuProducto: '',
});

const emit = defineEmits<{
  (e: 'seleccionarMovimiento', movimiento: MovimientoKardex): void;
  (e: 'exportarKardex'): void;
}>();

// Filtros reactivos
const filtroTipo = ref<string>('TODOS');
const terminoBusqueda = ref<string>('');

// Filtrado de movimientos
const movimientosFiltrados = computed(() => {
  return props.movimientos.filter((m) => {
    const coincideTipo =
      filtroTipo.value === 'TODOS' || m.tipo_movimiento === filtroTipo.value;
    const busqueda = terminoBusqueda.value.trim().toLowerCase();
    const coincideBusqueda =
      !busqueda ||
      m.referencia_documento.toLowerCase().includes(busqueda) ||
      m.motivo.toLowerCase().includes(busqueda) ||
      (m.numero_lote && m.numero_lote.toLowerCase().includes(busqueda)) ||
      (m.operador_nombre && m.operador_nombre.toLowerCase().includes(busqueda));

    return coincideTipo && coincideBusqueda;
  });
});

function esEntrada(tipo: TipoMovimientoKardex): boolean {
  return (
    tipo === 'ENTRADA' ||
    tipo === 'ENTRADA_COMPRA' ||
    tipo === 'ENTRADA_TRANSFERENCIA' ||
    tipo === 'AJUSTE_POSITIVO' ||
    tipo === 'PRODUCCION_ENTRADA' ||
    tipo === 'DEVOLUCION_CLIENTE'
  );
}

// Totales acumulados del período visible
const resumenKardex = computed(() => {
  let totalEntradasCant = 0;
  let totalSalidasCant = 0;

  props.movimientos.forEach((m) => {
    if (esEntrada(m.tipo_movimiento)) {
      totalEntradasCant += m.cantidad;
    } else {
      totalSalidasCant += m.cantidad;
    }
  });

  const ultimoMovimiento = props.movimientos[props.movimientos.length - 1];
  const saldoFinalCant = ultimoMovimiento ? ultimoMovimiento.saldo_cantidad : 0;
  const saldoFinalValorizado = ultimoMovimiento ? ultimoMovimiento.saldo_costo_total : 0;
  const costoPromedioPonderado = ultimoMovimiento ? ultimoMovimiento.saldo_costo_unitario : 0;

  return {
    totalEntradasCant,
    totalSalidasCant,
    saldoFinalCant,
    saldoFinalValorizado,
    costoPromedioPonderado,
  };
});

// Ayudantes de formato
function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(isoStr: string): string {
  try {
    const fecha = new Date(isoStr);
    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function colorBadgeTipo(tipo: TipoMovimientoKardex): string {
  switch (tipo) {
    case 'ENTRADA':
    case 'ENTRADA_COMPRA':
    case 'AJUSTE_POSITIVO':
    case 'TRANSFERENCIA_ENTRADA':
    case 'PRODUCCION_ENTRADA':
    case 'DEVOLUCION_CLIENTE':
      // Aurora Acento (#96ADA5) suave para ingresos
      return 'bg-[#96ADA5]/25 text-[#203959] border border-[#96ADA5]';
    case 'SALIDA':
    case 'SALIDA_VENTA':
    case 'SALIDA_DESPACHO':
    case 'AJUSTE_NEGATIVO':
    case 'TRANSFERENCIA_SALIDA':
    case 'MERMA_DANO':
    case 'MERMA_DESECHO':
    case 'DEVOLUCION_PROVEEDOR':
      // Rosa/Rojo suave para salidas
      return 'bg-rose-100 text-rose-800 border border-rose-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
</script>

<template>
  <section class="bg-white rounded-xl border border-[#ABB7B3]/40 shadow-sm overflow-hidden flex flex-col">
    <!-- Encabezado de la Tabla Kardex -->
    <header class="p-4 bg-[#203959] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold tracking-tight text-white">
            Libro Mayor Kardex
          </h2>
          <span class="text-xs px-2 py-0.5 rounded bg-[#416772] text-white font-mono font-semibold">
            Método: {{ metodoValoracion }}
          </span>
        </div>
        <p class="text-xs text-[#ABB7B3] mt-0.5">
          {{ nombreAlmacen }} <span v-if="skuProducto">&bull; SKU: {{ skuProducto }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <BotonAurora
          variante="secundario"
          tamano="sm"
          @click="emit('exportarKardex')"
        >
          Exportar Kardex
        </BotonAurora>
      </div>
    </header>

    <!-- Barra de Filtros y Búsqueda Rápida Mobile-First -->
    <div class="p-3 bg-[#ABB7B3]/10 border-b border-[#ABB7B3]/30 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <span class="text-xs font-semibold text-[#203959] shrink-0">Filtrar:</span>
        <button
          v-for="opcion in ['TODOS', 'ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA_ENTRADA']"
          :key="opcion"
          type="button"
          class="text-xs px-2.5 py-1.5 rounded-md min-h-[36px] font-medium transition-colors shrink-0"
          :class="
            filtroTipo === opcion
              ? 'bg-[#416772] text-white'
              : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/30 border border-[#ABB7B3]/50'
          "
          @click="filtroTipo = opcion"
        >
          {{ opcion.replace('_', ' ') }}
        </button>
      </div>

      <div class="w-full sm:w-64 shrink-0">
        <input
          v-model="terminoBusqueda"
          type="text"
          placeholder="Buscar doc, lote, motivo..."
          class="w-full text-xs px-3 py-2 rounded-lg border border-[#839492] focus:outline-none focus:ring-2 focus:ring-[#416772] min-h-[44px]"
        />
      </div>
    </div>

    <!-- 1. VISTA MÓVIL (BODEGA ≤ 640px) - Tarjetas Táctiles Densas -->
    <div class="block sm:hidden divide-y divide-[#ABB7B3]/30 p-2">
      <div v-if="cargando" class="text-center py-8 text-[#839492] text-sm">
        Cargando movimientos de Kardex...
      </div>

      <div
        v-else-if="movimientosFiltrados.length === 0"
        class="text-center py-8 text-[#839492] text-sm"
      >
        No hay movimientos registrados con los filtros seleccionados.
      </div>

      <article
        v-for="mov in movimientosFiltrados"
        :key="mov.id"
        class="p-3 hover:bg-[#ABB7B3]/10 transition-colors rounded-lg mb-2 border border-[#ABB7B3]/40 bg-white"
        @click="emit('seleccionarMovimiento', mov)"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded" :class="colorBadgeTipo(mov.tipo_movimiento)">
              {{ mov.tipo_movimiento }}
            </span>
            <span class="text-xs font-mono text-[#839492] ml-2">
              {{ formatearFecha(mov.fecha_movimiento) }}
            </span>
          </div>
          <span class="text-xs font-bold text-[#203959] font-mono">
            Doc: {{ mov.referencia_documento }}
          </span>
        </div>

        <p class="text-xs text-[#203959] font-medium mb-2">
          {{ mov.motivo }} <span v-if="mov.numero_lote" class="text-[#839492]">&bull; Lote: {{ mov.numero_lote }}</span>
        </p>

        <!-- Bloque de Unidades y Saldos en Móvil -->
        <div class="grid grid-cols-2 gap-2 text-xs bg-[#ABB7B3]/15 p-2 rounded-md font-mono">
          <div>
            <span class="text-[#839492] block">
              {{ esEntrada(mov.tipo_movimiento) ? 'Entrada (+)' : 'Salida (-)' }}
            </span>
            <span
              class="font-bold text-sm"
              :class="esEntrada(mov.tipo_movimiento) ? 'text-[#416772]' : 'text-rose-700'"
            >
              {{ esEntrada(mov.tipo_movimiento) ? '+' : '-' }}{{ mov.cantidad }} u.
            </span>
            <span class="text-[10px] text-[#839492] block">
              C/U: {{ formatearMoneda(mov.costo_unitario) }}
            </span>
          </div>

          <div class="text-right border-l border-[#ABB7B3]/40 pl-2">
            <span class="text-[#839492] block">Saldo Restante</span>
            <span class="font-bold text-sm text-[#203959]">
              {{ mov.saldo_cantidad }} u.
            </span>
            <span class="text-[10px] text-[#416772] font-semibold block">
              Val: {{ formatearMoneda(mov.saldo_costo_total) }}
            </span>
          </div>
        </div>

        <div v-if="mov.operador_nombre" class="mt-2 text-[11px] text-[#839492] flex justify-between">
          <span>Operador: {{ mov.operador_nombre }}</span>
          <span class="text-[#416772] font-semibold">Tocar para detalle &rarr;</span>
        </div>
      </article>
    </div>

    <!-- 2. VISTA ESCRITORIO (≥ 640px) - Tabla Tabular Detallada Formal -->
    <div class="hidden sm:block overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <!-- Fila de Macro-Categorías Kardex -->
          <tr class="bg-[#203959] text-[#ABB7B3] uppercase text-[10px] tracking-wider border-b border-[#416772]">
            <th colspan="3" class="px-3 py-2 text-left">Datos del Movimiento</th>
            <th colspan="3" class="px-3 py-2 text-center bg-[#416772]/30">Entradas</th>
            <th colspan="3" class="px-3 py-2 text-center bg-[#416772]/20">Salidas</th>
            <th colspan="3" class="px-3 py-2 text-center bg-[#416772]/40">Existencias (Saldos)</th>
            <th class="px-3 py-2 text-right">Auditoría</th>
          </tr>
          <!-- Fila de Columnas Específicas -->
          <tr class="bg-[#203959]/90 text-white font-medium border-b border-[#ABB7B3]/30">
            <th class="px-3 py-2">Fecha / Hora</th>
            <th class="px-3 py-2">Documento / Ref</th>
            <th class="px-3 py-2">Tipo / Lote</th>
            
            <!-- Entradas -->
            <th class="px-2 py-2 text-right">Cant</th>
            <th class="px-2 py-2 text-right">Costo Unit</th>
            <th class="px-2 py-2 text-right">Total</th>
            
            <!-- Salidas -->
            <th class="px-2 py-2 text-right">Cant</th>
            <th class="px-2 py-2 text-right">Costo Unit</th>
            <th class="px-2 py-2 text-right">Total</th>
            
            <!-- Saldos -->
            <th class="px-2 py-2 text-right font-bold text-[#ABB7B3]">Cant</th>
            <th class="px-2 py-2 text-right">C/U Prom</th>
            <th class="px-2 py-2 text-right font-bold text-white">Saldo Val</th>
            
            <th class="px-3 py-2 text-right">Operador</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#ABB7B3]/30 font-mono">
          <tr v-if="cargando">
            <td colspan="13" class="text-center py-8 text-[#839492] font-sans">
              Cargando movimientos de Kardex...
            </td>
          </tr>
          <tr v-else-if="movimientosFiltrados.length === 0">
            <td colspan="13" class="text-center py-8 text-[#839492] font-sans">
              No existen movimientos en el rango de búsqueda.
            </td>
          </tr>
          <tr
            v-for="mov in movimientosFiltrados"
            :key="mov.id"
            class="hover:bg-[#ABB7B3]/15 transition-colors cursor-pointer"
            @click="emit('seleccionarMovimiento', mov)"
          >
            <!-- Datos Generales -->
            <td class="px-3 py-2 text-[#203959] whitespace-nowrap">
              {{ formatearFecha(mov.fecha_movimiento) }}
            </td>
            <td class="px-3 py-2 font-bold text-[#203959]">
              {{ mov.referencia_documento }}
            </td>
            <td class="px-3 py-2">
              <span class="text-[10px] px-2 py-0.5 rounded font-sans font-semibold" :class="colorBadgeTipo(mov.tipo_movimiento)">
                {{ mov.tipo_movimiento }}
              </span>
              <div v-if="mov.numero_lote" class="text-[10px] text-[#839492]">
                Lote: {{ mov.numero_lote }}
              </div>
            </td>

            <!-- Entradas -->
            <td class="px-2 py-2 text-right text-[#416772] font-semibold">
              {{ esEntrada(mov.tipo_movimiento) ? mov.cantidad : '-' }}
            </td>
            <td class="px-2 py-2 text-right text-[#839492]">
              {{ esEntrada(mov.tipo_movimiento) ? formatearMoneda(mov.costo_unitario) : '-' }}
            </td>
            <td class="px-2 py-2 text-right text-[#416772]">
              {{ esEntrada(mov.tipo_movimiento) ? formatearMoneda(mov.costo_total) : '-' }}
            </td>

            <!-- Salidas -->
            <td class="px-2 py-2 text-right text-rose-700 font-semibold">
              {{ !esEntrada(mov.tipo_movimiento) ? mov.cantidad : '-' }}
            </td>
            <td class="px-2 py-2 text-right text-[#839492]">
              {{ !esEntrada(mov.tipo_movimiento) ? formatearMoneda(mov.costo_unitario) : '-' }}
            </td>
            <td class="px-2 py-2 text-right text-rose-700">
              {{ !esEntrada(mov.tipo_movimiento) ? formatearMoneda(mov.costo_total) : '-' }}
            </td>

            <!-- Saldos -->
            <td class="px-2 py-2 text-right font-bold text-[#203959] bg-[#ABB7B3]/10">
              {{ mov.saldo_cantidad }}
            </td>
            <td class="px-2 py-2 text-right text-[#203959] bg-[#ABB7B3]/10">
              {{ formatearMoneda(mov.saldo_costo_unitario) }}
            </td>
            <td class="px-2 py-2 text-right font-bold text-[#416772] bg-[#ABB7B3]/20">
              {{ formatearMoneda(mov.saldo_costo_total) }}
            </td>

            <!-- Operador -->
            <td class="px-3 py-2 text-right text-[11px] text-[#839492] font-sans">
              {{ mov.operador_nombre || 'Sistema' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pie Resumen Valorizado (Totales Acumulados) -->
    <footer class="p-3 bg-[#203959] text-white border-t border-[#416772] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-4 text-[#ABB7B3]">
        <span>Entradas visibles: <strong class="text-white">{{ resumenKardex.totalEntradasCant }} u.</strong></span>
        <span>Salidas visibles: <strong class="text-white">{{ resumenKardex.totalSalidasCant }} u.</strong></span>
      </div>

      <div class="flex items-center gap-3 font-mono">
        <span class="text-[#ABB7B3]">Saldo Final:</span>
        <span class="text-base font-bold text-[#96ADA5]">{{ resumenKardex.saldoFinalCant }} unidades</span>
        <span class="text-[#ABB7B3]">&bull;</span>
        <span class="text-base font-bold text-white">{{ formatearMoneda(resumenKardex.saldoFinalValorizado) }}</span>
      </div>
    </footer>
  </section>
</template>
