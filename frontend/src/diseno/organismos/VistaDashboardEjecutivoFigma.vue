<script setup lang="ts">
import { ref, computed } from 'vue';

interface MetricaKpi {
  id: string;
  titulo: string;
  valor: string;
  subtexto: string;
  tendencia: 'arriba' | 'abajo' | 'neutro';
  porcentaje: string;
  colorBorde: string;
  icono: string;
}

interface AlertaStockRapida {
  sku: string;
  producto: string;
  almacen: string;
  cantidadDisponible: number;
  puntoReorden: number;
  nivel: 'CRITICO' | 'REORDEN';
}

const emit = defineEmits<{
  (e: 'navegar', moduloId: string): void;
  (e: 'abrirConteo'): void;
  (e: 'abrirVenta'): void;
  (e: 'abrirRecepcion'): void;
}>();

// Estado del Onboarding Inicial (Pantallas Figma 02-09)
const onboardingCompletado = ref(false);
const pasoOnboarding = ref<number>(3); // 3 de 4 pasos completados en demo

const pasosOnboarding = [
  { id: 1, titulo: 'Registrar Empresa y Tenant', completado: true },
  { id: 2, titulo: 'Configurar Almacén Principal', completado: true },
  { id: 3, titulo: 'Importar Catálogo y Categorías', completado: true },
  { id: 4, titulo: 'Emitir Primer Conteo Físico', completado: false },
];

// Métricas de KPIs del Dashboard Ejecutivo (Pantalla Figma 12-dashboard-principal)
const metricasKpi = ref<MetricaKpi[]>([
  {
    id: 'valor-inventario',
    titulo: 'Valor Total del Inventario',
    valor: '$148,920.00 MXN',
    subtexto: 'Valorizado bajo método PEPS permanente',
    tendencia: 'arriba',
    porcentaje: '+4.2% vs mes anterior',
    colorBorde: 'border-[#416772]',
    icono: '💰',
  },
  {
    id: 'skus-activos',
    titulo: 'Catálogo de Artículos (SKUs)',
    valor: '438 SKUs',
    subtexto: 'Distribuidos en 3 bodegas activas',
    tendencia: 'neutro',
    porcentaje: '18 categorías activas',
    colorBorde: 'border-[#96ADA5]',
    icono: '📦',
  },
  {
    id: 'stock-critico',
    titulo: 'Alertas de Stock Crítico',
    valor: '7 Artículos',
    subtexto: 'Por debajo del punto de reorden mínimo',
    tendencia: 'abajo',
    porcentaje: 'Requiere reposición urgente',
    colorBorde: 'border-rose-500',
    icono: '⚠️',
  },
  {
    id: 'ordenes-pendientes',
    titulo: 'Órdenes de Compra en Tránsito',
    valor: '4 Órdenes',
    subtexto: 'Recepciones pendientes de validación',
    tendencia: 'arriba',
    porcentaje: '2 programadas para hoy',
    colorBorde: 'border-[#203959]',
    icono: '🚚',
  },
]);

// Lista de alertas rápidas en stock crítico
const alertasCriticas = ref<AlertaStockRapida[]>([
  {
    sku: 'VALV-IND-200',
    producto: 'Válvula de Presión Industrial 2"',
    almacen: 'Bodega Monterrey',
    cantidadDisponible: 3,
    puntoReorden: 15,
    nivel: 'CRITICO',
  },
  {
    sku: 'MAN-500-HD',
    producto: 'Manguera Hidráulica Alta Presión 5m',
    almacen: 'Bodega Monterrey',
    cantidadDisponible: 8,
    puntoReorden: 20,
    nivel: 'CRITICO',
  },
  {
    sku: 'TERM-DIG-01',
    producto: 'Termómetro Infrarrojo Digital Calibrado',
    almacen: 'Bodega Saltillo',
    cantidadDisponible: 12,
    puntoReorden: 25,
    nivel: 'REORDEN',
  },
]);

// Accesos rápidos para operarios de bodega y gerencia (Mobile-First 390px)
const accesosRapidos = [
  {
    id: 'conteo',
    titulo: 'Nuevo Conteo Ciego',
    subtitulo: 'Escanear códigos en pasillo',
    icono: '📋',
    accion: () => emit('abrirConteo'),
    colorFondo: 'bg-[#416772]',
  },
  {
    id: 'recepcion',
    titulo: 'Recepción de Mercancía',
    subtitulo: 'Validar remisión contra orden',
    icono: '📥',
    accion: () => emit('abrirRecepcion'),
    colorFondo: 'bg-[#203959]',
  },
  {
    id: 'venta',
    titulo: 'Facturación / Caja POS',
    subtitulo: 'Emitir cobro o ticket de salida',
    icono: '💳',
    accion: () => emit('abrirVenta'),
    colorFondo: 'bg-[#96ADA5] text-[#203959]',
  },
  {
    id: 'kardex',
    titulo: 'Libro Mayor Kardex',
    subtitulo: 'Consultar saldos y movimientos',
    icono: '📊',
    accion: () => emit('navegar', 'kardex-peps'),
    colorFondo: 'bg-[#839492]',
  },
];

const porcentajeOnboarding = computed(() => {
  return Math.round((pasosOnboarding.filter((p) => p.completado).length / pasosOnboarding.length) * 100);
});
</script>

<template>
  <div class="space-y-6" data-testid="vista-dashboard-ejecutivo-figma">
    <!-- Encabezado con Paleta Oficial Aurora Mist -->
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-[#416772] px-2 py-0.5 font-mono text-xs font-semibold text-white uppercase">
            Pantallas Figma 01–20
          </span>
          <span class="text-xs font-semibold text-[#839492]">
            Dashboard Ejecutivo &bull; Onboarding
          </span>
        </div>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-[#203959]">
          Panel de Control Ejecutivo y Métricas de Operación
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#839492]">
          Supervisión en tiempo real de valorización de existencias, rotación, alertas tempranas y accesos directos.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#416772] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#33525b] focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
          @click="emit('abrirConteo')"
        >
          <span aria-hidden="true">📷</span>
          <span>Escanear Código PWA</span>
        </button>
      </div>
    </header>

    <!-- Banner de Onboarding y Configuración Inicial (Pantallas Figma 02-09) -->
    <section
      v-if="!onboardingCompletado"
      class="rounded-xl border border-[#96ADA5]/50 bg-gradient-to-r from-[#203959] to-[#416772] p-5 text-white shadow-sm"
      aria-label="Progreso de Onboarding SGCI"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">🚀</span>
            <h2 class="text-base font-bold">Configuración de Puesta en Marcha (Onboarding)</h2>
            <span class="rounded-full bg-[#96ADA5] px-2 py-0.5 text-xs font-semibold text-[#203959]">
              {{ porcentajeOnboarding }}% listo
            </span>
          </div>
          <p class="text-xs text-[#ABB7B3]">
            Completa los pasos esenciales para activar la trazabilidad total de inventarios en tus bodegas.
          </p>
        </div>

        <button
          type="button"
          class="min-h-[44px] self-start md:self-auto rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#203959] transition hover:bg-[#ABB7B3] focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
          @click="onboardingCompletado = true"
        >
          Ocultar Asistente
        </button>
      </div>

      <!-- Barra de progreso y pasos -->
      <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="paso in pasosOnboarding"
          :key="paso.id"
          class="flex items-center gap-2 rounded-lg bg-black/20 p-2.5 text-xs"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            :class="paso.completado ? 'bg-[#96ADA5] text-[#203959]' : 'bg-white/20 text-white'"
          >
            {{ paso.completado ? '✓' : paso.id }}
          </span>
          <span :class="paso.completado ? 'text-white' : 'text-[#ABB7B3]'">
            {{ paso.titulo }}
          </span>
        </div>
      </div>
    </section>

    <!-- Fila de Tarjetas de Métricas Ejecutivas (KPIs) -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPIs Ejecutivos">
      <article
        v-for="kpi in metricasKpi"
        :key="kpi.id"
        class="flex flex-col justify-between rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
        :class="kpi.colorBorde"
      >
        <header class="flex items-start justify-between gap-2">
          <span class="text-xs font-semibold text-[#839492]">{{ kpi.titulo }}</span>
          <span class="text-xl" aria-hidden="true">{{ kpi.icono }}</span>
        </header>

        <div class="my-2">
          <p class="text-xl font-bold font-mono text-[#203959] sm:text-2xl">
            {{ kpi.valor }}
          </p>
          <p class="text-[11px] text-[#416772] font-semibold mt-0.5">
            {{ kpi.porcentaje }}
          </p>
        </div>

        <footer class="border-t border-[#ABB7B3]/30 pt-2 text-[11px] text-[#839492]">
          {{ kpi.subtexto }}
        </footer>
      </article>
    </section>

    <!-- Bloque de Accesos Rápidos Táctiles (Mobile-First 390px) -->
    <section class="space-y-3" aria-label="Accesos Rápidos de Bodega">
      <h2 class="text-sm font-bold text-[#203959] uppercase tracking-wide">
        Accesos Rápidos Operativos (Bodega y Mostrador)
      </h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          v-for="acceso in accesosRapidos"
          :key="acceso.id"
          type="button"
          class="flex min-h-[56px] items-center gap-3 rounded-xl p-3 text-left text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
          :class="acceso.colorFondo"
          @click="acceso.accion"
        >
          <span class="text-2xl shrink-0" aria-hidden="true">{{ acceso.icono }}</span>
          <div class="min-w-0 flex-1">
            <h3 class="text-xs font-bold leading-tight truncate">{{ acceso.titulo }}</h3>
            <p class="text-[11px] opacity-80 truncate">{{ acceso.subtitulo }}</p>
          </div>
          <span class="text-xs opacity-75" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>

    <!-- Tablas Resumen: Alertas de Stock y Flujo de Recepción -->
    <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Tabla de Alertas de Stock Crítico (2 columnas) -->
      <div class="rounded-xl border border-[#ABB7B3]/40 bg-white p-4 shadow-sm lg:col-span-2">
        <div class="flex items-center justify-between border-b border-[#ABB7B3]/30 pb-3">
          <div>
            <h2 class="text-sm font-bold text-[#203959]">Alertas de Reorden y Stock Mínimo</h2>
            <p class="text-xs text-[#839492]">Artículos con saldo disponible igual o inferior al punto de seguridad</p>
          </div>
          <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
            {{ alertasCriticas.length }} críticos
          </span>
        </div>

        <div class="mt-3 divide-y divide-[#ABB7B3]/20">
          <div
            v-for="alerta in alertasCriticas"
            :key="alerta.sku"
            class="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="rounded bg-[#203959] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                  {{ alerta.sku }}
                </span>
                <span class="text-xs font-medium text-[#203959] truncate">
                  {{ alerta.producto }}
                </span>
              </div>
              <p class="text-[11px] text-[#839492] mt-0.5">
                Ubicación: {{ alerta.almacen }} &bull; Reorden: {{ alerta.puntoReorden }} uds.
              </p>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div class="text-right">
                <span class="font-mono text-sm font-bold text-rose-700">
                  {{ alerta.cantidadDisponible }} disponibles
                </span>
              </div>
              <button
                type="button"
                class="min-h-[44px] rounded-lg border border-[#416772] px-3 py-1.5 text-xs font-semibold text-[#416772] hover:bg-[#416772] hover:text-white"
                @click="emit('navegar', 'catalogo-proveedores-clientes')"
              >
                Reabastecer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen de Topología de Almacenes (1 columna) -->
      <div class="flex flex-col justify-between rounded-xl border border-[#ABB7B3]/40 bg-[#203959] p-4 text-white shadow-sm">
        <div>
          <div class="flex items-center justify-between border-b border-[#416772]/50 pb-3">
            <h2 class="text-sm font-bold text-white">Topología de Almacenes</h2>
            <span class="rounded bg-[#416772] px-2 py-0.5 text-xs font-semibold text-white">
              3 Sedes
            </span>
          </div>

          <div class="mt-4 space-y-3">
            <div class="rounded-lg bg-white/10 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-white">Bodega Central Monterrey</span>
                <span class="text-[#96ADA5] font-mono">82% Capacidad</span>
              </div>
              <div class="mt-2 h-1.5 w-full rounded-full bg-white/20">
                <div class="h-1.5 rounded-full bg-[#96ADA5]" style="width: 82%" />
              </div>
            </div>

            <div class="rounded-lg bg-white/10 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-white">Bodega Saltillo Oriente</span>
                <span class="text-[#96ADA5] font-mono">45% Capacidad</span>
              </div>
              <div class="mt-2 h-1.5 w-full rounded-full bg-white/20">
                <div class="h-1.5 rounded-full bg-[#416772]" style="width: 45%" />
              </div>
            </div>

            <div class="rounded-lg bg-white/10 p-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-white">Cámara de Congelación Norte</span>
                <span class="text-[#96ADA5] font-mono">60% Capacidad</span>
              </div>
              <div class="mt-2 h-1.5 w-full rounded-full bg-white/20">
                <div class="h-1.5 rounded-full bg-[#96ADA5]" style="width: 60%" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#416772] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#33525b]"
          @click="emit('navegar', 'kardex-peps')"
        >
          Ver Racks y Ubicaciones Bin &rarr;
        </button>
      </div>
    </section>
  </div>
</template>
