<script setup lang="ts">
/**
 * Organismo: PanelRecepcionOrdenCompra.vue
 * Pantalla operativa M-03 / Escritorio para Cotejo y Recepción de Orden de Compra en Muelle.
 * Integra la lista de `RenglonRecepcionMuelle`, resumen de discrepancias y confirmación hacia el Kardex.
 */
import { computed, ref } from 'vue';
import RenglonRecepcionMuelle, { type RenglonRecepcionItem } from '../moleculas/RenglonRecepcionMuelle.vue';

interface Props {
  numeroOrden: string;
  nombreProveedor: string;
  nombreAlmacenDestino: string;
  renglones: RenglonRecepcionItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'confirmar-recepcion-kardex', payload: { referenciaRemision: string }): void;
  (e: 'actualizar-cantidad-conforme', payload: { productId: string; cantidad: number }): void;
  (e: 'actualizar-cantidad-averiada', payload: { productId: string; cantidad: number }): void;
  (e: 'actualizar-lote', payload: { productId: string; numeroLote: string; fechaVencimiento: string }): void;
}>();

const referenciaRemision = ref('');

const metricasMuelle = computed(() => {
  const totalSolicitado = props.renglones.reduce((acc, r) => acc + r.cantidad_solicitada, 0);
  const totalConforme = props.renglones.reduce((acc, r) => acc + r.cantidad_recibida_conforme, 0);
  const totalAveriado = props.renglones.reduce((acc, r) => acc + r.cantidad_averiada_rechazada, 0);
  const tieneDiscrepancia =
    totalAveriado > 0 ||
    props.renglones.some(
      (r) => r.cantidad_recibida_previa + r.cantidad_recibida_conforme < r.cantidad_solicitada,
    );

  return {
    totalSolicitado,
    totalConforme,
    totalAveriado,
    tieneDiscrepancia,
  };
});
</script>

<template>
  <section
    class="rounded-xl border border-[#839492]/40 bg-[#F4F7F6] p-4 shadow-sm"
    aria-label="Panel de Recepción de Orden de Compra en Muelle"
  >
    <!-- Cabecera de la Orden de Compra -->
    <header class="rounded-xl bg-[#203959] p-4 text-[#ABB7B3]">
      <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <span class="font-mono text-xs font-bold uppercase tracking-wider text-[#96ADA5]">
            Recepción Física en Muelle · {{ props.nombreAlmacenDestino }}
          </span>
          <h2 class="mt-0.5 text-lg font-bold text-white">
            {{ props.numeroOrden }} · {{ props.nombreProveedor }}
          </h2>
        </div>

        <div class="rounded-lg bg-[#416772] px-3 py-2 text-right font-mono text-xs text-white tabular-nums">
          <span class="block font-bold">
            Recibidos: {{ metricasMuelle.totalConforme }} / {{ metricasMuelle.totalSolicitado }} Uds
          </span>
          <span v-if="metricasMuelle.totalAveriado > 0" class="text-[#F7EEE0]">
            Rechazados por avería: {{ metricasMuelle.totalAveriado }} Uds
          </span>
        </div>
      </div>

      <!-- Folio de Factura / Remisión del Proveedor -->
      <div class="mt-3">
        <label for="input-remision-proveedor" class="block text-xs font-semibold text-[#ABB7B3]">
          Folio de Factura o Guía de Remisión del Proveedor *
        </label>
        <input
          id="input-remision-proveedor"
          v-model="referenciaRemision"
          type="text"
          placeholder="Ej: FAC-PROV-9981 o REM-2026-441"
          class="mt-1 min-h-[44px] w-full rounded-lg border border-[#96ADA5] bg-white px-3.5 font-mono text-base font-semibold text-[#203959] focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
          data-testid="input-remision-proveedor"
        />
      </div>
    </header>

    <!-- Lista de Renglones de la Orden -->
    <div class="mt-4 space-y-3">
      <RenglonRecepcionMuelle
        v-for="item in props.renglones"
        :key="item.product_id"
        :renglon="item"
        @actualizar-cantidad-conforme="emit('actualizar-cantidad-conforme', $event)"
        @actualizar-cantidad-averiada="emit('actualizar-cantidad-averiada', $event)"
        @actualizar-lote="emit('actualizar-lote', $event)"
      />
    </div>

    <!-- Banner de Acta de Discrepancia si aplica -->
    <div
      v-if="metricasMuelle.tieneDiscrepancia"
      role="status"
      class="mt-4 rounded-lg border border-[#8A5214]/40 bg-[#F7EEE0] p-3 text-xs font-medium text-[#8A5214]"
      data-testid="alerta-discrepancia-muelle"
    >
      ▲ Se detectó entrega parcial o unidades averiadas. Al confirmar, el sistema ingresará al Kardex
      únicamente las unidades conformes ({{ metricasMuelle.totalConforme }}) y generará automáticamente el
      <strong>Acta de Discrepancia en Muelle</strong>.
    </div>

    <!-- Botón de Confirmación -->
    <footer class="mt-4">
      <button
        type="button"
        class="min-h-[48px] w-full rounded-xl bg-[#416772] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#203959] disabled:opacity-50"
        :disabled="!referenciaRemision.trim() || metricasMuelle.totalConforme <= 0"
        data-testid="btn-confirmar-recepcion-muelle"
        @click="emit('confirmar-recepcion-kardex', { referenciaRemision: referenciaRemision.trim() })"
      >
        {{
          metricasMuelle.tieneDiscrepancia
            ? 'Confirmar Recepción Parcial y Emitir Acta de Discrepancia'
            : 'Confirmar Recepción Completa e Ingresar al Kardex'
        }}
      </button>
    </footer>
  </section>
</template>
