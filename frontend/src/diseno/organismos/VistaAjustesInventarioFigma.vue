<script setup lang="ts">
import { ref } from 'vue';
import ModalAjusteExistenciasFigma from '../moleculas/ModalAjusteExistenciasFigma.vue';
import {
  useAuditoriaConteosStore,
  type MotivoAjusteFigma,
} from '../../modulos/conteos/almacen/useAuditoriaConteosStore';

interface Props {
  operadorActualId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  operadorActualId: '99999999-9999-4999-8999-999999999999',
});

const store = useAuditoriaConteosStore();
const modalAbierto = ref<boolean>(false);
const productoPreseleccionadoId = ref<string>('');

function abrirModalAjuste(productoId?: string): void {
  productoPreseleccionadoId.value = productoId ?? (store.productosDelTenant[0]?.id ?? '');
  modalAbierto.value = true;
}

function cerrarModalAjuste(): void {
  modalAbierto.value = false;
}

function procesarAjusteConfirmado(payload: {
  productoId: string;
  cantidadRealContada: number;
  motivo: MotivoAjusteFigma;
  observaciones: string;
}): void {
  store.registrarAjusteExistencias({
    tenantId: store.tenantActivoId,
    almacenId: store.almacenActivoId,
    productoId: payload.productoId,
    cantidadRealContada: payload.cantidadRealContada,
    motivo: payload.motivo,
    observaciones: payload.observaciones,
    operadorId: props.operadorActualId,
  });
  modalAbierto.value = false;
}
</script>

<template>
  <section class="space-y-6" data-testid="vista-ajustes-inventario-figma">
    <!-- Cabecera idéntica a Pantalla Figma 42-historial-inventario -->
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Trazabilidad
        </span>
        <h1 class="mt-1 text-2xl font-bold text-[#203959]">Ajustes de inventario</h1>
        <p class="mt-1 text-sm text-slate-600">
          Alinea tus existencias con la realidad. Sin perder el motivo.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          data-testid="btn-nuevo-ajuste-figma"
          class="min-h-[44px] rounded-lg bg-[#203959] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#416772]"
          @click="abrirModalAjuste()"
        >
          Nuevo ajuste
        </button>
      </div>
    </header>

    <!-- Banner de confirmación (Pantalla Figma 45-ajuste-confirmado) -->
    <div
      v-if="store.avisoConfirmacionReciente"
      data-testid="banner-ajuste-confirmado-figma"
      class="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
      role="status"
    >
      <span>{{ store.avisoConfirmacionReciente }}</span>
      <button
        type="button"
        class="text-xs font-semibold text-emerald-800 underline"
        @click="store.limpiarAvisoConfirmacion()"
      >
        Ocultar
      </button>
    </div>

    <!-- 3 Tarjetas KPI (Pantalla Figma 42-historial-inventario) -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span class="text-xs font-medium text-slate-500">Unidades disponibles</span>
        <strong
          data-testid="kpi-unidades-disponibles"
          class="mt-1 block text-2xl font-bold text-[#203959]"
        >
          {{ store.totalUnidadesDisponibles }}
        </strong>
        <small class="mt-1 block text-xs text-slate-500">
          Existencias actuales · Bodega principal
        </small>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span class="text-xs font-medium text-slate-500">Movimientos registrados</span>
        <strong
          data-testid="kpi-movimientos-registrados"
          class="mt-1 block text-2xl font-bold text-[#203959]"
        >
          {{ store.totalMovimientosRegistrados }}
        </strong>
        <small class="mt-1 block text-xs text-slate-500">
          Ajustes, recepciones y ventas de esta sesión
        </small>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <span class="text-xs font-medium text-slate-500">Productos con stock bajo</span>
        <strong
          data-testid="kpi-productos-stock-bajo"
          class="mt-1 block text-2xl font-bold text-[#203959]"
        >
          {{ store.totalProductosStockBajo }}
        </strong>
        <small class="mt-1 block text-xs text-slate-500">
          Por debajo del mínimo configurado
        </small>
      </article>
    </div>

    <!-- Tabla de Movimientos o Estado Vacío (Pantalla Figma 78-inventario-sin-movimientos) -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
            Movimientos
          </span>
          <h2 class="text-lg font-bold text-[#203959]">Historial reciente</h2>
        </div>
        <span class="text-xs font-medium text-slate-500">
          {{ store.movimientosDelTenant.length }} registros
        </span>
      </div>

      <div
        v-if="store.movimientosDelTenant.length === 0"
        data-testid="estado-vacio-sin-movimientos-figma"
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center"
      >
        <h3 class="text-base font-bold text-[#203959]">Tu inventario, con historia</h3>
        <p class="mt-1 max-w-md text-sm text-slate-600">
          Aún no hay ajustes en esta sesión. Registra un conteo físico, una merma o una corrección.
        </p>
        <button
          type="button"
          data-testid="btn-registrar-primer-ajuste"
          class="mt-4 min-h-[44px] rounded-lg bg-[#203959] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#416772]"
          @click="abrirModalAjuste()"
        >
          Registrar primer ajuste
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table
          class="w-full border-collapse text-left text-sm"
          data-testid="tabla-historial-ajustes-figma"
        >
          <thead>
            <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <th class="py-3 pr-4">Tipo</th>
              <th class="py-3 pr-4">Producto</th>
              <th class="py-3 pr-4">Bodega</th>
              <th class="py-3 pr-4 text-right">Cantidad</th>
              <th class="py-3 pr-4">Referencia</th>
              <th class="py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="mov in store.movimientosDelTenant" :key="mov.id">
              <td class="py-3 pr-4">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="
                    mov.variacion > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  "
                >
                  Ajuste
                </span>
              </td>
              <td class="py-3 pr-4">
                <strong class="block font-semibold text-slate-900">
                  {{ mov.productoNombre }}
                </strong>
                <small class="text-xs text-slate-500">{{ mov.sku }}</small>
              </td>
              <td class="py-3 pr-4 text-slate-600">{{ mov.bodegaNombre }}</td>
              <td
                class="py-3 pr-4 text-right font-bold"
                :class="mov.variacion > 0 ? 'text-emerald-700' : 'text-red-700'"
              >
                {{ mov.variacion > 0 ? `+${mov.variacion}` : mov.variacion }} uds.
              </td>
              <td class="py-3 pr-4 text-slate-700">{{ mov.referencia }}</td>
              <td class="py-3 text-slate-600">{{ mov.observaciones }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Ajuste de Existencias (Pantallas Figma 43 y 44) -->
    <ModalAjusteExistenciasFigma
      :abierto="modalAbierto"
      :productos="store.productosDelTenant"
      :producto-inicial-id="productoPreseleccionadoId"
      @cerrar="cerrarModalAjuste"
      @confirmar-ajuste="procesarAjusteConfirmado"
    />
  </section>
</template>
