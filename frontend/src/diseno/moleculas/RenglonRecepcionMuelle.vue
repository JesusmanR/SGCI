<script setup lang="ts">
/**
 * Molécula: RenglonRecepcionMuelle.vue
 * Tarjeta táctil de pasillo/muelle (PWA Mobile-First 390px, controles >= 44px)
 * para verificar físicamente un renglón de Orden de Compra:
 * - Captura de cantidad conforme con botones + / -
 * - Captura de averías/rechazos en muelle
 * - Captura de lote y fecha de vencimiento
 */
import { computed } from 'vue';

export interface RenglonRecepcionItem {
  product_id: string;
  sku: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad_solicitada: number;
  cantidad_recibida_previa: number;
  cantidad_recibida_conforme: number;
  cantidad_averiada_rechazada: number;
  precio_unitario_pactado: number;
  numero_lote: string;
  fecha_vencimiento_iso: string;
}

interface Props {
  renglon: RenglonRecepcionItem;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'actualizar-cantidad-conforme', payload: { productId: string; cantidad: number }): void;
  (e: 'actualizar-cantidad-averiada', payload: { productId: string; cantidad: number }): void;
  (e: 'actualizar-lote', payload: { productId: string; numeroLote: string; fechaVencimiento: string }): void;
}>();

const pendienteMaximo = computed(() =>
  Math.max(0, Number((props.renglon.cantidad_solicitada - props.renglon.cantidad_recibida_previa).toFixed(4))),
);

const porcentajeCumplimiento = computed(() => {
  if (props.renglon.cantidad_solicitada <= 0) return 0;
  const totalConEstaEntrega = props.renglon.cantidad_recibida_previa + props.renglon.cantidad_recibida_conforme;
  return Math.min(100, Math.round((totalConEstaEntrega / props.renglon.cantidad_solicitada) * 100));
});

function ajustarConforme(delta: number): void {
  const nuevo = Math.max(
    0,
    Math.min(pendienteMaximo.value, Number((props.renglon.cantidad_recibida_conforme + delta).toFixed(4))),
  );
  emit('actualizar-cantidad-conforme', {
    productId: props.renglon.product_id,
    cantidad: nuevo,
  });
}
</script>

<template>
  <article
    class="rounded-xl border border-[#839492]/40 bg-white p-4 shadow-sm"
    :data-testid="`renglon-muelle-${props.renglon.sku}`"
  >
    <!-- Cabecera del SKU -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span class="rounded bg-[#203959] px-2 py-0.5 font-mono text-xs font-bold text-[#ABB7B3]">
          {{ props.renglon.sku }}
        </span>
        <h3 class="mt-1 text-sm font-bold text-[#203959]">
          {{ props.renglon.nombre_producto }}
        </h3>
      </div>

      <div class="text-right font-mono text-xs tabular-nums text-[#416772]">
        <span class="block font-semibold text-[#203959]">
          Pendiente: {{ pendienteMaximo }} {{ props.renglon.unidad_medida }}
        </span>
        <span>Solicitado: {{ props.renglon.cantidad_solicitada }} {{ props.renglon.unidad_medida }}</span>
      </div>
    </div>

    <!-- Barra de progreso de recepción -->
    <div class="mt-3">
      <div class="mb-1 flex justify-between font-mono text-[11px] tabular-nums text-[#203959]">
        <span>Progreso de Recepción Física</span>
        <span>{{ porcentajeCumplimiento }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-[#ABB7B3]/50">
        <div
          class="h-full rounded-full transition-all"
          :class="porcentajeCumplimiento === 100 ? 'bg-[#15624A]' : 'bg-[#416772]'"
          :style="{ width: `${porcentajeCumplimiento}%` }"
        />
      </div>
    </div>

    <!-- Controles táctiles (>= 44px) de Cantidad Conforme y Averías -->
    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <!-- Cantidad Conforme -->
      <div class="rounded-lg bg-[#F4F7F6] p-2.5">
        <label class="block text-xs font-semibold text-[#203959]">
          Cantidad Recibida Conforme ({{ props.renglon.unidad_medida }})
        </label>
        <div class="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] rounded-lg border border-[#839492] bg-white font-mono text-lg font-bold text-[#203959] hover:bg-[#96ADA5]/30"
            aria-label="Disminuir cantidad recibida"
            @click="ajustarConforme(-1)"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            :max="pendienteMaximo"
            :value="props.renglon.cantidad_recibida_conforme"
            class="min-h-[44px] w-full rounded-lg border border-[#839492] bg-white px-3 text-center font-mono text-base font-bold tabular-nums text-[#203959]"
            @input="
              emit('actualizar-cantidad-conforme', {
                productId: props.renglon.product_id,
                cantidad: Number(($event.target as HTMLInputElement).value),
              })
            "
          />
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] rounded-lg bg-[#416772] font-mono text-lg font-bold text-white hover:bg-[#203959]"
            aria-label="Incrementar cantidad recibida"
            @click="ajustarConforme(1)"
          >
            +
          </button>
        </div>
      </div>

      <!-- Cantidad Averiada / Rechazada en Muelle -->
      <div class="rounded-lg bg-[#F6E8E7]/50 p-2.5">
        <label class="block text-xs font-semibold text-[#9C2F28]">
          Unidades Averiadas / Rechazadas en Muelle
        </label>
        <input
          type="number"
          min="0"
          :value="props.renglon.cantidad_averiada_rechazada"
          class="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#9C2F28]/40 bg-white px-3 font-mono text-base font-semibold tabular-nums text-[#9C2F28]"
          @input="
            emit('actualizar-cantidad-averiada', {
              productId: props.renglon.product_id,
              cantidad: Number(($event.target as HTMLInputElement).value),
            })
          "
        />
      </div>
    </div>

    <!-- Captura de Lote y Fecha de Vencimiento en el acto -->
    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="block text-xs font-semibold text-[#203959]">Número de Lote Fabricante</label>
        <input
          type="text"
          :value="props.renglon.numero_lote"
          placeholder="Ej: LOTE-2026-089"
          class="mt-1 min-h-[44px] w-full rounded-lg border border-[#839492] bg-white px-3 font-mono text-sm uppercase text-[#203959]"
          @input="
            emit('actualizar-lote', {
              productId: props.renglon.product_id,
              numeroLote: ($event.target as HTMLInputElement).value,
              fechaVencimiento: props.renglon.fecha_vencimiento_iso,
            })
          "
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-[#203959]">Fecha de Vencimiento</label>
        <input
          type="date"
          :value="props.renglon.fecha_vencimiento_iso"
          class="mt-1 min-h-[44px] w-full rounded-lg border border-[#839492] bg-white px-3 font-mono text-sm text-[#203959]"
          @input="
            emit('actualizar-lote', {
              productId: props.renglon.product_id,
              numeroLote: props.renglon.numero_lote,
              fechaVencimiento: ($event.target as HTMLInputElement).value,
            })
          "
        />
      </div>
    </div>
  </article>
</template>
