<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  calcularPrecioSugerido,
  redondearMoneda,
  usePreciosImpuestosStore,
  type MetodoGananciaFigma,
  type TasaIvaFigma,
} from '../../modulos/precios/almacen/usePreciosImpuestosStore';

const store = usePreciosImpuestosStore();

const vistaActiva = ref<'taxes' | 'prices'>('taxes');
const borradorTax = ref<TasaIvaFigma>(store.reglaVigente.tax);
const borradorMethod = ref<MetodoGananciaFigma>(store.reglaVigente.method);
const borradorProfit = ref<number>(store.reglaVigente.profit);
const csvManualTexto = ref<string>('');

const precioEjemploSinIva = computed<number>(() =>
  calcularPrecioSugerido(100, {
    tax: borradorTax.value,
    method: borradorMethod.value,
    profit: borradorProfit.value,
  }),
);

const gananciaEjemplo = computed<number>(() => redondearMoneda(precioEjemploSinIva.value - 100));

const ivaEjemplo = computed<number>(() =>
  redondearMoneda((precioEjemploSinIva.value * borradorTax.value) / 100),
);

const precioFinalEjemplo = computed<number>(() =>
  redondearMoneda(precioEjemploSinIva.value + ivaEjemplo.value),
);

function cambiarMetodo(metodo: MetodoGananciaFigma): void {
  borradorMethod.value = metodo;
  if (metodo === 'margin' && borradorProfit.value > 99) {
    borradorProfit.value = 99;
  }
}

function guardarConfiguracion(): void {
  store.guardarReglaComercial({
    tax: borradorTax.value,
    method: borradorMethod.value,
    profit: borradorProfit.value,
  });
}

function procesarCsvManual(): void {
  try {
    store.analizarArchivoCsvPrecios(csvManualTexto.value, 'actualizacion-precios.csv');
  } catch (err) {
    store.errorComercial = err instanceof Error ? err.message : 'Error al procesar CSV';
  }
}
</script>

<template>
  <section class="space-y-6" data-testid="vista-impuestos-precios-figma">
    <!-- Selector de sub-vista comercial (Pantallas Figma 46-48 vs 49-52 y 77) -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          {{ vistaActiva === 'taxes' ? 'Configuración comercial' : 'Gestión comercial' }}
        </span>
        <h1 class="mt-1 text-2xl font-bold text-[#203959]">
          {{
            vistaActiva === 'taxes'
              ? 'Impuestos y ganancia'
              : store.cambiosEnRevision
                ? 'Revisa antes de publicar'
                : 'Lista de precios'
          }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          {{
            vistaActiva === 'taxes'
              ? 'Una regla clara para calcular precios con confianza.'
              : store.cambiosEnRevision
                ? 'Comprueba cada cambio. Tus precios actuales siguen vigentes hasta que confirmes.'
                : 'Costos, márgenes e impuestos en una única lista.'
          }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="tab-vista-impuestos"
          class="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="
            vistaActiva === 'taxes'
              ? 'bg-[#203959] text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          "
          @click="vistaActiva = 'taxes'"
        >
          Impuestos y ganancia
        </button>
        <button
          type="button"
          data-testid="tab-vista-lista-precios"
          class="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="
            vistaActiva === 'prices'
              ? 'bg-[#203959] text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          "
          @click="vistaActiva = 'prices'"
        >
          Lista de precios
        </button>
      </div>
    </div>

    <!-- Banner de aviso o error -->
    <div
      v-if="store.avisoComercial"
      data-testid="banner-aviso-comercial-figma"
      class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
      role="status"
    >
      {{ store.avisoComercial }}
    </div>
    <div
      v-if="store.errorComercial"
      data-testid="banner-error-comercial-figma"
      class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      role="alert"
    >
      {{ store.errorComercial }}
    </div>

    <!-- VISTA 1: IMPUESTOS Y GANANCIA (Pantallas Figma 46, 47 y 48) -->
    <div v-if="vistaActiva === 'taxes'" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <form
        class="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-7"
        @submit.prevent="guardarConfiguracion"
      >
        <div class="flex items-start gap-3">
          <span
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-[#203959]"
          >
            01
          </span>
          <div>
            <h2 class="text-base font-bold text-[#203959]">Impuesto de venta</h2>
            <p class="text-xs text-slate-500">Se calcula sobre el precio antes de impuestos.</p>
          </div>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">Tasa de IVA</span>
          <select
            v-model.number="borradorTax"
            data-testid="select-tasa-iva-figma"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option :value="19">IVA general · 19%</option>
            <option :value="5">IVA reducido · 5%</option>
            <option :value="0">Exento · 0%</option>
          </select>
        </label>

        <hr class="border-slate-200" />

        <div class="flex items-start gap-3">
          <span
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-[#203959]"
          >
            02
          </span>
          <div>
            <h2 class="text-base font-bold text-[#203959]">Regla de ganancia</h2>
            <p class="text-xs text-slate-500">Elige cómo calcular el precio sugerido.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-testid="radio-metodo-markup"
            class="flex flex-col items-start rounded-xl border p-4 text-left transition"
            :class="
              borradorMethod === 'markup'
                ? 'border-[#203959] bg-slate-50 ring-1 ring-[#203959]'
                : 'border-slate-200 hover:bg-slate-50'
            "
            @click="cambiarMetodo('markup')"
          >
            <strong class="text-sm font-bold text-[#203959]">Recargo sobre el costo</strong>
            <small class="mt-1 text-xs text-slate-500">Costo × (1 + porcentaje)</small>
          </button>

          <button
            type="button"
            data-testid="radio-metodo-margin"
            class="flex flex-col items-start rounded-xl border p-4 text-left transition"
            :class="
              borradorMethod === 'margin'
                ? 'border-[#203959] bg-slate-50 ring-1 ring-[#203959]'
                : 'border-slate-200 hover:bg-slate-50'
            "
            @click="cambiarMetodo('margin')"
          >
            <strong class="text-sm font-bold text-[#203959]">Margen sobre la venta</strong>
            <small class="mt-1 text-xs text-slate-500">Costo ÷ (1 − porcentaje)</small>
          </button>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-slate-700">
            Porcentaje de ganancia (%)
          </span>
          <input
            v-model.number="borradorProfit"
            type="number"
            min="0"
            :max="borradorMethod === 'margin' ? 99 : 500"
            step="0.1"
            data-testid="input-porcentaje-ganancia-figma"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            data-testid="btn-guardar-configuracion-impuestos"
            class="min-h-[44px] rounded-lg bg-[#203959] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#416772]"
          >
            Guardar configuración
          </button>
        </div>
      </form>

      <!-- Panel lateral "ASÍ SE CALCULA" (Pantallas Figma 46 y 47) -->
      <aside class="space-y-4 lg:col-span-5">
        <section
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs"
          data-testid="panel-asi-se-calcula-figma"
        >
          <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
            Así se calcula
          </span>
          <h2 class="mt-1 text-lg font-bold text-[#203959]">Una vista previa, sin sorpresas</h2>
          <p class="mt-1 text-xs text-slate-500">Ejemplo con un producto de costo $100.00.</p>

          <div class="mt-4 space-y-2.5 border-t border-slate-200 pt-4 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Costo de compra</span>
              <strong class="text-slate-900">$100.00</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Ganancia · {{ borradorProfit }}%</span>
              <strong data-testid="preview-ganancia-valor" class="text-slate-900">
                ${{ gananciaEjemplo.toFixed(2) }}
              </strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Precio antes de impuestos</span>
              <strong data-testid="preview-precio-sin-iva" class="text-slate-900">
                ${{ precioEjemploSinIva.toFixed(2) }}
              </strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">IVA · {{ borradorTax }}%</span>
              <strong data-testid="preview-iva-valor" class="text-slate-900">
                ${{ ivaEjemplo.toFixed(2) }}
              </strong>
            </div>
            <div
              class="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 font-bold text-[#203959]"
            >
              <span>Precio final al cliente</span>
              <strong data-testid="preview-precio-final-cliente">
                ${{ precioFinalEjemplo.toFixed(2) }}
              </strong>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- VISTA 2: LISTA DE PRECIOS Y REVISIÓN CSV (Pantallas Figma 49 a 52 y 77) -->
    <div v-else class="space-y-6">
      <template v-if="store.cambiosEnRevision">
        <!-- Métricas de revisión previas a publicar -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article class="rounded-xl border border-slate-200 bg-white p-5">
            <span class="text-xs font-medium text-slate-500">Productos por actualizar</span>
            <strong
              data-testid="metric-productos-actualizar"
              class="mt-1 block text-2xl font-bold text-[#203959]"
            >
              {{ store.cambiosEnRevision.length }}
            </strong>
            <small class="text-xs text-slate-500">Identificados por SKU</small>
          </article>

          <article class="rounded-xl border border-slate-200 bg-white p-5">
            <span class="text-xs font-medium text-slate-500">Precios que aumentan</span>
            <strong class="mt-1 block text-2xl font-bold text-[#203959]">
              {{ store.totalPreciosQueAumentan }}
            </strong>
            <small class="text-xs text-slate-500">Comparados con la lista vigente</small>
          </article>

          <article class="rounded-xl border border-slate-200 bg-white p-5">
            <span class="text-xs font-medium text-slate-500">Por debajo del costo</span>
            <strong
              data-testid="metric-bajo-costo"
              class="mt-1 block text-2xl font-bold"
              :class="store.totalPreciosBajoCosto > 0 ? 'text-red-700' : 'text-[#203959]'"
            >
              {{ store.totalPreciosBajoCosto }}
            </strong>
            <small class="text-xs text-slate-500">Requieren confirmación explícita</small>
          </article>
        </div>

        <!-- Casilla de confirmación explícita (Pantalla Figma 77-confirmar-bajo-costo) -->
        <label
          v-if="store.totalPreciosBajoCosto > 0"
          data-testid="label-confirmar-bajo-costo-figma"
          class="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950"
        >
          <input
            v-model="store.autorizaBajoCosto"
            type="checkbox"
            data-testid="checkbox-autoriza-bajo-costo"
            class="h-5 w-5 rounded border-amber-400"
          />
          <span>
            Entiendo que algunos precios están por debajo del costo y autorizo aplicarlos.
          </span>
        </label>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            @click="store.cancelarRevisionPrecios()"
          >
            Cancelar importación
          </button>
          <button
            type="button"
            data-testid="btn-aplicar-precios-figma"
            class="min-h-[44px] rounded-lg bg-[#203959] px-5 py-2 text-sm font-semibold text-white hover:bg-[#416772]"
            @click="store.aplicarCambiosDePrecios()"
          >
            Aplicar {{ store.cambiosEnRevision.length }} precios
          </button>
        </div>
      </template>

      <template v-else>
        <!-- Franja de regla vigente y carga CSV (Pantalla Figma 49-lista-precios) -->
        <div
          class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm"
        >
          <span>
            Regla vigente:
            <b>
              {{ store.reglaVigente.profit }}%
              {{ store.reglaVigente.method === 'markup' ? 'sobre el costo' : 'de margen' }}
            </b>
            · IVA {{ store.reglaVigente.tax }}%
          </span>
          <button
            type="button"
            data-testid="btn-revisar-precios-sugeridos"
            class="min-h-[44px] font-semibold text-[#416772] underline"
            @click="store.prepararRevisionPreciosSugeridos()"
          >
            Revisar precios sugeridos
          </button>
        </div>

        <!-- Importador rápido CSV (SKU,Costo,Precio) -->
        <div class="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 class="text-base font-bold text-[#203959]">Importa. Revisa. Publica.</h2>
          <p class="text-xs text-slate-600">
            Archivo CSV con columnas SKU, Costo y Precio. Ningún cambio se aplica automáticamente.
          </p>
          <textarea
            v-model="csvManualTexto"
            rows="3"
            placeholder="SKU,Costo,Precio&#10;SKU-101,56,95"
            data-testid="textarea-csv-precios"
            class="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
          />
          <button
            type="button"
            data-testid="btn-analizar-csv-precios"
            class="min-h-[44px] rounded-lg bg-[#416772] px-4 py-2 text-xs font-semibold text-white"
            @click="procesarCsvManual"
          >
            Previsualizar CSV
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
