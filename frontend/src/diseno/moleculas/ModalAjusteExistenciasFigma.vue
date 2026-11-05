<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  MOTIVOS_AJUSTE_FIGMA,
  type MotivoAjusteFigma,
  type ProductoInventarioAjustable,
} from '../../modulos/conteos/almacen/useAuditoriaConteosStore';

interface Props {
  abierto: boolean;
  productos: ProductoInventarioAjustable[];
  productoInicialId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  productoInicialId: '',
});

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (
    e: 'confirmarAjuste',
    payload: {
      productoId: string;
      cantidadRealContada: number;
      motivo: MotivoAjusteFigma;
      observaciones: string;
    },
  ): void;
}>();

const productoIdSeleccionado = ref<string>(
  props.productoInicialId || (props.productos[0]?.id ?? ''),
);
const cantidadRealTexto = ref<string>(
  props.productos[0] ? String(props.productos[0].stockActual) : '0',
);
const motivoSeleccionado = ref<MotivoAjusteFigma | ''>('');
const observaciones = ref<string>('');
const errorValidacion = ref<string | null>(null);

const productoSeleccionado = computed<ProductoInventarioAjustable | undefined>(() =>
  props.productos.find((prod) => prod.id === productoIdSeleccionado.value),
);

watch(
  () => props.abierto,
  (estaAbierto) => {
    if (estaAbierto) {
      const idInicial = props.productoInicialId || (props.productos[0]?.id ?? '');
      productoIdSeleccionado.value = idInicial;
      const prod = props.productos.find((p) => p.id === idInicial);
      cantidadRealTexto.value = prod ? String(prod.stockActual) : '0';
      motivoSeleccionado.value = '';
      observaciones.value = '';
      errorValidacion.value = null;
    }
  },
  { immediate: true },
);

function alCambiarProducto(nuevoId: string): void {
  productoIdSeleccionado.value = nuevoId;
  const prod = props.productos.find((p) => p.id === nuevoId);
  if (prod) {
    cantidadRealTexto.value = String(prod.stockActual);
  }
  errorValidacion.value = null;
}

const cantidadRealNumero = computed<number>(() => Number(cantidadRealTexto.value));

const cantidadValida = computed<boolean>(
  () =>
    cantidadRealTexto.value.trim() !== '' &&
    Number.isFinite(cantidadRealNumero.value) &&
    cantidadRealNumero.value >= 0,
);

const variacionCalculada = computed<number>(() => {
  if (!productoSeleccionado.value || !cantidadValida.value) {
    return 0;
  }
  return cantidadRealNumero.value - productoSeleccionado.value.stockActual;
});

const puedeGuardar = computed<boolean>(() => {
  if (!productoSeleccionado.value || !cantidadValida.value) {
    return false;
  }
  if (variacionCalculada.value === 0) {
    return false;
  }
  if (!motivoSeleccionado.value) {
    return false;
  }
  if (motivoSeleccionado.value === 'Otro' && observaciones.value.trim().length === 0) {
    return false;
  }
  return true;
});

function enviarFormulario(): void {
  errorValidacion.value = null;
  if (!puedeGuardar.value || !productoSeleccionado.value || !motivoSeleccionado.value) {
    errorValidacion.value =
      'Completa la cantidad real contada, asegúrate de que exista variación y selecciona el motivo del ajuste.';
    return;
  }

  emit('confirmarAjuste', {
    productoId: productoSeleccionado.value.id,
    cantidadRealContada: cantidadRealNumero.value,
    motivo: motivoSeleccionado.value,
    observaciones: observaciones.value.trim(),
  });
}
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-modal-ajuste-figma"
  >
    <div
      class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      data-testid="modal-ajuste-existencias-figma"
    >
      <!-- Cabecera idéntica a Pantallas Figma 43-nuevo-ajuste y 44-ajuste-revision -->
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <span class="text-xs font-semibold tracking-wider text-teal-700 uppercase">
            Existencias
          </span>
          <h2 id="titulo-modal-ajuste-figma" class="mt-1 text-xl font-bold text-slate-900">
            Ajustar existencias
          </h2>
        </div>
        <button
          type="button"
          class="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          data-testid="btn-cerrar-modal-ajuste"
          @click="emit('cerrar')"
        >
          Cerrar
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="enviarFormulario">
        <!-- Selector de producto -->
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">Producto</span>
          <select
            :value="productoIdSeleccionado"
            data-testid="select-producto-ajuste"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            @change="alCambiarProducto(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="prod in productos" :key="prod.id" :value="prod.id">
              {{ prod.nombre }} ({{ prod.sku }})
            </option>
          </select>
        </label>

        <!-- Franja informativa Stock actual · Bodega principal -->
        <div
          v-if="productoSeleccionado"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          data-testid="strip-stock-actual"
        >
          <span class="text-slate-600">
            Stock actual · {{ productoSeleccionado.bodegaNombre }}
          </span>
          <strong class="font-semibold text-slate-900">
            {{ productoSeleccionado.stockActual }} uds.
          </strong>
        </div>

        <!-- Cantidad real contada -->
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">
            Cantidad real contada
          </span>
          <input
            v-model="cantidadRealTexto"
            type="number"
            min="0"
            step="1"
            data-testid="input-cantidad-real-contada"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          />
        </label>

        <!-- Franja de revisión dinámica (Pantalla Figma 44-ajuste-revision) -->
        <div
          class="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
          :class="
            variacionCalculada < 0
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : variacionCalculada > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          "
          data-testid="strip-variacion-calculada"
        >
          <span>Variación a registrar</span>
          <strong class="font-bold">
            {{ variacionCalculada > 0 ? `+${variacionCalculada}` : variacionCalculada }} uds.
          </strong>
        </div>

        <!-- Motivo del ajuste -->
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">Motivo del ajuste</span>
          <select
            v-model="motivoSeleccionado"
            data-testid="select-motivo-ajuste"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          >
            <option value="">Selecciona un motivo</option>
            <option v-for="motivo in MOTIVOS_AJUSTE_FIGMA" :key="motivo" :value="motivo">
              {{ motivo }}
            </option>
          </select>
        </label>

        <!-- Observaciones (obligatorio si motivo === "Otro") -->
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">
            Observaciones {{ motivoSeleccionado === 'Otro' ? '(obligatorio)' : '(opcional)' }}
          </span>
          <input
            v-model="observaciones"
            type="text"
            placeholder="Ej. Conteo de cierre semanal, caja húmeda..."
            data-testid="input-observaciones-ajuste"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          />
        </label>

        <p v-if="errorValidacion" class="text-xs font-medium text-red-600" role="alert">
          {{ errorValidacion }}
        </p>

        <!-- Acciones del modal -->
        <div class="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!puedeGuardar"
            data-testid="btn-confirmar-ajuste-figma"
            class="min-h-[44px] rounded-lg bg-[#203959] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#416772] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar ajuste
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
