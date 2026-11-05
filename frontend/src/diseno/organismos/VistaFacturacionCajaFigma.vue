<script setup lang="ts">
import { ref } from 'vue';
import {
  useFacturacionCajaStore,
  type MedioPagoFigma,
} from '../../modulos/caja/almacen/useFacturacionCajaStore';

const store = useFacturacionCajaStore();

const metodoSeleccionado = ref<MedioPagoFigma>('Efectivo');
const efectivoRecibido = ref<number>(0);
const referenciaPago = ref<string>('');
const efectivoContadoCierre = ref<number>(store.efectivoEsperadoEnCaja);
const observacionesCierre = ref<string>('');
const errorOperacion = ref<string | null>(null);

function ejecutarCobro(): void {
  errorOperacion.value = null;
  try {
    store.confirmarCobroFactura({
      metodoPago: metodoSeleccionado.value,
      efectivoRecibido: efectivoRecibido.value,
      referenciaTransaccion: referenciaPago.value,
    });
  } catch (err) {
    errorOperacion.value = err instanceof Error ? err.message : 'Error al procesar cobro';
  }
}

function ejecutarCierreCaja(): void {
  errorOperacion.value = null;
  try {
    store.cerrarSesionCaja(efectivoContadoCierre.value, observacionesCierre.value);
  } catch (err) {
    errorOperacion.value = err instanceof Error ? err.message : 'Error al cerrar caja';
  }
}
</script>

<template>
  <section class="space-y-6" data-testid="vista-facturacion-caja-figma">
    <!-- Cabecera Caja (Pantallas Figma 25 a 35 y 76) -->
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Control diario
        </span>
        <h1 class="mt-1 text-2xl font-bold text-[#203959]">Caja y Facturación POS</h1>
        <p class="mt-1 text-sm text-slate-600">
          Cada cobro en su lugar. Cada cierre, bajo control.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span
          data-testid="badge-estado-caja-figma"
          class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          :class="
            store.cajaAbierta
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          "
        >
          {{ store.cajaAbierta ? 'Caja abierta' : 'Caja cerrada' }}
        </span>
      </div>
    </header>

    <div
      v-if="store.avisoCaja"
      data-testid="banner-aviso-caja-figma"
      class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
      role="status"
    >
      {{ store.avisoCaja }}
    </div>
    <div
      v-if="errorOperacion"
      data-testid="banner-error-caja-figma"
      class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      role="alert"
    >
      {{ errorOperacion }}
    </div>

    <!-- 3 KPIs de sesión de Caja (Pantalla Figma 25-pagos-pendientes) -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <span class="text-xs font-medium text-slate-500">Ventas de la sesión</span>
        <strong
          data-testid="kpi-ventas-sesion"
          class="mt-1 block text-2xl font-bold text-[#203959]"
        >
          ${{ store.ventasTotalesSesion.toFixed(2) }}
        </strong>
        <small class="text-xs text-slate-500">
          {{ store.cobrosDelTenant.length }} cobros registrados
        </small>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <span class="text-xs font-medium text-slate-500">Efectivo esperado</span>
        <strong
          data-testid="kpi-efectivo-esperado"
          class="mt-1 block text-2xl font-bold text-[#203959]"
        >
          ${{ store.efectivoEsperadoEnCaja.toFixed(2) }}
        </strong>
        <small class="text-xs text-slate-500">
          Incluye ${{ store.baseInicialEfectivo.toFixed(2) }} de base inicial
        </small>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <span class="text-xs font-medium text-slate-500">Tarjeta y transferencia</span>
        <strong class="mt-1 block text-2xl font-bold text-[#203959]">
          ${{ store.ventasTarjetaYTransferenciaSesion.toFixed(2) }}
        </strong>
        <small class="text-xs text-slate-500">No se incluye en el arqueo de efectivo</small>
      </article>
    </div>

    <!-- Punto de Cobro y Cierre de Caja -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Panel Punto de Cobro (Pantallas Figma 25-29 y 76) -->
      <section class="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Punto de cobro
        </span>
        <h2 class="text-lg font-bold text-[#203959]">Un cobro, sin complicaciones</h2>

        <div v-if="store.facturaPendienteEnCaja" class="space-y-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span class="text-xs font-semibold text-amber-800">Pendiente de pago</span>
            <h3 class="text-base font-bold text-[#203959]">
              {{ store.facturaPendienteEnCaja.referencia }}
            </h3>
            <strong class="text-xl font-bold text-slate-900">
              ${{ store.facturaPendienteEnCaja.total.toFixed(2) }}
            </strong>
          </div>

          <div class="flex gap-2">
            <button
              v-for="m in (['Efectivo', 'Tarjeta', 'Transferencia'] as MedioPagoFigma[])"
              :key="m"
              type="button"
              class="min-h-[44px] flex-1 rounded-lg border px-3 py-2 text-xs font-semibold"
              :class="
                metodoSeleccionado === m
                  ? 'border-[#203959] bg-[#203959] text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              "
              @click="metodoSeleccionado = m"
            >
              {{ m }}
            </button>
          </div>

          <label v-if="metodoSeleccionado === 'Efectivo'" class="block text-sm">
            <span class="mb-1 block font-medium text-slate-700">Efectivo recibido (USD)</span>
            <input
              v-model.number="efectivoRecibido"
              type="number"
              min="0"
              step="0.01"
              data-testid="input-efectivo-recibido-figma"
              class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label v-else class="block text-sm">
            <span class="mb-1 block font-medium text-slate-700">
              Referencia de {{ metodoSeleccionado.toLowerCase() }}
            </span>
            <input
              v-model="referenciaPago"
              type="text"
              data-testid="input-referencia-pago-figma"
              class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <button
            type="button"
            data-testid="btn-confirmar-cobro-figma"
            class="min-h-[44px] w-full rounded-lg bg-[#203959] px-4 py-2.5 text-sm font-semibold text-white"
            @click="ejecutarCobro"
          >
            Confirmar cobro
          </button>
        </div>

        <!-- Estado vacío 76-caja-sin-pendientes -->
        <div
          v-else
          data-testid="estado-caja-sin-pendientes-figma"
          class="rounded-lg border border-dashed border-slate-300 p-6 text-center"
        >
          <h3 class="text-sm font-bold text-[#203959]">Todo al día</h3>
          <p class="mt-1 text-xs text-slate-600">
            Prepara una factura y envíala a caja para registrar el pago.
          </p>
        </div>
      </section>

      <!-- Panel Arqueo y Cierre de Caja (Pantallas Figma 31 a 34) -->
      <section class="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Cierre de caja
        </span>
        <h2 class="text-lg font-bold text-[#203959]">
          Cuenta el efectivo físico y compáralo con el esperado
        </h2>

        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Efectivo contado (USD)</span>
          <input
            v-model.number="efectivoContadoCierre"
            type="number"
            min="0"
            step="0.01"
            data-testid="input-efectivo-contado-cierre"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Observaciones de arqueo</span>
          <input
            v-model="observacionesCierre"
            type="text"
            placeholder="Explica cualquier diferencia en el arqueo..."
            data-testid="input-observaciones-cierre"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="button"
          data-testid="btn-confirmar-cierre-caja"
          class="min-h-[44px] w-full rounded-lg bg-[#416772] px-4 py-2.5 text-sm font-semibold text-white"
          @click="ejecutarCierreCaja"
        >
          Confirmar cierre
        </button>
      </section>
    </div>
  </section>
</template>
