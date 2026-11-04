<script setup lang="ts">
import { computed } from 'vue';
import type {
  ProductoInventario,
  ExistenciaAlmacen,
  LoteInventario,
  NivelStockSemaforo,
} from '@/compartido/tipos/entidadBase';
import BotonAurora from '@/diseno/atomos/BotonAurora.vue';

interface Props {
  producto: ProductoInventario;
  existencia: ExistenciaAlmacen;
  loteProximo?: LoteInventario | null;
  almacenNombre?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loteProximo: null,
  almacenNombre: 'Almacén Central',
});

const emit = defineEmits<{
  (e: 'reordenar', productoId: string): void;
  (e: 'verKardex', productoId: string): void;
  (e: 'escanearConteo', productoId: string): void;
}>();

// Cálculo de estado del semáforo de inventario
const nivelStock = computed<NivelStockSemaforo>(() => {
  const disponible = props.existencia.cantidad_disponible;
  const min = props.producto.stock_minimo;
  const reorden = props.producto.punto_reorden;
  const max = props.producto.stock_maximo;

  if (disponible <= min) {
    return 'CRITICO';
  }
  if (disponible <= reorden) {
    return 'REORDEN';
  }
  if (max > 0 && disponible > max) {
    return 'SOBREINVENTARIO';
  }
  return 'OPTIMO';
});

// Porcentaje de stock disponible respecto al stock máximo o reorden
const porcentajeStock = computed(() => {
  const maxReferencia = props.producto.stock_maximo || props.producto.punto_reorden * 2 || 100;
  const porcentaje = (props.existencia.cantidad_disponible / maxReferencia) * 100;
  return Math.min(Math.max(porcentaje, 0), 100);
});

// Cálculo de días restantes de caducidad del lote más próximo
const infoCaducidad = computed(() => {
  if (!props.loteProximo?.fecha_vencimiento) {
    return null;
  }

  const hoy = new Date();
  const vencimiento = new Date(props.loteProximo.fecha_vencimiento);
  const diferenciaMs = vencimiento.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  return {
    diasRestantes,
    caducado: diasRestantes < 0,
    alertaCritica: diasRestantes >= 0 && diasRestantes <= 15,
    alertaPreventiva: diasRestantes > 15 && diasRestantes <= 45,
    fechaFormateada: vencimiento.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  };
});

// Clases semánticas para el badge de stock según Paleta Aurora Mist
const clasesBadgeStock = computed(() => {
  switch (nivelStock.value) {
    case 'CRITICO':
      return 'bg-rose-100 text-rose-900 border border-rose-300 font-bold';
    case 'REORDEN':
      // #416772 con fondo claro de contraste #ABB7B3/30
      return 'bg-[#ABB7B3]/30 text-[#203959] border border-[#416772] font-semibold';
    case 'SOBREINVENTARIO':
      return 'bg-amber-100 text-amber-900 border border-amber-300 font-medium';
    case 'OPTIMO':
    default:
      // #96ADA5 sobre fondo claro
      return 'bg-[#96ADA5]/25 text-[#203959] border border-[#96ADA5] font-semibold';
  }
});

// Color de la barra de progreso
const claseBarraProgreso = computed(() => {
  switch (nivelStock.value) {
    case 'CRITICO':
      return 'bg-rose-600';
    case 'REORDEN':
      return 'bg-[#416772]'; // Aurora Primario
    case 'SOBREINVENTARIO':
      return 'bg-amber-500';
    case 'OPTIMO':
    default:
      return 'bg-[#96ADA5]'; // Aurora Acento
  }
});
</script>

<template>
  <article
    class="bg-white rounded-xl border border-[#ABB7B3]/50 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col justify-between gap-3 min-w-[280px]"
    :data-sku="producto.sku"
    :data-nivel="nivelStock"
  >
    <!-- Encabezado de la Tarjeta -->
    <header class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#203959] text-white tracking-wider"
          >
            {{ producto.sku }}
          </span>
          <span class="text-xs text-[#839492] truncate">
            {{ almacenNombre }} &bull; {{ existencia.ubicacion_pasillo }}-{{ existencia.ubicacion_estante }}-{{ existencia.ubicacion_nivel }}
          </span>
        </div>
        <h3
          class="font-semibold text-base text-[#203959] truncate hover:text-[#416772] cursor-pointer"
          :title="producto.nombre"
          @click="emit('verKardex', producto.id)"
        >
          {{ producto.nombre }}
        </h3>
      </div>

      <!-- Badge de Estado Semántico -->
      <span
        class="shrink-0 text-xs px-2.5 py-1 rounded-full uppercase tracking-wider"
        :class="clasesBadgeStock"
        data-testid="badge-nivel-stock"
      >
        {{ nivelStock }}
      </span>
    </header>

    <!-- Indicador Numérico y Barra de Progreso -->
    <div class="space-y-1.5 py-1">
      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-2xl font-bold font-mono text-[#203959]" data-testid="cantidad-disponible">
            {{ existencia.cantidad_disponible }}
          </span>
          <span class="text-xs text-[#839492] ml-1 uppercase">
            {{ producto.unidad_medida }}
          </span>
        </div>
        <div class="text-right text-xs text-[#839492] font-mono">
          <span>Reorden: <strong class="text-[#203959]">{{ producto.punto_reorden }}</strong></span>
          <span class="mx-1">&bull;</span>
          <span>Mín: <strong class="text-[#203959]">{{ producto.stock_minimo }}</strong></span>
        </div>
      </div>

      <!-- Barra de Nivel de Inventario -->
      <div
        class="w-full bg-[#ABB7B3]/30 rounded-full h-2 overflow-hidden"
        role="progressbar"
        :aria-valuenow="existencia.cantidad_disponible"
        :aria-valuemin="0"
        :aria-valuemax="producto.stock_maximo || producto.punto_reorden * 2"
      >
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="claseBarraProgreso"
          :style="{ width: `${porcentajeStock}%` }"
        />
      </div>
    </div>

    <!-- Información de Lote más Próximo a Vencer -->
    <div
      v-if="loteProximo"
      class="text-xs p-2 rounded-lg bg-[#ABB7B3]/15 border border-[#ABB7B3]/40 flex items-center justify-between"
      data-testid="info-lote-proximo"
    >
      <div class="truncate">
        <span class="text-[#839492]">Lote:</span>
        <span class="font-mono font-medium text-[#203959] ml-1">{{ loteProximo.numero_lote }}</span>
      </div>
      <div v-if="infoCaducidad" class="shrink-0 font-medium ml-2">
        <span
          v-if="infoCaducidad.caducado"
          class="text-rose-700 font-bold"
        >
          ¡Vencido! ({{ infoCaducidad.fechaFormateada }})
        </span>
        <span
          v-else-if="infoCaducidad.alertaCritica"
          class="text-amber-800 font-semibold"
        >
          Vence en {{ infoCaducidad.diasRestantes }}d ({{ infoCaducidad.fechaFormateada }})
        </span>
        <span
          v-else
          class="text-[#416772]"
        >
          Vence: {{ infoCaducidad.fechaFormateada }}
        </span>
      </div>
    </div>

    <!-- Acciones Táctiles Mobile-First (Mínimo 44px de área de pulsación) -->
    <footer class="flex items-center gap-2 pt-1 border-t border-[#ABB7B3]/30">
      <BotonAurora
        variante="primario"
        tamano="sm"
        class="flex-1"
        @click="emit('verKardex', producto.id)"
      >
        Ver Kardex
      </BotonAurora>

      <BotonAurora
        v-if="nivelStock === 'CRITICO' || nivelStock === 'REORDEN'"
        variante="secundario"
        tamano="sm"
        @click="emit('reordenar', producto.id)"
      >
        Reordenar
      </BotonAurora>

      <BotonAurora
        variante="profundo"
        tamano="sm"
        etiqueta-aria="Escanear conteo físico de este producto"
        @click="emit('escanearConteo', producto.id)"
      >
        Conteo
      </BotonAurora>
    </footer>
  </article>
</template>
