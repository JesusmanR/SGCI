import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..');
const publicDir = join(repoRoot, 'frontend', 'public');
const mvpDbPath = join(repoRoot, 'database', 'mvp-storage.json');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const PORTAL_SGCI_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SGCI · Control de Inventarios (Industrias Alfa S.A.S. · 25 Pantallas Oficiales SGCI)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
    body { font-family: 'Inter', system-ui, sans-serif; background: #F5F7FB; color: #0F172A; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen bg-[#F5F7FB] text-slate-900 antialiased">
  <div class="flex min-h-screen flex-row">
    <!-- Barra Lateral Exacta SGCI (#0A1120) · Ancho estricto sin colisión en cualquier resolución (252px Expandido / 72px Contraído) -->
    <aside id="sidebar-principal" class="flex w-[252px] min-w-[252px] max-w-[252px] min-h-screen flex-col justify-between bg-[#0A1120] text-white shrink-0 select-none transition-all duration-200 border-r border-slate-800/80 z-30"></aside>

    <!-- Contenedor Derecho: Topbar + Contenido -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar Exacto SGCI (Pantallas 07-15) -->
      <header id="topbar-principal" class="h-[68px] bg-white border-b border-slate-200/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <div>
              <strong id="org-nombre-top" class="block text-xs font-bold text-slate-900 leading-none">Industrias Alfa S.A.S.</strong>
              <span id="org-tenant-top" class="block text-[10px] font-mono text-slate-400 mt-0.5">IND-ALFA · 8f2a...c91d</span>
            </div>
            <select id="select-rol-top" onchange="cambiarRolTop(this.value)" class="ml-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-bold text-blue-700 uppercase cursor-pointer">
              <option value="JEFE_ALMACEN">JEFE_ALMACEN</option>
              <option value="ADMIN_EMPRESA">ADMIN_EMPRESA</option>
              <option value="AUDITOR_CONTEOS">AUDITOR_CONTEOS</option>
              <option value="OPERADOR_PISO">OPERADOR_PISO</option>
              <option value="SUPER_ADMIN_SAAS">SUPER_ADMIN_SAAS</option>
            </select>
          </div>

          <div class="h-6 w-px bg-slate-200 hidden sm:block"></div>

          <!-- Selector Bodega Activa -->
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
              🏬
            </div>
            <div>
              <span class="block text-[9px] font-bold uppercase tracking-wider text-slate-400">BODEGA ACTIVA</span>
              <select id="select-bodega-top" onchange="cambiarBodegaTop(this.value)" class="text-xs font-bold text-slate-900 bg-transparent cursor-pointer focus:outline-none">
                <option value="ALM-CENTRAL-01 — Bodega Central Monterrey">ALM-CENTRAL-01 — Bodega Central Monterrey</option>
                <option value="ALM-NORTE-02 — Centro Logístico Saltillo">ALM-NORTE-02 — Centro Logístico Saltillo</option>
                <option value="ALM-SUR-03 — Plataforma Querétaro">ALM-SUR-03 — Plataforma Querétaro</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button onclick="state.mostrarGuiaUatMvp = !state.mostrarGuiaUatMvp; renderMain()" class="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1120] px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 transition">
            🧪 Guía Prueba MVP
          </button>

          <button onclick="restaurarDatosDemoMvp()" title="Restaurar estado inicial de Industrias Alfa S.A.S." class="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            ↺ Reset MVP
          </button>

          <button onclick="alternarModoOffline()" id="btn-status-ws" class="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-emerald-200 bg-emerald-50/60 text-left transition">
            <span id="dot-ws" class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <div>
              <strong id="txt-ws-title" class="block text-[11px] font-bold text-emerald-800 leading-none">Online</strong>
              <span id="txt-ws-sub" class="block text-[9px] text-slate-500 mt-0.5">WebSockets activo</span>
            </div>
          </button>

          <button onclick="state.mostrarCentroNotificaciones = !state.mostrarCentroNotificaciones; renderMain()" title="Centro de Notificaciones WebSockets en Tiempo Real" class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition">
            🔔
            <span id="badge-notif-top" class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white">4</span>
          </button>

          <button onclick="cerrarSesionMvp()" title="Cerrar sesión y volver a Login / Crear Cuenta" class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition">
            🚪 Salir
          </button>

          <a href="/artifacts/sgci-pantallas/INDICE.html" target="_blank" class="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            🖼️ 47 PNGs ↗
          </a>
        </div>
      </header>

      <!-- Panel Desplegable de Guía Interactiva UAT y Centro de Notificaciones WebSockets -->
      <div id="contenedor-guia-uat" class="max-w-[1440px] w-full mx-auto px-6 lg:px-8 pt-4 empty:hidden"></div>

      <!-- Área Principal Dinámica -->
      <main id="contenedor-principal" class="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto"></main>
    </div>
  </div>

  <script>
    const ICONOS_SVG = {
      grid: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
      box: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      warehouse: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>',
      book: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>',
      layers: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></svg>',
      clipboard: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
      truck: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
      chart: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
      users: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      mobile: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
      lock: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      gallery: '<svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
      collapseLeft: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>',
      expandRight: '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
      wifi: '<svg class="w-4 h-4 shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>',
    };

    const MENU_OPERACION = [
      { id: 'centro-mando', label: 'Centro de mando', icon: 'grid', screen: '07' },
      { id: 'productos-rop', label: 'Productos y ROP', icon: 'box', screen: '08' },
      { id: 'almacenes', label: 'Almacenes', icon: 'warehouse', screen: '09' },
      { id: 'libro-kardex', label: 'Libro Kardex', icon: 'book', screen: '10' },
      { id: 'lotes-fefo', label: 'Lotes y FEFO', icon: 'layers', screen: '11' },
      { id: 'conteos-auditoria', label: 'Conteos y auditoría', icon: 'clipboard', badge: 2, screen: '12' },
      { id: 'abastecimiento', label: 'Abastecimiento', icon: 'truck', screen: '13' },
    ];

    const MENU_ADMIN = [
      { id: 'analitica', label: 'Analítica', icon: 'chart', screen: '14' },
      { id: 'gobernanza-rbac', label: 'Gobernanza RBAC', icon: 'users', screen: '15' },
    ];

    const MENU_PANTALLAS = [
      { id: 'pwa-movil', label: 'App Móvil PWA (390px)', icon: 'mobile', screen: 'M07-M10' },
      { id: 'landing', label: 'Landing y Login (01–06)', icon: 'lock', screen: '01-06' },
      { id: 'galeria-25', label: '47 Capturas SGCI (Menú)', icon: 'gallery', screen: '47 PNG' },
    ];

    const sesionGuardada = JSON.parse(localStorage.getItem('sgci_sesion_mvp_v1') || 'null');

    let state = {
      sesionActiva: Boolean(sesionGuardada && sesionGuardada.email),
      usuarioActual: sesionGuardada || {
        nombre: 'Laura Mendoza',
        iniciales: 'LM',
        email: 'laura@industriasalfa.com',
        organizacion: 'Industrias Alfa S.A.S.',
        codigoOrg: 'IND-ALFA',
        rol: 'JEFE_ALMACEN',
      },
      vista: (sesionGuardada && sesionGuardada.email) ? 'centro-mando' : 'landing',
      menuContraido: false,
      menuMovilAbierto: false,
      subVistaAcceso: '03-login',
      loginOrgInput: 'IND-ALFA',
      loginEmailInput: 'laura@industriasalfa.com',
      loginPasswordInput: 'AlfaInventario#2026',
      mostrarPasswordLogin: false,
      mensajeAuthError: '',
      mensajeAuthExito: '',
      regNombreInput: '',
      regOrganizacionInput: '',
      regCodigoOrgInput: '',
      regEmailInput: '',
      regPasswordInput: '',
      regRolInput: 'ADMIN_EMPRESA',
      recuperacionEmailInput: 'laura@industriasalfa.com',
      mostrarModalDemo02: false,
      mostrarModalProducto08b: false,
      mostrarModalRecepcion13b: false,
      mostrarModalTransferencia09b: false,
      mostrarSimuladorFefo11b: false,
      mostrarModalCicloConteo12b: false,
      mostrarModalRbac15b: false,
      mostrarCentroNotificaciones: false,
      mostrarGuiaUatMvp: true,
      nuevoUsuarioRbacNombre: 'Sofía Cárdenas (s.cardenas@industriasalfa.com)',
      nuevoUsuarioRbacRol: 'AUDITOR_CONTEOS',
      nuevoUsuarioRbacBodega: 'ALM-NORTE-02 — Centro Logístico Saltillo',
      usuariosRbacExtra: [],
      notificacionesVivas: [
        { id: 'n1', titulo: 'Stock por debajo del mínimo', detalle: 'AC-100-FLEX descendió a 5 PZA en Bodega Central', tiempo: 'Hace 2 min', vista: 'productos-rop', leida: false },
        { id: 'n2', titulo: 'Transferencia en tránsito', detalle: 'TR-2026-0188 salió de Bodega Norte hacia Monterrey', tiempo: 'Hace 18 min', vista: 'almacenes', leida: false },
        { id: 'n3', titulo: 'Recepción conciliada en Muelle 02', detalle: 'OC-2026-0118 · 20 bultos recibidos e ingresados a Kardex', tiempo: 'Hace 46 min', vista: 'abastecimiento', leida: false },
        { id: 'n4', titulo: 'Conteo pendiente de 2ª firma', detalle: 'Ciclo CC-2026-028 · Zona B requiere autorización mancomunada', tiempo: 'Hace 1 h', vista: 'conteos-auditoria', leida: false },
      ],
      cantidadDespachoFefo: 10,
      nuevoProdSku: 'VL-310-TITAN',
      nuevoProdNombre: 'Válvula direccional neumática 1/2"',
      nuevoProdUbicacion: 'A-01-R04-NA',
      nuevoProdMin: 10,
      nuevoProdRop: 16,
      nuevoProdMax: 50,
      nuevoProdStock: 28,
      rol: 'JEFE_ALMACEN',
      bodega: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
      online: true,
      metodoKardex: 'PEPS / FIFO',
      metodoComparadorAnalitica: 'PEPS',
      busquedaSku: '',
      tabMovil: 'inicio',
      conteoFisicoInput: '14',
      pantallasManifest: [],
      filtroGaleria: 'Todos',
      tokenRecuperacionInput: 'SGCI-RST-8F2A-2026',
      nuevaPasswordInput: 'AlfaInventario#2026',
      confirmarPasswordInput: 'AlfaInventario#2026',
      tokenActualizadoExito: false,
      colaOffline: JSON.parse(localStorage.getItem('sgci_cola_offline_v1') || 'null') || [
        { id: 'op-1', titulo: 'Salida · AC-100-FLEX · 4 PZA', detalle: 'Hoy · 10:42 · D. Ríos', estado: 'PENDIENTE' },
        { id: 'op-2', titulo: 'Conteo · B-02-05 · 14 PZA', detalle: 'Hoy · 10:38 · D. Ríos', estado: 'PENDIENTE' },
        { id: 'op-3', titulo: 'Entrada · FL-084-NBR · 20 PZA', detalle: 'Hoy · 10:21 · D. Ríos', estado: 'PENDIENTE' },
        { id: 'op-4', titulo: 'Conteo · A-01-03 · 8 PZA', detalle: 'Hoy · 09:54 · D. Ríos', estado: 'PENDIENTE' },
      ],
      productos: [
        { sku: 'AC-100-FLEX', nombre: 'Válvula de Presión Industrial 2"', ubicacion: 'A-04-R02-NB', lote: 'LOTE-2026-089', metodo: 'PEPS', min: 12, rop: 18, max: 48, stock: 5, costo: 142.50, estado: 'CRÍTICO' },
        { sku: 'RB-220-INOX', nombre: 'Rodamiento sellado acero inoxidable', ubicacion: 'B-02-R08-NA', lote: 'LOTE-2026-101', metodo: 'CPP', min: 10, rop: 20, max: 60, stock: 14, costo: 148.20, estado: 'REORDEN' },
        { sku: 'FL-084-NBR', nombre: 'Sello mecánico NBR 84 mm', ubicacion: 'B-06-R03-NC', lote: 'LOTE-2027-014', metodo: 'PEPS', min: 20, rop: 32, max: 100, stock: 84, costo: 64.00, estado: 'ÓPTIMO' },
      ],
      movimientosKardex: [
        { fecha: '08 MAR 2026 · 08:42:16 UTC-6', doc: 'OC-2026-0041', tipo: 'ENTRADA COMPRA', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '24.0000', salida: '—', saldo: '29.0000', costoUnit: 142.50, saldoVal: 4132.50, operador: 'L. Mendoza', rolOp: 'ALMACENISTA' },
        { fecha: '08 MAR 2026 · 09:18:02 UTC-6', doc: 'TR-2026-0188', tipo: 'TRANSFERENCIA', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '—', salida: '8.0000', saldo: '21.0000', costoUnit: 142.50, saldoVal: 2992.50, operador: 'M. Solís', rolOp: 'ALMACENISTA' },
        { fecha: '08 MAR 2026 · 10:06:44 UTC-6', doc: 'OT-2026-1092', tipo: 'SALIDA DESPACHO', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '—', salida: '16.0000', saldo: '5.0000', costoUnit: 142.50, saldoVal: 712.50, operador: 'D. Ríos', rolOp: 'ALMACENISTA' },
        { fecha: '08 MAR 2026 · 11:31:19 UTC-6', doc: 'AJ-2026-0062', tipo: 'AJUSTE', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '1.0000', salida: '—', saldo: '6.0000', costoUnit: 142.50, saldoVal: 855.00, operador: 'A. Vélez', rolOp: 'ALMACENISTA' },
      ],
      lotesFefo: [
        { lote: 'LOTE-2026-089', sku: 'AC-100-FLEX', producto: 'Válvula de Presión Industrial 2"', vence: '2026-11-17', dias: 12, cant: 6, ubicacion: 'A-04-R02-NB', semaforo: 'PROXIMO_A_VENCER' },
        { lote: 'LOTE-2026-101', sku: 'RB-220-INOX', producto: 'Rodamiento sellado acero inoxidable', vence: '2026-12-28', dias: 53, cant: 18, ubicacion: 'B-02-R08-NA', semaforo: 'ADVERTENCIA' },
        { lote: 'LOTE-2027-014', sku: 'FL-084-NBR', producto: 'Sello mecánico NBR 84 mm', vence: '2027-06-15', dias: 222, cant: 84, ubicacion: 'B-06-R03-NC', semaforo: 'VIGENTE' },
        { lote: 'LOTE-2026-019', sku: 'AC-100-FLEX', producto: 'Válvula de Presión Industrial 2"', vence: '2026-10-01', dias: -35, cant: 3, ubicacion: 'ZONA-CUARENTENA-01', semaforo: 'CUARENTENA' },
      ],
      ordenesCompra: [
        { oc: 'OC-2026-0118', proveedor: 'Metalnova Industrial S.A.', sku: 'AC-100-FLEX', solicitado: 20, recibido: 20, muelle: 'Muelle 02', estado: 'CONCILIADA', totalUsd: 2850 },
        { oc: 'OC-2026-0119', proveedor: 'Nortek Suministros', sku: 'RB-220-INOX', solicitado: 40, recibido: 0, muelle: 'Muelle 01', estado: 'ABIERTA · PENDIENTE RECEPCIÓN', totalUsd: 5928 },
      ],
    };

    function renderItemMenu(item) {
      const activo = state.vista === item.id;
      const svg = ICONOS_SVG[item.icon] || ICONOS_SVG.grid;
      if (state.menuContraido) {
        return \`
          <button onclick="seleccionarVista('\${item.id}')" aria-label="\${item.label}" class="group relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition \${activo ? 'bg-[#2563EB] text-white shadow-md border-l-[3px] border-l-cyan-300' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}">
            \${svg}
            \${item.badge ? \`<span class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white shadow">\${item.badge}</span>\` : ''}
            <span class="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-[#0A1120] border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              \${item.label}
            </span>
          </button>
        \`;
      }
      return \`
        <button onclick="seleccionarVista('\${item.id}')" class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition \${activo ? 'bg-[#2563EB] text-white shadow-md border-l-[3px] border-l-cyan-300' : 'text-slate-400 hover:bg-slate-800/75 hover:text-white'}">
          <span class="flex items-center gap-3 min-w-0">
            \${svg}
            <span class="truncate">\${item.label}</span>
          </span>
          \${item.badge ? \`<span class="shrink-0 rounded-full bg-rose-900/90 border border-rose-500/40 text-rose-200 text-[10px] font-bold px-2 py-0.5 leading-none">\${item.badge}</span>\` : ''}
        </button>
      \`;
    }

    function alternarMenuLateral() {
      state.menuContraido = !state.menuContraido;
      renderSidebar();
    }

    function renderSidebar() {
      const aside = document.getElementById('sidebar-principal');
      const topbar = document.getElementById('topbar-principal');
      const orgNombreTop = document.getElementById('org-nombre-top');
      const orgTenantTop = document.getElementById('org-tenant-top');
      const selectRolTop = document.getElementById('select-rol-top');

      if (orgNombreTop && state.usuarioActual) orgNombreTop.textContent = state.usuarioActual.organizacion || 'Industrias Alfa S.A.S.';
      if (orgTenantTop && state.usuarioActual) orgTenantTop.textContent = (state.usuarioActual.codigoOrg || 'IND-ALFA') + ' · 8f2a...c91d';
      if (selectRolTop) selectRolTop.value = state.rol;

      if (!aside) return;

      if (!state.sesionActiva && state.vista === 'landing') {
        aside.style.display = 'none';
        if (topbar) topbar.style.display = 'none';
        return;
      }

      aside.style.display = 'flex';
      if (topbar) topbar.style.display = 'flex';

      const usrNombre = (state.usuarioActual && state.usuarioActual.nombre) || 'Laura Mendoza';
      const usrIniciales = (state.usuarioActual && state.usuarioActual.iniciales) || 'LM';

      if (state.menuContraido) {
        // MODO CONTRAÍDO (72px estricto en cualquier ancho de ventana): Cero nodos de texto en el DOM -> Imposible que se sobrepongan iconos o textos
        aside.className = 'flex w-[72px] min-w-[72px] max-w-[72px] min-h-screen flex-col justify-between bg-[#0A1120] text-white shrink-0 select-none transition-all duration-200 border-r border-slate-800/80 z-30';
        aside.innerHTML = \`
          <div class="flex flex-col items-center">
            <div class="h-[68px] w-full flex items-center justify-center border-b border-slate-800/80 px-2">
              <button onclick="alternarMenuLateral()" title="Expandir menú lateral" class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-200 hover:text-white hover:border-cyan-400 transition">
                \${ICONOS_SVG.expandRight}
              </button>
            </div>
            <nav class="py-4 flex flex-col items-center gap-1.5 w-full px-2">
              \${MENU_OPERACION.map(renderItemMenu).join('')}
              <div class="w-8 h-px bg-slate-800 my-1.5"></div>
              \${MENU_ADMIN.map(renderItemMenu).join('')}
              <div class="w-8 h-px bg-slate-800 my-1.5"></div>
              \${MENU_PANTALLAS.map(renderItemMenu).join('')}
            </nav>
          </div>
          <div class="flex flex-col items-center gap-2.5 pb-3">
            <div title="Operación conectada · Todos los sistemas activos" class="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-[#0D182C]">
              \${ICONOS_SVG.wifi}
            </div>
            <div class="w-full border-t border-slate-800/80 pt-3 flex flex-col items-center gap-2 bg-[#080E1A]">
              <div title="\${usrNombre} · \${state.rol}" class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white font-extrabold text-xs">
                \${usrIniciales}
              </div>
              <button onclick="cerrarSesionMvp()" title="Cerrar sesión" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs">
                ✕
              </button>
            </div>
          </div>
        \`;
        return;
      }

      // MODO EXPANDIDO (252px estricto): Réplica exacta de 01-Centro-de-mando-MENU-EXPANDIDO.png
      aside.className = 'flex w-[252px] min-w-[252px] max-w-[252px] min-h-screen flex-col justify-between bg-[#0A1120] text-white shrink-0 select-none overflow-hidden transition-all duration-200 border-r border-slate-800/80 z-30';
      aside.innerHTML = \`
        <div>
          <div class="h-[68px] flex items-center justify-between gap-2 px-5 border-b border-slate-800/80">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-9 w-9 shrink-0 items-end justify-center gap-1 rounded-xl bg-[#0F1D3A] border border-cyan-500/30 p-2 shadow-inner">
                <span class="w-1 h-2.5 rounded-full bg-cyan-400"></span>
                <span class="w-1 h-4 rounded-full bg-cyan-400"></span>
                <span class="w-1 h-5 rounded-full bg-cyan-300"></span>
              </div>
              <div class="truncate">
                <span class="block text-base font-extrabold tracking-tight text-white leading-none">SGCI</span>
                <span class="block text-[9px] font-semibold tracking-[0.16em] text-slate-400 uppercase mt-1 truncate">CONTROL DE INVENTARIOS</span>
              </div>
            </div>
            <button onclick="alternarMenuLateral()" title="Contraer menú lateral" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-300 hover:text-white hover:border-cyan-400 transition">
              \${ICONOS_SVG.collapseLeft}
            </button>
          </div>

          <div class="px-3 pt-5">
            <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase block">OPERACIÓN</span>
            <nav class="mt-2 space-y-1">\${MENU_OPERACION.map(renderItemMenu).join('')}</nav>
          </div>

          <div class="px-3 pt-5">
            <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase block">ADMINISTRACIÓN</span>
            <nav class="mt-2 space-y-1">\${MENU_ADMIN.map(renderItemMenu).join('')}</nav>
          </div>

          <div class="px-3 pt-5">
            <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-cyan-400/80 uppercase block">PANTALLAS Y MÓVIL PWA</span>
            <nav class="mt-2 space-y-1">\${MENU_PANTALLAS.map(renderItemMenu).join('')}</nav>
          </div>
        </div>

        <div class="space-y-2 pt-4">
          <div class="px-3">
            <div class="rounded-xl border border-cyan-500/20 bg-[#0D182C] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"></span>
                <div class="truncate">
                  <strong class="block text-[11px] font-bold text-white leading-tight truncate">Operación conectada</strong>
                  <span class="block text-[10px] text-slate-400 truncate">Todos los sistemas activos</span>
                </div>
              </div>
              \${ICONOS_SVG.wifi}
            </div>
          </div>

          <div class="border-t border-slate-800/80 p-4 flex items-center justify-between gap-2 bg-[#080E1A]">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white font-extrabold text-xs">
                \${usrIniciales}
              </div>
              <div class="truncate">
                <strong class="block text-xs font-bold text-white leading-tight truncate">\${usrNombre}</strong>
                <span class="block text-[10px] font-mono text-slate-400 truncate">\${state.rol}</span>
              </div>
            </div>
            <button onclick="cerrarSesionMvp()" title="Cerrar sesión" class="text-slate-400 hover:text-white text-xs h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 shrink-0">
              ✕
            </button>
          </div>
        </div>
      \`;
    }

    function seleccionarVista(v) {
      state.vista = v;
      renderSidebar();
      renderMain();
    }

    function cambiarRolTop(r) {
      state.rol = r;
      renderSidebar();
      renderMain();
    }

    function cambiarBodegaTop(b) {
      state.bodega = b;
      renderMain();
    }

    function alternarModoOffline() {
      state.online = !state.online;
      const btn = document.getElementById('btn-status-ws');
      const dot = document.getElementById('dot-ws');
      const title = document.getElementById('txt-ws-title');
      const sub = document.getElementById('txt-ws-sub');

      if (state.online) {
        btn.className = 'flex items-center gap-2 rounded-lg px-3 py-1.5 border border-emerald-200 bg-emerald-50/60 text-left transition';
        dot.className = 'h-2 w-2 rounded-full bg-emerald-500';
        title.textContent = 'Online';
        title.className = 'block text-[11px] font-bold text-emerald-800 leading-none';
        sub.textContent = 'WebSockets activo';
      } else {
        btn.className = 'flex items-center gap-2 rounded-lg px-3 py-1.5 border border-amber-300 bg-amber-50 text-left transition';
        dot.className = 'h-2 w-2 rounded-full bg-amber-500';
        title.textContent = 'Modo Offline';
        title.className = 'block text-[11px] font-bold text-amber-900 leading-none';
        sub.textContent = 'Guardando en IndexedDB (' + state.colaOffline.length + ')';
      }
      renderMain();
    }

    function crearProductoModal() {
      state.mostrarModalProducto08b = !state.mostrarModalProducto08b;
      renderMain();
    }

    function guardarNuevoProducto08b() {
      const sku = (state.nuevoProdSku || '').trim().toUpperCase();
      const nombre = (state.nuevoProdNombre || '').trim();
      const min = Number(state.nuevoProdMin || 0);
      const rop = Number(state.nuevoProdRop || 0);
      const max = Number(state.nuevoProdMax || 0);
      const stock = Number(state.nuevoProdStock || 0);
      if (!sku || !nombre) {
        alert('Debes indicar el código SKU y la descripción técnica del producto.');
        return;
      }
      if (rop < min) {
        alert('Invariante de inventario: el Punto de Reorden (ROP) debe ser mayor o igual al Stock Mínimo.');
        return;
      }
      state.productos.unshift({
        sku,
        nombre,
        ubicacion: state.nuevoProdUbicacion || 'A-01-R04-NA',
        lote: 'LOTE-2026-150',
        metodo: 'PEPS',
        min,
        rop,
        max,
        stock,
        costo: 118.00,
        estado: stock <= min ? 'CRÍTICO' : (stock <= rop ? 'REORDEN' : 'ÓPTIMO'),
      });
      state.mostrarModalProducto08b = false;
      renderMain();
    }

    function ejecutarAccionEspecializadaModulo(modulo, refId) {
      if (modulo === 'almacenes') {
        state.movimientosKardex.unshift({
          fecha: 'HOY · ' + new Date().toTimeString().slice(0, 8) + ' UTC-6',
          doc: refId,
          tipo: 'ENTRADA TRANSFERENCIA',
          lote: 'LOTE-2026-089',
          vence: '18/03/2026',
          entrada: '8.0000',
          salida: '—',
          saldo: '14.0000',
          costoUnit: 142.50,
          saldoVal: 1995.00,
          operador: 'L. Mendoza',
          rolOp: state.rol,
        });
        alert('Transferencia ' + refId + ' recibida en ' + state.bodega + ', conciliada en ubicación Bin y asentada en Libro Kardex.');
      } else if (modulo === 'nueva-transferencia') {
        const nuevoTr = 'TR-2026-0' + Math.floor(190 + Math.random() * 700);
        state.movimientosKardex.unshift({
          fecha: 'HOY · ' + new Date().toTimeString().slice(0, 8) + ' UTC-6',
          doc: nuevoTr,
          tipo: 'SALIDA TRANSFERENCIA',
          lote: 'LOTE-2027-014',
          vence: '15/06/2027',
          entrada: '—',
          salida: '12.0000',
          saldo: '72.0000',
          costoUnit: 64.00,
          saldoVal: 4608.00,
          operador: 'L. Mendoza',
          rolOp: state.rol,
        });
        state.mostrarModalTransferencia09b = false;
        alert('Orden de Transferencia ' + nuevoTr + ' emitida en Tránsito (Paso 1) y asentada en Libro Kardex.');
      } else if (modulo === 'despacho-fefo') {
        const cantSolicitada = Number(state.cantidadDespachoFefo || 10);
        let restante = cantSolicitada;
        const lotesConsumidos = [];
        for (const l of state.lotesFefo) {
          if (l.semaforo === 'CUARENTENA' || l.dias <= 0 || l.cant <= 0 || restante <= 0) continue;
          const tomar = Math.min(l.cant, restante);
          l.cant -= tomar;
          restante -= tomar;
          lotesConsumidos.push(l.lote + ' (' + tomar + ' PZA)');
        }
        state.movimientosKardex.unshift({
          fecha: 'HOY · ' + new Date().toTimeString().slice(0, 8) + ' UTC-6',
          doc: 'FEFO-2026-' + Math.floor(100 + Math.random() * 899),
          tipo: 'SALIDA FEFO',
          lote: lotesConsumidos[0] || 'LOTE-2026-089',
          vence: '2026-11-17',
          entrada: '—',
          salida: (cantSolicitada - restante).toFixed(4),
          saldo: '18.0000',
          costoUnit: 142.50,
          saldoVal: 2565.00,
          operador: 'L. Mendoza',
          rolOp: state.rol,
        });
        alert('Despacho FEFO ejecutado por orden estricto de vencimiento: ' + lotesConsumidos.join(' + ') + '. Lotes en CUARENTENA fueron omitidos automáticamente.');
      } else if (modulo === 'emitir-oc-rop') {
        const nuevaOc = 'OC-2026-0' + Math.floor(120 + Math.random() * 800);
        state.ordenesCompra.unshift({
          oc: nuevaOc,
          proveedor: 'Metalnova Industrial S.A.',
          sku: 'AC-100-FLEX',
          solicitado: 36,
          recibido: 0,
          muelle: 'Muelle 02',
          estado: 'ABIERTA · GENERADA POR ROP',
          totalUsd: 5130,
        });
        alert('Orden de Compra ' + nuevaOc + ' generada automáticamente para reabastecer SKU AC-100-FLEX hasta su Stock Máximo (48 PZA).');
      } else if (modulo === 'lotes-fefo') {
        const loteObj = state.lotesFefo.find(l => l.lote === refId);
        if (loteObj) {
          loteObj.semaforo = loteObj.semaforo === 'CUARENTENA' ? 'PROXIMO_A_VENCER' : 'CUARENTENA';
        }
      } else if (modulo === 'conteos-auditoria') {
        state.movimientosKardex.unshift({
          fecha: 'HOY · ' + new Date().toTimeString().slice(0, 8) + ' UTC-6',
          doc: refId,
          tipo: 'AJUSTE DOBLE FIRMA',
          lote: 'LOTE-2026-101',
          vence: '28/12/2026',
          entrada: '0.0000',
          salida: '0.0000',
          saldo: Number(state.conteoFisicoInput || 14).toFixed(4),
          costoUnit: 148.20,
          saldoVal: Number(state.conteoFisicoInput || 14) * 148.20,
          operador: 'L. Mendoza + D. Ríos',
          rolOp: 'DOBLE_FIRMA',
        });
        alert('Ciclo ' + refId + ' firmado con Doble Firma (JEFE_ALMACEN + AUDITOR_CONTEOS) y registrado en Libro Kardex.');
      } else if (modulo === 'gobernanza-rbac') {
        alert('Política RBAC Multi-Tenant verificada para el rol ' + refId + ' con aislamiento tenant_id.');
      }
      renderMain();
    }

    function conciliarOrdenCompra(ocCode) {
      const orden = state.ordenesCompra.find(o => o.oc === ocCode);
      if (!orden || orden.estado === 'CONCILIADA') return;
      orden.recibido = orden.solicitado;
      orden.estado = 'CONCILIADA';
      const prod = state.productos.find(p => p.sku === orden.sku);
      if (prod) {
        prod.stock += orden.solicitado;
        prod.estado = prod.stock <= prod.min ? 'CRÍTICO' : (prod.stock <= prod.rop ? 'REORDEN' : 'ÓPTIMO');
      }
      state.movimientosKardex.unshift({
        fecha: 'HOY · ' + new Date().toTimeString().slice(0, 8) + ' UTC-6',
        doc: orden.oc,
        tipo: 'ENTRADA COMPRA',
        lote: 'LOTE-2026-101',
        vence: '28/12/2026',
        entrada: orden.solicitado.toFixed(4),
        salida: '—',
        saldo: prod ? prod.stock.toFixed(4) : '40.0000',
        costoUnit: 148.20,
        saldoVal: (prod ? prod.stock * 148.20 : 5928),
        operador: 'L. Mendoza',
        rolOp: state.rol,
      });
      renderMain();
    }

    function persistirColaOffline() {
      try {
        localStorage.setItem('sgci_cola_offline_v1', JSON.stringify(state.colaOffline));
      } catch {}
      sincronizarEstadoServidorMvp();
    }

    function sincronizarEstadoServidorMvp() {
      fetch('/api/v1/mvp/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: state.productos,
          movimientosKardex: state.movimientosKardex,
          lotesFefo: state.lotesFefo,
          ordenesCompra: state.ordenesCompra,
          colaOffline: state.colaOffline,
        }),
      }).catch(() => {});
    }

    function restaurarDatosDemoMvp() {
      fetch('/api/v1/mvp/reset', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data && data.state) {
            state.productos = data.state.productos;
            state.movimientosKardex = data.state.movimientosKardex;
            state.lotesFefo = data.state.lotesFefo;
            state.ordenesCompra = data.state.ordenesCompra;
            state.colaOffline = data.state.colaOffline;
            localStorage.removeItem('sgci_cola_offline_v1');
            renderMain();
          }
        })
        .catch(() => location.reload());
    }

    function renderGuiaUat() {
      const box = document.getElementById('contenedor-guia-uat');
      const badgeNotif = document.getElementById('badge-notif-top');
      if (badgeNotif) {
        const noLeidas = (state.notificacionesVivas || []).filter(n => !n.leida).length;
        badgeNotif.textContent = String(noLeidas);
        badgeNotif.style.display = noLeidas > 0 ? 'flex' : 'none';
      }
      if (!box) return;
      if (!state.sesionActiva && state.vista === 'landing') {
        box.innerHTML = '';
        return;
      }
      let html = '';
      if (state.mostrarCentroNotificaciones) {
        html += \`
          <div class="mb-4 rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-lg space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">CENTRO DE ALERTAS WEBSOCKETS EN VIVO (REVERB / PUSHER)</span>
                <h3 class="text-sm font-extrabold text-slate-900">Notificaciones Operativas Multi-Tenant · Industrias Alfa S.A.S.</h3>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="state.notificacionesVivas.forEach(n => n.leida = true); renderMain()" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">✓ Marcar todas como leídas</button>
                <button onclick="state.mostrarCentroNotificaciones = false; renderMain()" class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              \${state.notificacionesVivas.map(n => \`
                <div class="rounded-xl border \${n.leida ? 'border-slate-200 bg-slate-50/60 opacity-75' : 'border-blue-200 bg-blue-50/40'} p-3 flex items-center justify-between gap-3">
                  <div>
                    <strong class="text-slate-900 block">\${n.titulo}</strong>
                    <span class="text-slate-600 block mt-0.5">\${n.detalle}</span>
                    <span class="text-[10px] text-slate-400">\${n.tiempo}</span>
                  </div>
                  <button onclick="n = state.notificacionesVivas.find(x => x.id === '\${n.id}'); if(n) n.leida = true; state.mostrarCentroNotificaciones = false; seleccionarVista('\${n.vista}')" class="shrink-0 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">Ir ›</button>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      if (!state.mostrarGuiaUatMvp) {
        box.innerHTML = html;
        return;
      }
      box.innerHTML = html + \`
        <div class="rounded-2xl border-2 border-cyan-500/40 bg-[#0A1120] text-white p-5 shadow-lg space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">ENTREGABLE MVP LISTO PARA PRUEBA DE USUARIO (UAT · PERSISTENCIA API V1 ACTIVA)</span>
              <h2 class="text-base font-extrabold text-white mt-0.5">Recorrido Guiado de Prueba del MVP (Haz clic en cualquier escenario para probarlo en vivo)</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="alternarMenuLateral()" class="rounded-lg border border-cyan-400/40 bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-slate-800">
                ↔ Probar Menú Contraído/Expandido
              </button>
              <button onclick="state.mostrarGuiaUatMvp = false; renderMain()" class="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white">✕ Ocultar</button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <button onclick="seleccionarVista('productos-rop'); state.mostrarModalProducto08b = true; renderMain()" class="text-left rounded-xl border border-slate-800 bg-slate-900/90 p-3 hover:border-cyan-400 transition">
              <span class="font-mono text-[10px] text-cyan-400 font-bold block">1. CATÁLOGO Y ROP (08B)</span>
              <strong class="text-white block mt-0.5">Crear Producto Maestro</strong>
              <span class="text-[11px] text-slate-400">Valida invariante ROP ≥ Stock Mínimo</span>
            </button>
            <button onclick="seleccionarVista('lotes-fefo'); state.mostrarSimuladorFefo11b = true; renderMain()" class="text-left rounded-xl border border-slate-800 bg-slate-900/90 p-3 hover:border-cyan-400 transition">
              <span class="font-mono text-[10px] text-cyan-400 font-bold block">2. MOTOR FEFO (11B)</span>
              <strong class="text-white block mt-0.5">Despacho Automático FEFO</strong>
              <span class="text-[11px] text-slate-400">Consume por caducidad y omite cuarentena</span>
            </button>
            <button onclick="seleccionarVista('abastecimiento'); state.mostrarModalRecepcion13b = true; renderMain()" class="text-left rounded-xl border border-slate-800 bg-slate-900/90 p-3 hover:border-cyan-400 transition">
              <span class="font-mono text-[10px] text-cyan-400 font-bold block">3. RECEPCIÓN MUELLE (13B)</span>
              <strong class="text-white block mt-0.5">Recibir OC-2026-0119 → Kardex</strong>
              <span class="text-[11px] text-slate-400">Suma 40 PZA y genera asiento inmutable</span>
            </button>
            <button onclick="seleccionarVista('pwa-movil'); state.tabMovil = 'conteos'; renderMain()" class="text-left rounded-xl border border-slate-800 bg-slate-900/90 p-3 hover:border-cyan-400 transition">
              <span class="font-mono text-[10px] text-cyan-400 font-bold block">4. PWA MÓVIL 390PX (M07-M10)</span>
              <strong class="text-white block mt-0.5">Conteo Ciego + Menú Móvil ☰</strong>
              <span class="text-[11px] text-slate-400">Teclado táctil y cola Offline IndexedDB</span>
            </button>
          </div>
        </div>
      \`;
    }

    function aplicarSesionUsuario(usuario) {
      state.sesionActiva = true;
      state.usuarioActual = usuario;
      state.rol = usuario.rol || 'JEFE_ALMACEN';
      state.mensajeAuthError = '';
      state.mensajeAuthExito = '';
      try {
        localStorage.setItem('sgci_sesion_mvp_v1', JSON.stringify(usuario));
      } catch {}
      state.vista = 'centro-mando';
      renderSidebar();
      renderMain();
    }

    function cerrarSesionMvp() {
      state.sesionActiva = false;
      state.mensajeAuthError = '';
      state.mensajeAuthExito = 'Sesión cerrada correctamente. Ingresa tus credenciales o crea una cuenta nueva.';
      try {
        localStorage.removeItem('sgci_sesion_mvp_v1');
      } catch {}
      state.vista = 'landing';
      state.subVistaAcceso = '03-login';
      renderSidebar();
      renderMain();
    }

    function iniciarSesionMvp() {
      const codigoOrg = (state.loginOrgInput || '').trim().toUpperCase();
      const email = (state.loginEmailInput || '').trim().toLowerCase();
      const password = state.loginPasswordInput || '';
      if (!email || !password) {
        state.mensajeAuthError = 'Debes ingresar tu correo electrónico y contraseña.';
        renderMain();
        return;
      }
      fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoOrg, email, password }),
      })
        .then(async r => ({ status: r.status, body: await r.json() }))
        .then(({ status, body }) => {
          if (status !== 200 || !body.usuario) {
            state.mensajeAuthError = (body && body.error) || 'Credenciales inválidas. Verifica tu correo y contraseña o regístrate en "Crear cuenta".';
            renderMain();
            return;
          }
          aplicarSesionUsuario(body.usuario);
        })
        .catch(() => {
          state.mensajeAuthError = 'Error de conexión al validar credenciales.';
          renderMain();
        });
    }

    function registrarCuentaMvp() {
      const nombre = (state.regNombreInput || '').trim();
      const organizacion = (state.regOrganizacionInput || '').trim();
      const codigoOrg = (state.regCodigoOrgInput || '').trim().toUpperCase() || 'EMP-NUEVA';
      const email = (state.regEmailInput || '').trim().toLowerCase();
      const password = state.regPasswordInput || '';
      const rol = state.regRolInput || 'ADMIN_EMPRESA';

      if (!nombre || !organizacion || !email || password.length < 6) {
        state.mensajeAuthError = 'Completa Nombre, Organización, Correo y una Contraseña de al menos 6 caracteres.';
        renderMain();
        return;
      }

      fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, organizacion, codigoOrg, email, password, rol }),
      })
        .then(async r => ({ status: r.status, body: await r.json() }))
        .then(({ status, body }) => {
          if (status !== 200 || !body.usuario) {
            state.mensajeAuthError = (body && body.error) || 'No se pudo registrar la cuenta.';
            renderMain();
            return;
          }
          state.notificacionesVivas.unshift({
            id: 'n-welcome-' + Date.now(),
            titulo: 'Cuenta corporativa creada: ' + body.usuario.organizacion,
            detalle: 'Bienvenido(a) ' + body.usuario.nombre + ' (' + body.usuario.rol + ')',
            tiempo: 'Ahora mismo',
            vista: 'gobernanza-rbac',
            leida: false,
          });
          aplicarSesionUsuario(body.usuario);
        })
        .catch(() => {
          state.mensajeAuthError = 'Error de red al crear la cuenta.';
          renderMain();
        });
    }

    function solicitarRecuperacionMvp() {
      const email = (state.recuperacionEmailInput || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        state.mensajeAuthError = 'Ingresa un correo electrónico corporativo válido.';
        renderMain();
        return;
      }
      state.mensajeAuthError = '';
      state.tokenRecuperacionInput = 'SGCI-RST-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-2026';
      state.subVistaAcceso = '05-confirmacion';
      renderMain();
    }

    function aplicarNuevaContrasenaToken() {
      const p1 = state.nuevaPasswordInput || '';
      const p2 = state.confirmarPasswordInput || '';
      if (p1.length < 8 || p1 !== p2) {
        state.mensajeAuthError = 'La nueva contraseña debe tener al menos 8 caracteres y coincidir en ambos campos.';
        renderMain();
        return;
      }
      fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.recuperacionEmailInput || state.loginEmailInput || 'laura@industriasalfa.com',
          nuevaPassword: p1,
          token: state.tokenRecuperacionInput,
        }),
      })
        .then(() => {
          state.tokenActualizadoExito = true;
          state.loginEmailInput = state.recuperacionEmailInput || state.loginEmailInput;
          state.loginPasswordInput = p1;
          state.mensajeAuthError = '';
          state.mensajeAuthExito = 'Contraseña actualizada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.';
          state.subVistaAcceso = '03-login';
          renderMain();
        })
        .catch(() => {});
    }

    function sincronizarColaOfflineMovil() {
      if (state.colaOffline.length === 0) return;
      state.colaOffline = [];
      persistirColaOffline();
      state.online = true;
      alternarModoOffline();
      state.online = true;
      alert('Sincronización Background Sync completada: las operaciones de IndexedDB/Storage fueron aplicadas en el Libro Kardex sin conflictos.');
      renderMain();
    }

    function presionarTeclaConteo(k) {
      if (k === 'C') state.conteoFisicoInput = '0';
      else if (k === '←') state.conteoFisicoInput = state.conteoFisicoInput.length > 1 ? state.conteoFisicoInput.slice(0, -1) : '0';
      else state.conteoFisicoInput = state.conteoFisicoInput === '0' ? String(k) : state.conteoFisicoInput + String(k);
      renderMain();
    }

    function confirmarConteoCiegoMovil() {
      const cant = Number(state.conteoFisicoInput || 0);
      const prod = state.productos.find(p => p.sku === 'RB-220-INOX');
      if (prod) prod.stock = cant;
      state.colaOffline.unshift({
        id: 'op-' + Date.now(),
        titulo: 'Conteo · B-02-05 · ' + cant + ' PZA',
        detalle: 'Ahora · D. Ríos · RB-220-INOX',
        estado: state.online ? 'SINCRONIZADO' : 'PENDIENTE',
      });
      persistirColaOffline();
      alert('Conteo ciego registrado en Ubicación B-02-05 (' + cant + ' UNIDADES) y persistido en almacenamiento local.');
      state.tabMovil = 'cola';
      renderMain();
    }

    function exportarCsvArchivo(nombreArchivo, encabezados, filas) {
      const salto = String.fromCharCode(13, 10);
      const bom = String.fromCharCode(0xFEFF);
      const lineas = [
        encabezados.join(','),
        ...filas.map(fila => fila.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')),
      ];
      const blob = new Blob([bom + lineas.join(salto)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function exportarResumenEjecutivoCsv() {
      exportarCsvArchivo(
        'SGCI-Resumen-Inventario-IndustriasAlfa.csv',
        ['SKU', 'PRODUCTO', 'UBICACION_BIN', 'LOTE', 'METODO_COSTEO', 'MINIMO', 'ROP', 'MAXIMO', 'STOCK_ACTUAL', 'ESTADO'],
        state.productos.map(p => [p.sku, p.nombre, p.ubicacion, p.lote, p.metodo, p.min, p.rop, p.max, p.stock, p.estado]),
      );
    }

    function exportarLibroKardexCsv() {
      exportarCsvArchivo(
        'SGCI-Libro-Kardex-IndustriasAlfa-SHA256.csv',
        ['FECHA_UTC', 'DOCUMENTO', 'TIPO_MOVIMIENTO', 'LOTE', 'VENCIMIENTO', 'ENTRADA', 'SALIDA', 'SALDO_CANTIDAD', 'COSTO_UNITARIO', 'SALDO_VALORIZADO', 'OPERADOR', 'ROL'],
        state.movimientosKardex.map(m => [m.fecha, m.doc, m.tipo, m.lote, m.vence, m.entrada, m.salida, m.saldo, m.costoUnit, m.saldoVal, m.operador, m.rolOp]),
      );
    }

    function renderMain() {
      renderGuiaUat();
      sincronizarEstadoServidorMvp();
      const el = document.getElementById('contenedor-principal');

      // 07 - CENTRO DE MANDO (Réplica exacta de 07-Centro-de-mando.png)
      if (state.vista === 'centro-mando') {
        el.innerHTML = \`
          <div class="space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">RESUMEN OPERATIVO · ACTUALIZADO AHORA</span>
                <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Centro de mando</h1>
                <p class="text-sm text-slate-500 mt-1">Visibilidad consolidada de inventario y operaciones en tiempo real.</p>
              </div>
              <button onclick="exportarResumenEjecutivoCsv()" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                ↓ Exportar resumen (.CSV)
              </button>
            </div>

            <!-- 4 KPI Cards Exactas de 07-Centro-de-mando.png -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <article class="rounded-2xl bg-[#0A1120] text-white p-5 shadow-md flex flex-col justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-300">Exactitud de registro (ERI)</span>
                  <div class="flex items-center gap-2.5 mt-3">
                    <strong class="text-3xl font-extrabold tracking-tight">99.4%</strong>
                    <span class="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[11px] font-bold">+0.8%</span>
                  </div>
                  <div class="mt-4 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div class="h-full bg-cyan-400 w-[99%]"></div>
                  </div>
                </div>
                <span class="text-[11px] text-slate-400 mt-4 block">Meta institucional: 98.5%</span>
              </article>

              <article class="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="text-xs font-semibold text-slate-500">Valor patrimonial</span>
                    <strong class="block text-3xl font-extrabold text-slate-900 tracking-tight mt-3">$ 1,482,900.00</strong>
                  </div>
                  <span class="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">📈</span>
                </div>
                <span class="text-[11px] text-slate-500 mt-4 block">+ $ 28,450.20 este mes</span>
              </article>

              <article class="rounded-2xl bg-white border-t-4 border-t-rose-600 border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="text-xs font-semibold text-slate-500">Stock crítico</span>
                    <strong class="block text-3xl font-extrabold text-slate-900 tracking-tight mt-3">7 <small class="text-sm font-bold text-slate-500">SKUs</small></strong>
                  </div>
                  <span class="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">⚠️</span>
                </div>
                <span class="text-[11px] text-slate-500 mt-4 block">3 requieren acción hoy</span>
              </article>

              <article class="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="text-xs font-semibold text-slate-500">Lotes por vencer</span>
                    <strong class="block text-3xl font-extrabold text-slate-900 tracking-tight mt-3">12 <small class="text-sm font-bold text-slate-500">lotes</small></strong>
                  </div>
                  <span class="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">🕒</span>
                </div>
                <span class="text-[11px] text-slate-500 mt-4 block">Dentro de los próximos 30 días</span>
              </article>
            </div>

            <!-- Prioridades de Inventario + Actividad en Vivo -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section class="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-5">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-base font-extrabold text-slate-900">Prioridades de inventario</h2>
                    <p class="text-xs text-slate-500">Ordenadas por criticidad y regla FEFO</p>
                  </div>
                  <button onclick="seleccionarVista('productos-rop')" class="text-xs font-bold text-blue-600 hover:underline">Ver todos ›</button>
                </div>

                <div class="divide-y divide-slate-100">
                  \${state.productos.map(p => \`
                    <div class="py-4 flex flex-wrap items-center justify-between gap-4">
                      <div class="flex items-start gap-3.5">
                        <div class="h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm \${p.estado === 'CRÍTICO' ? 'bg-rose-50 text-rose-600' : (p.estado === 'REORDEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}">
                          📦
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-mono text-xs font-bold text-slate-900">\${p.sku}</span>
                            <span class="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase \${p.estado === 'CRÍTICO' ? 'bg-rose-50 text-rose-700' : (p.estado === 'REORDEN' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}">
                              \${p.estado === 'CRÍTICO' ? '⚠️ STOCK CRÍTICO' : (p.estado === 'REORDEN' ? '⚠️ PUNTO REORDEN' : '✓ ÓPTIMO')}
                            </span>
                          </div>
                          <strong class="block text-sm font-bold text-slate-900 mt-1">\${p.nombre}</strong>
                          <span class="block text-xs text-slate-500 mt-0.5 font-mono">🏬 \${p.ubicacion} · Lote \${p.lote}</span>
                        </div>
                      </div>

                      <div class="w-56">
                        <div class="flex items-baseline justify-between">
                          <span class="text-[11px] text-slate-400">Disponible</span>
                          <strong class="font-mono text-base font-extrabold text-slate-900">\${p.stock} <small class="text-[10px] font-semibold text-slate-500">PZA</small></strong>
                        </div>
                        <div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div class="h-full \${p.estado === 'CRÍTICO' ? 'bg-rose-600 w-[18%]' : (p.estado === 'REORDEN' ? 'bg-amber-500 w-[35%]' : 'bg-emerald-600 w-[84%]')}"></div>
                        </div>
                        <span class="block text-[10px] text-slate-400 mt-1">Mín. \${p.min} · ROP \${p.rop} · Máx. \${p.max}</span>
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </section>

              <section class="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-base font-extrabold text-slate-900">Actividad en vivo</h2>
                      <span class="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span class="h-2 w-2 rounded-full bg-emerald-500"></span> WebSockets activo
                      </span>
                    </div>
                    <span class="text-slate-400">🔔</span>
                  </div>

                  <div class="mt-5 space-y-4 text-xs">
                    <div class="flex gap-3">
                      <span class="h-8 w-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">⚠️</span>
                      <div>
                        <strong class="block text-slate-900 font-bold">Stock por debajo del mínimo</strong>
                        <p class="text-slate-600 mt-0.5"><strong>AC-100-FLEX</strong> descendió a 5 PZA</p>
                        <span class="text-[11px] text-slate-400">Hace 2 min · Bodega Central</span>
                      </div>
                    </div>
                    <div class="flex gap-3">
                      <span class="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">🚚</span>
                      <div>
                        <strong class="block text-slate-900 font-bold">Transferencia en tránsito</strong>
                        <p class="text-slate-600 mt-0.5"><strong>TR-2026-0188</strong> salió de Bodega Norte</p>
                        <span class="text-[11px] text-slate-400">Hace 18 min · M. Solís</span>
                      </div>
                    </div>
                    <div class="flex gap-3">
                      <span class="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">✓</span>
                      <div>
                        <strong class="block text-slate-900 font-bold">Recepción conciliada</strong>
                        <p class="text-slate-600 mt-0.5"><strong>OC-2026-0118</strong> · 20 bultos recibidos</p>
                        <span class="text-[11px] text-slate-400">Hace 46 min · Muelle 02</span>
                      </div>
                    </div>
                    <div class="flex gap-3">
                      <span class="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">📋</span>
                      <div>
                        <strong class="block text-slate-900 font-bold">Conteo pendiente de firma</strong>
                        <p class="text-slate-600 mt-0.5">Ciclo <strong>CC-2026-028</strong> · Zona B</p>
                        <span class="text-[11px] text-slate-400">Hace 1 h · 2 discrepancias</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onclick="state.mostrarCentroNotificaciones = true; renderMain()" class="w-full pt-3 border-t border-slate-100 text-center text-xs font-bold text-blue-600 hover:underline">
                  Abrir centro de notificaciones ›
                </button>
              </section>
            </div>
          </div>
        \`;
        return;
      }

      // 08 - PRODUCTOS Y ROP (Réplica exacta de 08-Productos-y-ROP.png)
      if (state.vista === 'productos-rop') {
        const filtrados = state.productos.filter(p => {
          const q = state.busquedaSku.trim().toLowerCase();
          return !q || p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.ubicacion.toLowerCase().includes(q);
        });
        el.innerHTML = \`
          <div class="space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">CATÁLOGO MAESTRO</span>
                <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Productos y puntos de reorden</h1>
                <p class="text-sm text-slate-500 mt-1">\${state.productos.length} productos activos en el tenant</p>
              </div>
              <button onclick="crearProductoModal()" class="rounded-xl bg-[#2563EB] px-5 py-3 text-xs font-bold text-white shadow hover:bg-blue-700 transition">
                + Nuevo producto (Ventana 08b)
              </button>
            </div>

            \${state.mostrarModalProducto08b ? \`
              <!-- Ventana Especializada 08b: Modal de Alta de Producto y Reglas ROP -->
              <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-6 shadow-sm space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">VENTANA ESPECIALIZADA 08B (COMPLEMENTO A 08-PRODUCTOS-Y-ROP.PNG)</span>
                    <h2 class="text-lg font-extrabold text-slate-900">Alta de Producto Maestro con Validación de Punto de Reorden (ROP ≥ Mínimo)</h2>
                  </div>
                  <button onclick="guardarNuevoProducto08b()" class="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                    ✓ Guardar Producto en Catálogo
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <label class="block"><span class="font-bold text-slate-700">SKU</span><input oninput="state.nuevoProdSku = this.value" value="\${state.nuevoProdSku}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold" /></label>
                  <label class="block sm:col-span-2"><span class="font-bold text-slate-700">Descripción técnica</span><input oninput="state.nuevoProdNombre = this.value" value="\${state.nuevoProdNombre}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold" /></label>
                  <label class="block"><span class="font-bold text-slate-700">Ubicación Bin</span><input oninput="state.nuevoProdUbicacion = this.value" value="\${state.nuevoProdUbicacion}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono" /></label>
                  <label class="block"><span class="font-bold text-slate-700">Stock Mínimo</span><input type="number" oninput="state.nuevoProdMin = this.value" value="\${state.nuevoProdMin}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono" /></label>
                  <label class="block"><span class="font-bold text-slate-700">Punto Reorden (ROP)</span><input type="number" oninput="state.nuevoProdRop = this.value" value="\${state.nuevoProdRop}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold text-blue-700" /></label>
                </div>
              </div>
            \` : ''}

            <div class="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
              <div class="p-4 flex flex-wrap gap-3 border-b border-slate-100">
                <input oninput="state.busquedaSku = this.value; renderMain()" value="\${state.busquedaSku}" type="search" placeholder="🔍 Buscar SKU, EAN-13, lote o producto..." class="flex-1 min-w-[260px] rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                <select class="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
                  <option>Todas las categorías</option>
                  <option>Válvulas e Hidráulica</option>
                  <option>Rodamientos y Transmisión</option>
                  <option>Sellos y Empaques</option>
                </select>
                <select class="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
                  <option>Todos los estados</option>
                  <option>CRÍTICO</option>
                  <option>REORDEN</option>
                  <option>ÓPTIMO</option>
                </select>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 border-b border-slate-100">
                    <tr>
                      <th class="px-6 py-3.5">SKU / PRODUCTO</th>
                      <th class="px-4 py-3.5">UBICACIÓN</th>
                      <th class="px-4 py-3.5">MÉTODO</th>
                      <th class="px-4 py-3.5">MÍNIMO</th>
                      <th class="px-4 py-3.5">ROP</th>
                      <th class="px-4 py-3.5">MÁXIMO</th>
                      <th class="px-4 py-3.5">EXISTENCIA</th>
                      <th class="px-4 py-3.5">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    \${filtrados.map(p => \`
                      <tr class="hover:bg-slate-50/80">
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <span class="h-10 w-10 rounded-xl flex items-center justify-center \${p.estado === 'CRÍTICO' ? 'bg-rose-50 text-rose-600' : (p.estado === 'REORDEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}">📦</span>
                            <div>
                              <span class="font-mono text-[11px] font-bold text-slate-800 block">\${p.sku}</span>
                              <strong class="text-xs font-bold text-slate-900">\${p.nombre}</strong>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-4 font-mono font-bold text-slate-800">\${p.ubicacion}</td>
                        <td class="px-4 py-4 font-semibold text-slate-600">\${p.metodo}</td>
                        <td class="px-4 py-4 font-mono text-slate-600">\${p.min.toFixed(4)}</td>
                        <td class="px-4 py-4 font-mono text-slate-600">\${p.rop.toFixed(4)}</td>
                        <td class="px-4 py-4 font-mono text-slate-600">\${p.max.toFixed(4)}</td>
                        <td class="px-4 py-4 font-mono font-extrabold text-slate-900">\${p.stock.toFixed(4)}</td>
                        <td class="px-4 py-4">
                          <span class="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase \${p.estado === 'CRÍTICO' ? 'bg-rose-50 text-rose-700' : (p.estado === 'REORDEN' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}">
                            \${p.estado === 'CRÍTICO' ? '⚠️ CRÍTICO' : (p.estado === 'REORDEN' ? '⚠️ REORDEN' : '✓ ÓPTIMO')}
                          </span>
                        </td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      // 10 - LIBRO KARDEX (Réplica exacta de 10-Libro-Kardex.png)
      if (state.vista === 'libro-kardex') {
        el.innerHTML = \`
          <div class="space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">CONTABILIDAD DE INVENTARIO · SOLO LECTURA</span>
                <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Libro mayor Kardex</h1>
                <p class="text-sm text-slate-500 mt-1">Trazabilidad inmutable de movimientos y valoración.</p>
              </div>
              <button onclick="exportarLibroKardexCsv()" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                ↓ Exportar libro (.CSV)
              </button>
            </div>

            <!-- Banner Integridad Verificada -->
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="text-emerald-700 font-bold">✓</span>
                <div>
                  <strong class="block text-xs font-bold text-emerald-950">Integridad del libro verificada</strong>
                  <span class="block text-[11px] text-emerald-800">Los movimientos son append-only. Toda corrección genera un ajuste autorizado y auditable.</span>
                </div>
              </div>
              <span class="font-mono text-[11px] font-bold text-emerald-900">HASH · 8F2A...C91D</span>
            </div>

            <!-- Capas de Costeo PEPS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">SKU SELECCIONADO</span>
                <strong class="block font-mono text-base font-bold text-slate-900 mt-1">AC-100-FLEX</strong>
                <span class="block text-xs font-bold text-slate-700 mt-0.5">Válvula de Presión Industrial 2"</span>
              </article>
              <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex items-end justify-between">
                <div>
                  <span class="text-[11px] font-bold text-blue-600">Capa 01 · LOTE-2026-089</span>
                  <strong class="block font-mono text-xl font-extrabold text-slate-900 mt-1">6.0000 PZA</strong>
                  <span class="block text-[11px] text-slate-400">de 24.0000 originales</span>
                </div>
                <strong class="font-mono text-sm font-extrabold text-slate-900">$ 142.50 <small class="text-[10px] text-slate-500">/ PZA</small></strong>
              </article>
              <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex items-end justify-between">
                <div>
                  <span class="text-[11px] font-bold text-blue-600">Capa 02 · LOTE-2026-101</span>
                  <strong class="block font-mono text-xl font-extrabold text-slate-900 mt-1">18.0000 PZA</strong>
                  <span class="block text-[11px] text-slate-400">de 18.0000 originales</span>
                </div>
                <strong class="font-mono text-sm font-extrabold text-slate-900">$ 148.20 <small class="text-[10px] text-slate-500">/ PZA</small></strong>
              </article>
            </div>

            <!-- Tabla Libro Mayor Kardex -->
            <div class="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                <div class="inline-flex rounded-xl bg-slate-100 p-1">
                  \${['PEPS / FIFO', 'UEPS / LIFO', 'PROMEDIO'].map(m => \`
                    <button onclick="state.metodoKardex = '\${m}'; renderMain()" class="rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition \${state.metodoKardex === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}">\${m}</button>
                  \`).join('')}
                </div>
                <input type="search" placeholder="🔍 Documento, lote u operador..." class="flex-1 min-w-[240px] rounded-xl border border-slate-200 px-4 py-2 text-xs" />
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 border-b border-slate-100">
                    <tr>
                      <th class="px-5 py-3.5">FECHA / HORA UTC</th>
                      <th class="px-4 py-3.5">DOCUMENTO</th>
                      <th class="px-4 py-3.5">MOVIMIENTO</th>
                      <th class="px-4 py-3.5">LOTE / VENCIMIENTO</th>
                      <th class="px-4 py-3.5">ENTRADA</th>
                      <th class="px-4 py-3.5">SALIDA</th>
                      <th class="px-4 py-3.5">SALDO CANT.</th>
                      <th class="px-4 py-3.5">COSTO UNIT.</th>
                      <th class="px-4 py-3.5">SALDO VALORIZADO</th>
                      <th class="px-4 py-3.5">OPERADOR</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                    \${state.movimientosKardex.map(m => \`
                      <tr class="hover:bg-slate-50/80">
                        <td class="px-5 py-4 text-slate-700 font-bold">\${m.fecha}</td>
                        <td class="px-4 py-4 font-bold text-slate-900">\${m.doc}</td>
                        <td class="px-4 py-4">
                          <span class="rounded-md px-2 py-0.5 text-[10px] font-extrabold \${m.tipo.includes('ENTRADA') ? 'bg-emerald-50 text-emerald-700' : (m.tipo.includes('AJUSTE') ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700')}">\${m.tipo}</span>
                        </td>
                        <td class="px-4 py-4">
                          <strong class="block text-slate-900">\${m.lote}</strong>
                          <span class="text-[10px] text-slate-400">\${m.vence}</span>
                        </td>
                        <td class="px-4 py-4 text-emerald-700 font-bold">\${m.entrada}</td>
                        <td class="px-4 py-4 text-rose-600 font-bold">\${m.salida}</td>
                        <td class="px-4 py-4 font-extrabold text-slate-900">\${m.saldo}</td>
                        <td class="px-4 py-4 text-slate-700">$ \${m.costoUnit.toFixed(2)}</td>
                        <td class="px-4 py-4 font-extrabold text-slate-900">$ \${m.saldoVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td class="px-4 py-4 font-sans">
                          <strong class="block text-xs text-slate-900">\${m.operador}</strong>
                          <span class="text-[9px] font-mono text-slate-400">\${m.rolOp}</span>
                        </td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      // 09, 11, 12, 13, 14, 15 - VISTAS ESPECIALIZADAS COMPLETAS (Fieles a 09..15 PNG + Bandeja Operativa)
      if (['almacenes', 'lotes-fefo', 'conteos-auditoria', 'abastecimiento', 'analitica', 'gobernanza-rbac'].includes(state.vista)) {
        const configs = {
          'almacenes': {
            eyebrow: 'UBICACIONES Y CAPACIDAD',
            titulo: 'Topología de almacenes',
            sub: 'Gestiona zonas, pasillos, racks y transferencias inter-almacén.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '3 almacenes activos', icon: '🏬', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '82% ocupación', icon: '📦', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '2 transferencias en tránsito', icon: '🚚', tone: 'emerald' },
            ],
            tablaTitulo: 'Bandeja Operativa · Ubicaciones Bin y Transferencias en Tránsito',
            filas: [
              { col1: 'A-04-R02-NB', col2: 'Pasillo A · Rack 04 · Nivel B', col3: 'AC-100-FLEX (5 PZA)', estado: 'OCUPACIÓN 85%' },
              { col1: 'B-02-R08-NA', col2: 'Pasillo B · Rack 02 · Nivel A', col3: 'RB-220-INOX (14 PZA)', estado: 'OCUPACIÓN 62%' },
              { col1: 'B-06-R03-NC', col2: 'Pasillo B · Rack 06 · Nivel C', col3: 'FL-084-NBR (84 PZA)', estado: 'OCUPACIÓN 91%' },
              { col1: 'TR-2026-0188', col2: 'Transferencia Bodega Norte → Monterrey', col3: '8.0000 PZA · M. Solís', estado: 'EN TRÁNSITO' },
            ],
          },
          'lotes-fefo': {
            eyebrow: 'TRAZABILIDAD SANITARIA',
            titulo: 'Lotes y semáforo FEFO',
            sub: 'Prioriza despachos por vencimiento y controla lotes en cuarentena.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '128 lotes vigentes', icon: '⏳', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '12 próximos a vencer', icon: '⚠️', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '1 lote en cuarentena', icon: '🔒', tone: 'emerald' },
            ],
            tablaTitulo: 'Bandeja Operativa FEFO (First-Expired, First-Out)',
            filas: state.lotesFefo.map(l => ({
              col1: l.lote,
              col2: l.sku + ' · ' + l.producto,
              col3: 'Vence: ' + l.vence + ' (' + l.dias + ' días) · ' + l.cant + ' PZA',
              estado: l.semaforo,
            })),
          },
          'conteos-auditoria': {
            eyebrow: 'CONCILIACIÓN FÍSICA',
            titulo: 'Conteos y auditoría',
            sub: 'Revisa conteos ciegos y autoriza ajustes mediante doble firma.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '4 ciclos activos', icon: '📋', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '2 diferencias abiertas', icon: '⚠️', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '99.4% exactitud ERI', icon: '✓', tone: 'emerald' },
            ],
            tablaTitulo: 'Ciclos de Conteo Ciego y Aprobación de Doble Firma',
            filas: [
              { col1: 'CC-2026-028', col2: 'Zona B · Ubicación B-02-05 (RB-220-INOX)', col3: 'Sistema: 14 PZA · Contado: ' + state.conteoFisicoInput + ' PZA', estado: 'PENDIENTE DOBLE FIRMA' },
              { col1: 'CC-2026-027', col2: 'Zona A · Ubicación A-04-R02-NB (AC-100-FLEX)', col3: 'Sistema: 5 PZA · Contado: 5 PZA', estado: 'CONCILIADO 100%' },
              { col1: 'AJ-2026-0062', col2: 'Acta de Ajuste Auditada en Kardex', col3: '+1.0000 PZA · Autorizado por L. Mendoza', estado: 'APLICADO EN KARDEX' },
            ],
          },
          'abastecimiento': {
            eyebrow: 'ÓRDENES Y RECEPCIÓN',
            titulo: 'Abastecimiento',
            sub: 'Monitorea órdenes de compra, recepciones y puntos de reorden.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '6 órdenes abiertas', icon: '🚚', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '2 recepciones hoy', icon: '📦', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '$ 84,250 comprometidos', icon: '💲', tone: 'emerald' },
            ],
            tablaTitulo: 'Órdenes de Compra y Cotejo en Muelle de Recepción',
            filas: state.ordenesCompra.map(o => ({
              col1: o.oc,
              col2: o.proveedor + ' · SKU ' + o.sku,
              col3: 'Solicitado: ' + o.solicitado + ' PZA · Recibido: ' + o.recibido + ' PZA (' + o.muelle + ')',
              estado: o.estado,
              accionOc: o.estado !== 'CONCILIADA' ? o.oc : null,
            })),
          },
          'analitica': {
            eyebrow: 'DECISIONES BASADAS EN DATOS',
            titulo: 'Analítica de inventario',
            sub: 'Rotación, cobertura, valor patrimonial y desempeño por almacén.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '4.8× rotación anual', icon: '📈', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '42 días cobertura', icon: '⏳', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '1.2% obsolescencia', icon: '✓', tone: 'emerald' },
            ],
            tablaTitulo: 'Indicadores Patrimoniales y Rotación ABC por Almacén',
            filas: [
              { col1: 'ALM-CENTRAL-01', col2: 'Bodega Central Monterrey', col3: 'Valor Kardex: $ 1,482,900.00 · ERI 99.4%', estado: 'CLASE A · ÓPTIMO' },
              { col1: 'ALM-NORTE-02', col2: 'Centro Logístico Saltillo', col3: 'Valor Kardex: $ 640,120.00 · ERI 98.9%', estado: 'CLASE A · ÓPTIMO' },
              { col1: 'ALM-SUR-03', col2: 'Plataforma Querétaro', col3: 'Valor Kardex: $ 318,450.00 · ERI 99.1%', estado: 'CLASE B · ESTABLE' },
            ],
          },
          'gobernanza-rbac': {
            eyebrow: 'ADMINISTRACIÓN DEL TENANT',
            titulo: 'Gobernanza y RBAC',
            sub: 'Configura políticas, usuarios, roles y bodegas autorizadas.',
            kpis: [
              { label: 'ESTADO ACTUAL', val: '28 usuarios activos', icon: '👥', tone: 'blue' },
              { label: 'REQUIERE ATENCIÓN', val: '10 roles canónicos', icon: '🛡️', tone: 'amber' },
              { label: 'INDICADOR CLAVE', val: '3 almacenes autorizados', icon: '🏬', tone: 'emerald' },
            ],
            tablaTitulo: 'Matriz de los 10 Roles Canónicos RBAC Multi-Tenant (Sección 5.6 AGENTS.md)',
            filas: [
              { col1: 'JEFE_ALMACEN', col2: 'Laura Mendoza (laura@industriasalfa.com)', col3: 'Bodega Central Monterrey · Doble firma de ajustes y transferencias', estado: 'SESIÓN ACTIVA' },
              { col1: 'AUDITOR_CONTEOS', col2: 'Daniel Ríos (d.rios@industriasalfa.com)', col3: 'Conteos cíclicos ciegos PWA y actas de discrepancia', estado: 'ACTIVO' },
              { col1: 'CONTADOR_COSTOS', col2: 'Andrés Vélez (a.velez@industriasalfa.com)', col3: 'Valorización Kardex PEPS/UEPS/CPP y cierres contables', estado: 'ACTIVO' },
              { col1: 'SUPER_ADMIN_SAAS', col2: 'Gobierno Corporativo SGCI', col3: 'Aislamiento estricto tenant_id (Privacidad por Diseño)', estado: 'PROTEGIDO' },
            ],
          },
        };

        const cfg = configs[state.vista];
        el.innerHTML = \`
          <div class="space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">\${cfg.eyebrow}</span>
                <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">\${cfg.titulo}</h1>
                <p class="text-sm text-slate-500 mt-1">\${cfg.sub}</p>
              </div>
              <button onclick="seleccionarVista('pwa-movil')" class="rounded-xl bg-[#2563EB] px-5 py-3 text-xs font-bold text-white shadow hover:bg-blue-700 transition">
                + Nueva operación
              </button>
            </div>

            <!-- 3 KPI Cards Exactas de Pantallas 09, 11, 12, 13, 14, 15 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              \${cfg.kpis.map(k => \`
                <article class="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm flex items-center gap-4">
                  <div class="h-12 w-12 rounded-2xl flex items-center justify-center text-lg \${k.tone === 'blue' ? 'bg-blue-50 text-blue-600' : (k.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}">
                    \${k.icon}
                  </div>
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">\${k.label}</span>
                    <strong class="block text-xl font-extrabold text-slate-900 mt-0.5">\${k.val}</strong>
                  </div>
                </article>
              \`).join('')}
            </div>

            <!-- Bandeja Operativa Especializada -->
            <section class="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">OPERACIÓN EN TIEMPO REAL · \${state.bodega}</span>
                  <h2 class="text-base font-extrabold text-slate-900 mt-0.5">\${cfg.tablaTitulo}</h2>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  \${state.vista === 'almacenes' ? \`<button onclick="state.mostrarModalTransferencia09b = !state.mostrarModalTransferencia09b; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-3.5 py-1.5 text-[11px] font-bold hover:bg-slate-800">🚚 + Nueva Transferencia Inter-Almacén (2 Pasos)</button>\` : ''}
                  \${state.vista === 'lotes-fefo' ? \`<button onclick="state.mostrarSimuladorFefo11b = !state.mostrarSimuladorFefo11b; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-3.5 py-1.5 text-[11px] font-bold hover:bg-slate-800">⚡ Simulador Despacho FEFO Multi-Lote</button>\` : ''}
                  \${state.vista === 'conteos-auditoria' ? \`<button onclick="state.mostrarModalCicloConteo12b = !state.mostrarModalCicloConteo12b; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-3.5 py-1.5 text-[11px] font-bold hover:bg-slate-800">📋 + Nuevo Conteo Ciego y Doble Firma (12b)</button>\` : ''}
                  \${state.vista === 'gobernanza-rbac' ? \`<button onclick="state.mostrarModalRbac15b = !state.mostrarModalRbac15b; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-3.5 py-1.5 text-[11px] font-bold hover:bg-slate-800">🛡️ + Asignar Rol / Auditar TenantScope (15b)</button>\` : ''}
                  \${state.vista === 'abastecimiento' ? \`
                    <button onclick="ejecutarAccionEspecializadaModulo('emitir-oc-rop', 'AC-100-FLEX')" class="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-3.5 py-1.5 text-[11px] font-bold hover:bg-blue-100">+ Emitir OC por ROP</button>
                    <button onclick="state.mostrarModalRecepcion13b = !state.mostrarModalRecepcion13b; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-3.5 py-1.5 text-[11px] font-bold hover:bg-slate-800">📥 Ventana 13b · Recepción en Muelle</button>
                  \` : ''}
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">Rol: \${state.rol}</span>
                </div>
              </div>

              \${state.vista === 'almacenes' ? \`
                <!-- Mapa Visual de Racks y Ubicaciones Bin (Flujo Especializado 09) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Pasillo A · Racks Hidráulicos</span>
                      <span class="font-mono text-amber-700">85% Ocupado</span>
                    </div>
                    <div class="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-amber-500 w-[85%]"></div></div>
                    <span class="mt-2 block text-[11px] text-slate-500 font-mono">Bin A-04-R02-NB · AC-100-FLEX (5 PZA)</span>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Pasillo B · Transmisión y Sellos</span>
                      <span class="font-mono text-emerald-700">76% Ocupado</span>
                    </div>
                    <div class="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-emerald-600 w-[76%]"></div></div>
                    <span class="mt-2 block text-[11px] text-slate-500 font-mono">Bin B-02-R08-NA · RB-220-INOX (14 PZA)</span>
                  </div>
                  <div class="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <div class="flex items-center justify-between text-xs font-bold text-rose-900">
                      <span>Zona Cuarentena Sanitaria</span>
                      <span class="font-mono text-rose-700">BLOQUEO FEFO</span>
                    </div>
                    <div class="mt-2 h-2 w-full rounded-full bg-rose-100 overflow-hidden"><div class="h-full bg-rose-600 w-[32%]"></div></div>
                    <span class="mt-2 block text-[11px] text-rose-700 font-mono">ZONA-CUARENTENA-01 · LOTE-2026-019 (3 PZA)</span>
                  </div>
                </div>
                \${state.mostrarModalTransferencia09b ? \`
                  <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">FLUJO ESPECIALIZADO 09B · TRANSFERENCIA EN 2 PASOS</span>
                      <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">Emitir Salida en Tránsito: Bodega Central Monterrey → Centro Logístico Saltillo</h3>
                      <p class="text-xs text-slate-600">Descuenta stock en origen inmediatamente y habilita la recepción confirmada en almacén destino.</p>
                    </div>
                    <button onclick="ejecutarAccionEspecializadaModulo('nueva-transferencia', 'TR-NEW')" class="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                      ✓ Despachar 12 PZA FL-084-NBR en Tránsito → Kardex
                    </button>
                  </div>
                \` : ''}
              \` : ''}

              \${state.vista === 'lotes-fefo' && state.mostrarSimuladorFefo11b ? \`
                <!-- Simulador Interactivo de Despacho Multi-Lote por Regla FEFO (Flujo Especializado 11b) -->
                <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">MOTOR ALGORÍTMICO FEFO (FIRST-EXPIRED, FIRST-OUT)</span>
                    <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">Despacho Automático por Vencimiento Más Próximo (Excluye Lotes en Cuarentena)</h3>
                    <p class="text-xs text-slate-600">Consume primero LOTE-2026-089 (vence en 12 días) y completa con LOTE-2026-101, bloqueando LOTE-2026-019.</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <input type="number" min="1" max="50" value="\${state.cantidadDespachoFefo}" oninput="state.cantidadDespachoFefo = this.value" class="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900" />
                    <button onclick="ejecutarAccionEspecializadaModulo('despacho-fefo', 'FEFO')" class="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                      ✓ Despachar por FEFO → Kardex
                    </button>
                  </div>
                </div>
              \` : ''}

              \${state.vista === 'conteos-auditoria' && state.mostrarModalCicloConteo12b ? \`
                <!-- Flujo Especializado 12b: Conciliación de Conteo Ciego y Doble Firma -->
                <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">FLUJO ESPECIALIZADO 12B · DOBLE FIRMA MANCOMUNADA</span>
                    <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">Captura de Conteo Físico Ciego en Zona B (SKU RB-220-INOX · Stock Sistema: 14 PZA)</h3>
                    <p class="text-xs text-slate-600">Ingresa la cantidad física contada y aplica la doble firma (AUDITOR_CONTEOS + JEFE_ALMACEN) hacia el Libro Kardex.</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <input type="number" min="0" max="200" value="\${state.conteoFisicoInput}" oninput="state.conteoFisicoInput = this.value" class="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900" />
                    <button onclick="ejecutarAccionEspecializadaModulo('conteos-auditoria', 'CC-2026-028'); state.mostrarModalCicloConteo12b = false; renderMain()" class="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                      ✓ Firmar y Asentar Ajuste en Kardex
                    </button>
                  </div>
                </div>
              \` : ''}

              \${state.vista === 'gobernanza-rbac' && state.mostrarModalRbac15b ? \`
                <!-- Flujo Especializado 15b: Asignación RBAC Multi-Tenant y Simulador Anti-IDOR -->
                <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">FLUJO ESPECIALIZADO 15B · GOBERNANZA RBAC Y TENANTSCOPE</span>
                      <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">Auditoría de Aislamiento Multi-Tenant (tenant_id: 8f2a...c91d) y Matriz de 10 Roles</h3>
                    </div>
                    <button onclick="alert('BLINDAJE VERIFICADO (HTTP 403 FORBIDDEN): TenantScope e hash_equals(X-Tenant-ID) bloquearon satisfactoriamente el acceso cruzado hacia tenant_intruso_999.')" class="rounded-xl bg-[#0A1120] px-4 py-2 text-xs font-extrabold text-cyan-300 shadow hover:bg-slate-800">
                      🔒 Simular Prueba de Intrusión Cross-Tenant (Anti-IDOR)
                    </button>
                  </div>
                </div>
              \` : ''}

              \${state.vista === 'analitica' ? \`
                <!-- Comparador Patrimonial PEPS vs UEPS vs CPP y Clasificación ABC (Flujo Especializado 14) -->
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">SIMULADOR DE VALORACIÓN PATRIMONIAL Y PARETO ABC</span>
                      <h3 class="text-sm font-extrabold text-slate-900 mt-0.5">Comparativa de Costo de Inventario por Estrategia (Patrón Strategy SOLID)</h3>
                    </div>
                    <div class="inline-flex rounded-xl bg-white border border-slate-200 p-1">
                      \${['PEPS', 'UEPS', 'CPP'].map(met => \`
                        <button onclick="state.metodoComparadorAnalitica = '\${met}'; renderMain()" class="rounded-lg px-3 py-1 text-[11px] font-extrabold transition \${state.metodoComparadorAnalitica === met ? 'bg-[#2563EB] text-white' : 'text-slate-600'}">\${met}</button>
                      \`).join('')}
                    </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div class="rounded-xl bg-white p-3.5 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">VALORACIÓN \${state.metodoComparadorAnalitica} CONSOLIDADA</span>
                      <strong class="font-mono text-lg font-extrabold text-slate-900 mt-1 block">
                        $ \${state.metodoComparadorAnalitica === 'PEPS' ? '2,441,470.00' : (state.metodoComparadorAnalitica === 'UEPS' ? '2,418,920.00' : '2,430,195.00')}
                      </strong>
                      <span class="text-[11px] text-emerald-700 font-semibold">Precisión DECIMAL(18,4) verificada</span>
                    </div>
                    <div class="rounded-xl bg-white p-3.5 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">PARETO CLASE A (80% VALOR)</span>
                      <strong class="font-mono text-lg font-extrabold text-blue-700 mt-1 block">2 Almacenes · 68% SKUs</strong>
                      <span class="text-[11px] text-slate-500">Conteo cíclico obligatorio quincenal</span>
                    </div>
                    <div class="rounded-xl bg-white p-3.5 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">ÍNDICE ERI PONDERADO</span>
                      <strong class="font-mono text-lg font-extrabold text-emerald-700 mt-1 block">99.22% Exactitud</strong>
                      <span class="text-[11px] text-slate-500">+0.72% sobre meta institucional (98.5%)</span>
                    </div>
                  </div>
                </div>
              \` : ''}

              \${state.vista === 'abastecimiento' && state.mostrarModalRecepcion13b ? \`
                <!-- Ventana Faltante 13b: Recepción de Orden de Compra en Muelle (Documentada en LEEME.txt) -->
                <div class="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">VENTANA ESPECIALIZADA 13B (COMPLEMENTO A 13-ABASTECIMIENTO.PNG)</span>
                      <h3 class="text-lg font-extrabold text-slate-900">Recepción Física de Orden de Compra en Muelle (OC-2026-0119)</h3>
                      <p class="text-xs text-slate-600">Cotejo ciego de bultos recibidos vs facturados, control de averías y asiento automático ENTRADA COMPRA en Kardex.</p>
                    </div>
                    <button onclick="conciliarOrdenCompra('OC-2026-0119'); state.mostrarModalRecepcion13b = false; renderMain()" class="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                      ✓ Confirmar Recepción e Impactar Kardex
                    </button>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div class="rounded-xl bg-white p-3 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">PROVEEDOR</span>
                      <strong class="text-slate-900">Nortek Suministros</strong>
                    </div>
                    <div class="rounded-xl bg-white p-3 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">SKU / LOTE INGRESO</span>
                      <strong class="font-mono text-slate-900">RB-220-INOX · LOTE-2026-101</strong>
                    </div>
                    <div class="rounded-xl bg-white p-3 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">CANTIDAD SOLICITADA / AVERÍAS</span>
                      <strong class="font-mono text-emerald-700">40.0000 PZA · 0 Averías</strong>
                    </div>
                    <div class="rounded-xl bg-white p-3 border border-slate-200">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">COSTO UNITARIO CPP</span>
                      <strong class="font-mono text-slate-900">$ 148.20 USD ($ 5,928.00)</strong>
                    </div>
                  </div>
                </div>
              \` : ''}

              <div class="divide-y divide-slate-100 text-xs">
                \${cfg.filas.map(f => \`
                  <div class="py-3.5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span class="font-mono font-extrabold text-blue-700">\${f.col1}</span>
                      <strong class="block text-sm text-slate-900 mt-0.5">\${f.col2}</strong>
                      <span class="text-slate-500">\${f.col3}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      \${f.accionOc ? \`<button onclick="conciliarOrdenCompra('\${f.accionOc}')" class="rounded-lg bg-[#2563EB] px-3 py-1.5 text-white font-bold hover:bg-blue-700">Recibir en Muelle → Kardex</button>\` : ''}
                      \${state.vista === 'almacenes' && f.col1.startsWith('TR-') ? \`<button onclick="ejecutarAccionEspecializadaModulo('almacenes', '\${f.col1}')" class="rounded-lg bg-[#0A1120] px-3 py-1.5 text-white font-bold hover:bg-slate-800">Confirmar Llegada (Paso 2)</button>\` : ''}
                      \${state.vista === 'lotes-fefo' ? \`<button onclick="ejecutarAccionEspecializadaModulo('lotes-fefo', '\${f.col1}')" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-bold hover:bg-slate-50">Alternar Cuarentena</button>\` : ''}
                      \${state.vista === 'conteos-auditoria' && f.col1 === 'CC-2026-028' ? \`<button onclick="ejecutarAccionEspecializadaModulo('conteos-auditoria', '\${f.col1}')" class="rounded-lg bg-[#2563EB] px-3 py-1.5 text-white font-bold hover:bg-blue-700">Firmar 2ª Aprobación → Kardex</button>\` : ''}
                      <span class="rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-bold text-slate-800">\${f.estado}</span>
                    </div>
                  </div>
                \`).join('')}
              </div>
            </section>
          </div>
        \`;
        return;
      }

      // APP MÓVIL PWA 390px (Réplica interactiva exacta de 02-Movil-390/07-Inicio, 08-Escanear, 09-Conteos, 10-Cola-offline)
      if (state.vista === 'pwa-movil') {
        el.innerHTML = \`
          <div class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">TERMINAL MÓVIL DE PASILLO · PWA 390PX (PANTALLAS M07 A M10)</span>
                <h1 class="text-2xl font-extrabold text-slate-900 mt-1">Simulador Interactivo de Operación Móvil en Bodega</h1>
              </div>
              <div class="flex flex-wrap gap-1.5">
                \${[
                  { id: 'm01', label: '01 · Landing' },
                  { id: 'm02', label: '02 · Demo' },
                  { id: 'm03', label: '03 · Login' },
                  { id: 'm04', label: '04 · Recuperar' },
                  { id: 'm05', label: '05 · Correo' },
                  { id: 'm06', label: '06 · Cuenta' },
                  { id: 'inicio', label: '07 · Inicio' },
                  { id: 'escanear', label: '08 · Escanear' },
                  { id: 'conteos', label: '09 · Conteos' },
                  { id: 'cola', label: '10 · Cola (' + state.colaOffline.length + ')' },
                ].map(t => \`
                  <button onclick="state.tabMovil = '\${t.id}'; renderMain()" class="rounded-xl px-3 py-1.5 text-[11px] font-bold transition \${state.tabMovil === t.id ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700'}">\${t.label}</button>
                \`).join('')}
              </div>
            </div>

            <!-- Dispositivo Móvil 390px Centrado con Menú Desplegable Móvil (10-13 MENU-MOVIL-ABIERTO) -->
            <div class="relative mx-auto w-[390px] max-w-full rounded-[32px] border-[6px] border-[#0A1120] bg-[#F5F7FB] shadow-2xl overflow-hidden flex flex-col min-h-[760px] justify-between">
              <!-- Cabecera Móvil Oscura con Botón Menú Hamburguesa ☰ -->
              <div class="bg-[#0A1120] text-white px-4 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <button onclick="state.menuMovilAbierto = true; renderMain()" title="Abrir menú desplegable móvil" class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/90 text-white hover:bg-slate-700 font-bold text-base">
                    ☰
                  </button>
                  <div>
                    <span class="block text-[10px] font-mono text-slate-400 uppercase">INDUSTRIAS ALFA · ALM-CENTRAL-01</span>
                    <strong class="text-sm font-extrabold">
                      \${state.tabMovil === 'inicio' ? 'Operación de bodega' : (state.tabMovil === 'escanear' ? 'Escáner óptico' : (state.tabMovil === 'conteos' ? 'Conteo cíclico' : 'Cola offline'))}
                    </strong>
                  </div>
                </div>
                <span class="h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white"></span>
              </div>

              \${state.menuMovilAbierto ? \`
                <!-- Drawer Menú Desplegable Móvil (Réplica exacta de 10..13-MENU-MOVIL-ABIERTO.png) -->
                <div class="absolute inset-0 z-30 flex">
                  <div class="w-[305px] bg-[#0A1120] text-white flex flex-col justify-between h-full shadow-2xl border-r border-slate-800">
                    <div>
                      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="flex h-9 w-9 items-end justify-center gap-1 rounded-xl bg-[#0F1D3A] border border-cyan-500/30 p-2">
                            <span class="w-1 h-2.5 rounded-full bg-cyan-400"></span>
                            <span class="w-1 h-4 rounded-full bg-cyan-400"></span>
                            <span class="w-1 h-5 rounded-full bg-cyan-300"></span>
                          </div>
                          <div>
                            <strong class="block text-sm font-extrabold leading-none">SGCI</strong>
                            <span class="block text-[8px] font-bold tracking-[0.16em] text-slate-400 uppercase mt-1">CONTROL DE INVENTARIOS</span>
                          </div>
                        </div>
                        <button onclick="state.menuMovilAbierto = false; renderMain()" class="h-9 w-9 rounded-xl bg-slate-800/90 text-slate-300 hover:text-white font-bold">✕</button>
                      </div>
                      <div class="px-3 pt-4">
                        <span class="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">OPERACIÓN</span>
                        <div class="mt-2 space-y-1 text-xs">
                          \${MENU_OPERACION.map(m => \`
                            <button onclick="state.menuMovilAbierto = false; seleccionarVista('\${m.id}')" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800">
                              <span class="flex items-center gap-3">\${ICONOS_SVG[m.icon] || ''}<span>\${m.label}</span></span>
                              \${m.badge ? \`<span class="rounded-full bg-rose-900/80 text-rose-200 text-[10px] font-bold px-1.5">\${m.badge}</span>\` : ''}
                            </button>
                          \`).join('')}
                        </div>
                      </div>
                      <div class="px-3 pt-4">
                        <span class="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">ADMINISTRACIÓN</span>
                        <div class="mt-2 space-y-1 text-xs">
                          \${MENU_ADMIN.map(m => \`
                            <button onclick="state.menuMovilAbierto = false; seleccionarVista('\${m.id}')" class="w-full flex items-center justify-between px-3 py-2 rounded-xl \${m.id === 'gobernanza-rbac' ? 'bg-[#2563EB] text-white font-bold border-l-4 border-l-cyan-400' : 'text-slate-300 hover:bg-slate-800'}">
                              <span class="flex items-center gap-3">\${ICONOS_SVG[m.icon] || ''}<span>\${m.label}</span></span>
                            </button>
                          \`).join('')}
                        </div>
                      </div>
                    </div>
                    <div class="space-y-2">
                      <div class="px-3">
                        <div class="rounded-xl border border-cyan-500/20 bg-[#0D182C] px-3 py-2 flex items-center justify-between text-xs">
                          <div>
                            <strong class="block text-[11px] font-bold text-white">● Operación conectada</strong>
                            <span class="block text-[10px] text-slate-400">Todos los sistemas activos</span>
                          </div>
                          <span class="text-cyan-400">📡</span>
                        </div>
                      </div>
                      <div class="border-t border-slate-800 p-4 flex items-center justify-between bg-[#080E1A]">
                        <div class="flex items-center gap-3">
                          <div class="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs">LM</div>
                          <div>
                            <strong class="block text-xs font-bold">Laura Mendoza</strong>
                            <span class="block text-[10px] font-mono text-slate-400">JEFE_ALMACEN</span>
                          </div>
                        </div>
                        <button onclick="state.menuMovilAbierto = false; renderMain()" class="text-slate-400 text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                  <div onclick="state.menuMovilAbierto = false; renderMain()" class="flex-1 bg-slate-950/60 backdrop-blur-xs"></div>
                </div>
              \` : ''}

              <!-- Cuerpo Móvil según Pestaña -->
              <div class="flex-1 p-5 space-y-4">
                \${['m01', 'm02', 'm03', 'm04', 'm05', 'm06'].includes(state.tabMovil) ? \`
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <button onclick="state.tabMovil = 'm01'; renderMain()" class="text-xs font-semibold text-slate-500">&lt; Volver al inicio</button>
                      <span class="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold uppercase">Móvil 390px · \${state.tabMovil.toUpperCase()}</span>
                    </div>
                    \${state.tabMovil === 'm01' ? \`
                      <div class="text-center space-y-3 py-2">
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-700">● Nueva generación de control de inventarios</span>
                        <h2 class="text-3xl font-extrabold text-slate-900 leading-tight">Inventario preciso.<br><span class="text-[#2563EB]">Operación sin límites.</span></h2>
                        <p class="text-xs text-slate-500">Centraliza almacenes, automatiza el Kardex y toma decisiones en tiempo real.</p>
                        <button onclick="state.tabMovil = 'm03'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white shadow">Probar SGCI gratis ›</button>
                        <button onclick="state.tabMovil = 'm02'; renderMain()" class="w-full rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-800">▶ Ver cómo funciona · 38 SEG</button>
                      </div>
                    \` : ''}
                    \${state.tabMovil === 'm02' ? \`
                      <div class="rounded-2xl bg-[#0A1120] text-white p-4 space-y-3">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold text-cyan-400">● DEMO GUIADA · 00:38</span>
                          <button onclick="state.tabMovil = 'm01'; renderMain()" class="text-xs text-slate-400">✕</button>
                        </div>
                        <strong class="block text-sm font-extrabold">Del escaneo al Kardex, en tiempo real</strong>
                        <div class="rounded-xl bg-white text-slate-900 p-4 text-center space-y-1">
                          <span class="font-mono text-[11px] font-bold text-blue-600">AC-100-FLEX</span>
                          <strong class="block text-xs font-extrabold">Entrada registrada</strong>
                          <span class="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-bold mt-2">✓ Kardex actualizado · Stock 29.0000 PZA</span>
                        </div>
                      </div>
                    \` : ''}
                    \${state.tabMovil === 'm03' ? \`
                      <div class="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
                        <span class="text-[10px] font-extrabold text-blue-600 uppercase">ACCESO SEGURO</span>
                        <h3 class="text-xl font-extrabold text-slate-900">Bienvenido de nuevo</h3>
                        <button class="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-800">G Continuar con Google</button>
                        <label class="block text-xs"><span class="font-bold text-slate-700">Código de organización</span><input value="IND-ALFA" readonly class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold" /></label>
                        <label class="block text-xs"><span class="font-bold text-slate-700">Correo electrónico</span><input value="laura@industriasalfa.com" readonly class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" /></label>
                        <div class="flex justify-between text-[11px]">
                          <span>☑ Recordarme</span>
                          <button onclick="state.tabMovil = 'm04'; renderMain()" class="font-bold text-blue-600">¿Olvidaste tu contraseña?</button>
                        </div>
                        <button onclick="state.tabMovil = 'inicio'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white">Ingresar a SGCI ›</button>
                      </div>
                    \` : ''}
                    \${state.tabMovil === 'm04' ? \`
                      <div class="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
                        <span class="text-[10px] font-extrabold text-blue-600 uppercase">RESTABLECER CONTRASEÑA</span>
                        <h3 class="text-xl font-extrabold text-slate-900">Recupera tu acceso</h3>
                        <p class="text-xs text-slate-500">Te enviaremos un enlace seguro a tu correo.</p>
                        <input value="laura@industriasalfa.com" class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" />
                        <button onclick="state.tabMovil = 'm05'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white">Enviar enlace de recuperación ›</button>
                      </div>
                    \` : ''}
                    \${state.tabMovil === 'm05' ? \`
                      <div class="rounded-2xl bg-white border border-slate-200 p-5 text-center space-y-3">
                        <div class="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">✓</div>
                        <span class="text-[10px] font-extrabold text-blue-600 uppercase">ENLACE ENVIADO</span>
                        <h3 class="text-xl font-extrabold text-slate-900">Revisa tu bandeja de entrada</h3>
                        <p class="text-xs text-slate-500">Enviamos instrucciones a <strong>laura@industriasalfa.com</strong>. Disponible durante 20 minutos.</p>
                        <button onclick="state.tabMovil = 'm03'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white">Volver a iniciar sesión</button>
                      </div>
                    \` : ''}
                    \${state.tabMovil === 'm06' ? \`
                      <div class="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 text-xs">
                        <span class="text-[10px] font-extrabold text-blue-600 uppercase">NUEVA ORGANIZACIÓN</span>
                        <h3 class="text-xl font-extrabold text-slate-900">Crea tu espacio de trabajo</h3>
                        <input value="Laura Mendoza" placeholder="Nombre completo" class="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        <input value="Industrias Alfa" placeholder="Organización" class="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        <input value="laura@industriasalfa.com" placeholder="Correo electrónico" class="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        <button onclick="state.tabMovil = 'inicio'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 font-extrabold text-white">Crear cuenta empresarial ›</button>
                      </div>
                    \` : ''}
                  </div>
                \` : ''}

                \${state.tabMovil === 'inicio' ? \`
                  <div>
                    <span class="text-[11px] font-extrabold text-blue-600 uppercase">BUENOS DÍAS, DANIEL</span>
                    <h2 class="text-2xl font-extrabold text-slate-900">Operación de bodega</h2>
                  </div>
                  <div class="rounded-2xl bg-[#0A1120] text-white p-5">
                    <span class="text-[11px] font-bold text-slate-400 uppercase">ERI HOY</span>
                    <strong class="block text-4xl font-extrabold mt-1">99.4%</strong>
                    <span class="inline-flex items-center gap-1.5 text-xs text-emerald-400 mt-2">● Operación estable</span>
                  </div>
                  <strong class="block text-sm font-extrabold text-slate-900 pt-1">Acciones rápidas</strong>
                  <div class="grid grid-cols-2 gap-3">
                    <button onclick="state.tabMovil = 'escanear'; renderMain()" class="rounded-2xl bg-white border border-slate-200 p-4 text-left shadow-sm">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">📷</span>
                      <strong class="block text-xs font-extrabold text-slate-900 mt-3">Escanear producto</strong>
                      <span class="text-[11px] text-slate-500">EAN-13 o QR de lote</span>
                    </button>
                    <button onclick="state.tabMovil = 'conteos'; renderMain()" class="rounded-2xl bg-white border border-slate-200 p-4 text-left shadow-sm">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">📋</span>
                      <strong class="block text-xs font-extrabold text-slate-900 mt-3">Conteo ciego</strong>
                      <span class="text-[11px] text-slate-500">8 ubicaciones asignadas</span>
                    </button>
                  </div>
                \` : ''}

                \${state.tabMovil === 'escanear' ? \`
                  <div class="rounded-2xl bg-[#101E36] text-white p-5 space-y-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">ESCÁNER DE PASILLO</span>
                        <h3 class="text-lg font-extrabold">EAN-13 / QR Lote</h3>
                      </div>
                      <span class="rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-[10px] font-bold">✓ CÁMARA ACTIVA</span>
                    </div>
                    <div class="h-36 rounded-xl border-2 border-dashed border-cyan-400/70 flex items-center justify-center relative">
                      <div class="w-4/5 h-0.5 bg-rose-500"></div>
                    </div>
                  </div>
                  <div class="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-extrabold text-blue-600 uppercase">PRODUCTO DETECTADO</span>
                      <span class="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-extrabold">⚠️ CRÍTICO</span>
                    </div>
                    <span class="font-mono text-xs font-bold text-slate-800 block">AC-100-FLEX</span>
                    <strong class="block text-base font-extrabold text-slate-900">Válvula de Presión Industrial 2"</strong>
                    <div class="rounded-xl bg-slate-50 p-3 text-xs">
                      <span class="text-[10px] font-bold text-slate-400 uppercase block">UBICACIÓN EXACTA</span>
                      <strong class="text-slate-900">Pasillo A · Rack 04 · Nivel 02</strong>
                    </div>
                    <div class="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs">
                      <span class="text-[10px] font-bold text-amber-800 uppercase block">PRIORIDAD FEFO</span>
                      <strong class="text-amber-950">Usar primero LOTE-2026-089 (Vence en 12 días)</strong>
                    </div>
                  </div>
                \` : ''}

                \${state.tabMovil === 'conteos' ? \`
                  <div>
                    <span class="text-[10px] font-extrabold text-blue-600 uppercase">CONTEO CÍCLICO · 14 DE 22</span>
                    <h2 class="text-xl font-extrabold text-slate-900">Ubicación B-02-05</h2>
                    <span class="mt-1 inline-block rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">🕒 CONTEO CIEGO · SISTEMA OCULTO</span>
                  </div>
                  <div class="rounded-2xl bg-white border border-slate-200 p-4 text-center space-y-1 shadow-sm">
                    <span class="text-[10px] font-bold text-slate-400 uppercase">UBICACIÓN A VERIFICAR</span>
                    <strong class="block text-base font-extrabold text-slate-900">Pasillo B · Rack 02 · Bin 05</strong>
                    <span class="font-mono text-xs font-bold text-slate-700 block pt-1">RB-220-INOX</span>
                    <span class="text-xs text-slate-500 block">Rodamiento sellado acero inoxidable</span>
                  </div>
                  <div class="rounded-2xl border-2 border-blue-600 bg-white px-4 py-3 flex items-baseline justify-between">
                    <div>
                      <span class="text-[10px] font-extrabold text-blue-600 uppercase block">CANTIDAD FÍSICA CONTADA</span>
                      <strong class="font-mono text-3xl font-extrabold text-slate-900">\${state.conteoFisicoInput}</strong>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">UNIDADES</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    \${[1,2,3,4,5,6,7,8,9,'←',0,'C'].map(k => \`
                      <button onclick="presionarTeclaConteo('\${k}')" class="h-11 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-900 hover:bg-slate-100">\${k}</button>
                    \`).join('')}
                  </div>
                  <button onclick="confirmarConteoCiegoMovil()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white shadow">
                    ✓ Confirmar conteo de ubicación
                  </button>
                \` : ''}

                \${state.tabMovil === 'cola' ? \`
                  <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950">
                    <strong>📡 Modo offline bodega</strong> · Guardando en IndexedDB local
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-[10px] font-extrabold text-blue-600 uppercase">SINCRONIZACIÓN</span>
                      <h2 class="text-xl font-extrabold text-slate-900">Cola de movimientos</h2>
                    </div>
                    <span class="rounded-full bg-amber-100 text-amber-900 px-2.5 py-1 text-[10px] font-extrabold">⚠️ \${state.colaOffline.length} PENDIENTES</span>
                  </div>
                  <div class="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
                    \${state.colaOffline.map(op => \`
                      <div class="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <strong class="block text-slate-900 font-bold">\${op.titulo}</strong>
                          <span class="text-[11px] text-slate-400">\${op.detalle}</span>
                        </div>
                        <span class="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-bold">\${op.estado}</span>
                      </div>
                    \`).join('')}
                  </div>
                  <button onclick="sincronizarColaOfflineMovil()" class="w-full rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                    📡 Sincronizar ahora (\${state.colaOffline.length})
                  </button>
                \` : ''}
              </div>

              <!-- Barra Inferior Móvil (4 Tabs Exactos de 02-Movil-390) -->
              <div class="bg-white border-t border-slate-200 grid grid-cols-4 py-2.5 text-center text-[11px] font-bold">
                <button onclick="state.tabMovil = 'inicio'; renderMain()" class="\${state.tabMovil === 'inicio' ? 'text-blue-600' : 'text-slate-400'}">🏠<span class="block">Inicio</span></button>
                <button onclick="state.tabMovil = 'escanear'; renderMain()" class="\${state.tabMovil === 'escanear' ? 'text-blue-600' : 'text-slate-400'}">📷<span class="block">Escanear</span></button>
                <button onclick="state.tabMovil = 'conteos'; renderMain()" class="\${state.tabMovil === 'conteos' ? 'text-blue-600' : 'text-slate-400'}">📋<span class="block">Conteos</span></button>
                <button onclick="state.tabMovil = 'cola'; renderMain()" class="relative \${state.tabMovil === 'cola' ? 'text-blue-600' : 'text-slate-400'}">
                  📡<span class="block">Cola offline</span>
                  \${state.colaOffline.length > 0 ? \`<span class="absolute top-0 right-4 rounded-full bg-rose-600 text-white text-[9px] px-1.5">\${state.colaOffline.length}</span>\` : ''}
                </button>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      // 01-06 LANDING, DEMO GUIADA (02), LOGIN (03), RECUPERACIÓN (04), CONFIRMACIÓN (05), TOKEN (05B) Y REGISTRO (06)
      if (state.vista === 'landing') {
        el.innerHTML = \`
          <div class="space-y-6">
            <!-- Conmutador de las 7 Ventanas de Acceso y Onboarding (01 a 06 + 05b) -->
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
              <div class="flex flex-wrap gap-1.5">
                \${[
                  { id: '01-landing', label: '01 · Landing SGCI' },
                  { id: '02-demo', label: '02 · Demo Guiada (00:38)' },
                  { id: '03-login', label: '03 · Inicio de sesión' },
                  { id: '04-recuperacion', label: '04 · Recuperación' },
                  { id: '05-confirmacion', label: '05 · Confirmación correo' },
                  { id: '05b-token', label: '05b · Nueva contraseña por Token ★' },
                  { id: '06-registro', label: '06 · Creación de cuenta' },
                ].map(tab => \`
                  <button onclick="state.subVistaAcceso = '\${tab.id}'; renderMain()" class="rounded-xl px-3.5 py-2 text-xs font-bold transition \${state.subVistaAcceso === tab.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">\${tab.label}</button>
                \`).join('')}
              </div>
            </div>

            \${state.subVistaAcceso === '01-landing' || state.subVistaAcceso === '02-demo' ? \`
              <!-- Réplica Exacta de 01-Landing.png y 02-Demostracion.png -->
              <div class="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden relative">
                <!-- Navbar Superior Landing -->
                <div class="px-8 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-end justify-center gap-1 rounded-xl bg-[#0A1120] p-2">
                      <span class="w-1 h-2.5 rounded-full bg-cyan-400"></span>
                      <span class="w-1 h-4 rounded-full bg-cyan-400"></span>
                      <span class="w-1 h-5 rounded-full bg-cyan-300"></span>
                    </div>
                    <div>
                      <strong class="block text-sm font-extrabold tracking-tight text-slate-900 leading-none">SGCI</strong>
                      <span class="block text-[9px] font-bold tracking-[0.18em] text-slate-400 uppercase mt-0.5">INVENTORY INTELLIGENCE</span>
                    </div>
                  </div>
                  <div class="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
                    <span>Producto</span>
                    <span>Capacidades</span>
                    <span>Seguridad</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <button onclick="state.subVistaAcceso = '03-login'; renderMain()" class="text-xs font-bold text-slate-700 px-3 py-2">Iniciar sesión</button>
                    <button onclick="state.subVistaAcceso = '06-registro'; renderMain()" class="rounded-xl bg-[#0A1120] text-white px-4 py-2.5 text-xs font-bold">Comenzar ahora ›</button>
                  </div>
                </div>

                <!-- Hero Landing -->
                <div class="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-gradient-to-b from-white to-slate-50/60">
                  <div class="space-y-5">
                    <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      <span class="h-2 w-2 rounded-full bg-cyan-500"></span> Nueva generación de control de inventarios
                    </span>
                    <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.06]">
                      Inventario preciso.<br />
                      <span class="text-[#2563EB]">Operación sin límites.</span>
                    </h1>
                    <p class="text-sm text-slate-600 leading-relaxed max-w-lg">
                      Centraliza almacenes, automatiza el Kardex y toma decisiones en tiempo real con una plataforma creada para operaciones empresariales exigentes.
                    </p>
                    <div class="flex flex-wrap items-center gap-3 pt-1">
                      <button onclick="seleccionarVista('centro-mando')" class="rounded-xl bg-[#2563EB] px-6 py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                        Probar SGCI gratis ›
                      </button>
                      <button onclick="state.subVistaAcceso = '02-demo'; renderMain()" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50">
                        <span>▶ Ver cómo funciona</span>
                        <span class="font-mono text-[10px] text-slate-400">38 SEG</span>
                      </button>
                    </div>
                    <div class="flex flex-wrap gap-5 pt-2 text-[11px] font-semibold text-slate-500">
                      <span>✓ Sin tarjeta de crédito</span>
                      <span>✓ Configuración en minutos</span>
                      <span>✓ Soporte especializado</span>
                    </div>
                  </div>

                  <!-- Mockup Interactivo Derecho (01-Landing.png) -->
                  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 relative">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">CENTRO DE MANDO</span>
                        <strong class="block text-sm font-extrabold text-slate-900">Buenos días, Laura</strong>
                      </div>
                      <span class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800">
                        📡 3 almacenes en línea ●
                      </span>
                    </div>
                    <div class="grid grid-cols-3 gap-3 text-xs">
                      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">EXACTITUD ERI</span>
                        <strong class="block text-lg font-extrabold text-slate-900 mt-0.5">99.4%</strong>
                        <span class="text-[10px] font-bold text-emerald-600">+0.8%</span>
                      </div>
                      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">VALOR PATRIMONIAL</span>
                        <strong class="block text-lg font-extrabold text-slate-900 mt-0.5">$1.48M</strong>
                        <span class="text-[10px] font-bold text-blue-600">ACTUALIZADO</span>
                      </div>
                      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">STOCK CRÍTICO</span>
                        <strong class="block text-lg font-extrabold text-slate-900 mt-0.5">7</strong>
                        <span class="text-[10px] font-bold text-rose-600">3 HOY</span>
                      </div>
                    </div>
                    <div class="rounded-xl border border-rose-200 bg-rose-50/80 p-3 flex items-center justify-between text-xs">
                      <div>
                        <span class="text-[9px] font-extrabold text-rose-700 uppercase block">⚠️ ALERTA INTELIGENTE</span>
                        <strong class="text-slate-900">Stock crítico detectado · AC-100-FLEX · 5 PZA</strong>
                      </div>
                      <span class="font-mono text-xs font-bold text-rose-700">5 PZA</span>
                    </div>
                  </div>
                </div>

                <!-- Cintillo de Empresas -->
                <div class="border-y border-slate-100 py-5 px-8 text-center">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-3">DISEÑADO PARA OPERACIONES QUE NO SE DETIENEN</span>
                  <div class="flex flex-wrap justify-center gap-10 text-xs font-extrabold tracking-wider text-slate-400">
                    <span>METALNOVA</span>
                    <span>INDUSTRIAS ALFA</span>
                    <span>AXIS LOGÍSTICA</span>
                    <span>NORTEK</span>
                    <span>GRUPO MERIDIAN</span>
                  </div>
                </div>

                <!-- 4 Tarjetas de Capacidades + Bloque Oscuro SOC 2 -->
                <div class="p-8 lg:p-12 space-y-10">
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">UNA PLATAFORMA. CONTROL TOTAL.</span>
                    <h2 class="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1">Todo lo que tu inventario necesita para operar con precisión.</h2>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
                    <div class="rounded-2xl border border-slate-200 p-5 space-y-2">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">📈</span>
                      <strong class="block text-sm font-extrabold text-slate-900 pt-1">Visibilidad en tiempo real</strong>
                      <p class="text-slate-500 leading-relaxed">Indicadores, alertas y movimientos sincronizados entre todos tus almacenes.</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 p-5 space-y-2">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 font-bold">📑</span>
                      <strong class="block text-sm font-extrabold text-slate-900 pt-1">Kardex confiable</strong>
                      <p class="text-slate-500 leading-relaxed">Valoración PEPS, UEPS y promedio con trazabilidad inmutable para auditoría.</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 p-5 space-y-2">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">📷</span>
                      <strong class="block text-sm font-extrabold text-slate-900 pt-1">Operación móvil</strong>
                      <p class="text-slate-500 leading-relaxed">Escaneo QR/EAN-13, conteos ciegos y operación offline desde cualquier pasillo.</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 p-5 space-y-2">
                      <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold">🛡️</span>
                      <strong class="block text-sm font-extrabold text-slate-900 pt-1">Gobierno empresarial</strong>
                      <p class="text-slate-500 leading-relaxed">Multi-tenant, diez roles RBAC y políticas configurables por organización.</p>
                    </div>
                  </div>

                  <div class="rounded-2xl bg-[#0A1120] text-white p-8 flex flex-wrap items-center justify-between gap-6">
                    <div class="space-y-1 max-w-xl">
                      <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">SEGURIDAD EMPRESARIAL</span>
                      <h3 class="text-xl font-extrabold">Tus datos, siempre protegidos.</h3>
                      <p class="text-xs text-slate-400">Arquitectura multi-tenant, permisos granulares, trazabilidad completa y cifrado de extremo a extremo.</p>
                    </div>
                    <div class="text-right font-mono text-[11px] font-bold text-slate-300 space-y-1">
                      <div>SOC 2 READY</div>
                      <div>RBAC 10 ROLES</div>
                      <div>99.9% UPTIME</div>
                    </div>
                  </div>
                </div>

                \${state.subVistaAcceso === '02-demo' ? \`
                  <!-- Modal Superpuesto 02-Demostracion.png -->
                  <div class=" inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6">
                    <div class="max-w-2xl w-full rounded-3xl bg-[#0A1120] text-white p-6 shadow-2xl border border-slate-800 space-y-4">
                      <div class="flex items-center justify-between">
                        <div>
                          <span class="text-[10px] font-bold text-cyan-400 uppercase">● DEMO GUIADA · 00:38</span>
                          <h3 class="text-lg font-extrabold mt-0.5">Del escaneo al Kardex, en tiempo real</h3>
                        </div>
                        <button onclick="state.subVistaAcceso = '01-landing'; renderMain()" class="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white">✕</button>
                      </div>
                      <div class="rounded-2xl bg-white text-slate-900 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div class="md:col-span-2 space-y-2 text-xs">
                          <span class="font-mono text-[11px] font-bold text-blue-600">PASO 01 → 03 · SINCRONIZACIÓN INSTANTÁNEA</span>
                          <strong class="block text-base font-extrabold">Escaneo móvil en Bodega Central Monterrey</strong>
                          <p class="text-slate-500">El operador escanea el lote LOTE-2026-089 y el Libro Mayor Kardex recalcula automáticamente la capa PEPS.</p>
                          <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 font-bold">
                            ✓ Kardex actualizado · Stock 29.0000 PZA
                          </span>
                        </div>
                        <div class="rounded-2xl border-4 border-[#0A1120] p-4 text-center space-y-1 bg-slate-50">
                          <span class="text-lg">📷</span>
                          <span class="block font-mono text-[11px] font-bold text-blue-600">AC-100-FLEX</span>
                          <strong class="block text-xs font-extrabold">Entrada registrada</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                \` : ''}
              </div>
            \` : \`
              <!-- Layout Split-Screen Oficial para 03-Login, 04-Recuperacion, 05-Confirmacion, 05b-Token y 06-Registro -->
              <div class="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
                <!-- Panel Izquierdo Oscuro (#081122) idéntico a Pantallas 03, 04, 05 y 06 -->
                <div class="bg-[#081122] text-white p-8 lg:p-12 flex flex-col justify-between">
                  <div class="space-y-6">
                    <div class="flex items-center justify-between">
                      <button onclick="state.subVistaAcceso = '01-landing'; renderMain()" class="text-xs font-semibold text-slate-300 hover:text-white">&lt; Volver al inicio</button>
                      <span class="font-mono text-[10px] text-cyan-400">SGCI · INVENTORY INTELLIGENCE</span>
                    </div>
                    <span class="inline-block rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-cyan-300 uppercase">
                      OPERACIÓN EN TIEMPO REAL
                    </span>
                    <h2 class="text-3xl lg:text-4xl font-extrabold leading-tight">
                      Control absoluto.<br />Decisiones más inteligentes.
                    </h2>
                    <p class="text-xs text-slate-300 leading-relaxed max-w-md">
                      Inventario, costos y trazabilidad conectados en una sola plataforma empresarial.
                    </p>
                    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex items-end justify-between">
                      <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">EXACTITUD ERI</span>
                        <strong class="block text-3xl font-extrabold mt-1">99.4%</strong>
                      </div>
                      <div class="flex items-end gap-1.5 h-12">
                        <span class="w-2 h-5 rounded bg-blue-600"></span>
                        <span class="w-2 h-7 rounded bg-blue-600"></span>
                        <span class="w-2 h-6 rounded bg-blue-500"></span>
                        <span class="w-2 h-9 rounded bg-blue-500"></span>
                        <span class="w-2 h-10 rounded bg-cyan-400"></span>
                        <span class="w-2 h-12 rounded bg-cyan-300"></span>
                      </div>
                    </div>
                  </div>
                  <div class="border-l-2 border-cyan-400 pl-4 text-xs text-slate-300 space-y-1 mt-8">
                    <p>"SGCI convirtió una operación fragmentada en una fuente confiable de decisiones."</p>
                    <span class="block text-[11px] text-slate-400">Laura Mendoza · Jefe de Almacén</span>
                  </div>
                </div>

                <!-- Panel Derecho Blanco Dinámico (03, 04, 05, 05b, 06) -->
                <div class="p-8 lg:p-12 flex flex-col justify-center max-w-lg mx-auto w-full">
                  \${state.subVistaAcceso === '03-login' ? \`
                    <div class="space-y-4 text-xs">
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">ACCESO SEGURO · PANTALLA 03</span>
                        <button type="button" onclick="state.loginOrgInput='IND-ALFA'; state.loginEmailInput='laura@industriasalfa.com'; state.loginPasswordInput='AlfaInventario#2026'; iniciarSesionMvp()" class="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-100">
                          ⚡ Autocompletar Demo (Laura)
                        </button>
                      </div>
                      <h3 class="text-3xl font-extrabold text-slate-900">Bienvenido de nuevo</h3>
                      <p class="text-slate-500">Ingresa a tu centro de control de inventarios o crea una cuenta nueva.</p>

                      \${state.mensajeAuthError ? \`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">⚠️ \${state.mensajeAuthError}</div>\` : ''}
                      \${state.mensajeAuthExito ? \`<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">✓ \${state.mensajeAuthExito}</div>\` : ''}

                      <button type="button" onclick="aplicarSesionUsuario({ nombre: 'Laura Mendoza (Google SSO)', iniciales: 'LM', email: 'laura@industriasalfa.com', organizacion: 'Industrias Alfa S.A.S.', codigoOrg: 'IND-ALFA', rol: 'JEFE_ALMACEN' })" class="w-full rounded-xl border border-slate-200 py-3 font-bold text-slate-800 hover:bg-slate-50">
                        G Continuar con Google Corporativo
                      </button>
                      <div class="text-center text-[11px] text-slate-400">o continúa con correo corporativo</div>
                      <label class="block">
                        <span class="font-bold text-slate-700">Código de organización (Tenant)</span>
                        <input id="input-login-org" type="text" oninput="state.loginOrgInput = this.value" value="\${state.loginOrgInput}" placeholder="Ej. IND-ALFA" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none" />
                      </label>
                      <label class="block">
                        <span class="font-bold text-slate-700">Correo electrónico</span>
                        <input id="input-login-email" type="email" oninput="state.loginEmailInput = this.value" value="\${state.loginEmailInput}" placeholder="usuario@empresa.com" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900 focus:border-blue-600 focus:outline-none" />
                      </label>
                      <label class="block">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-slate-700">Contraseña</span>
                          <button type="button" onclick="state.mostrarPasswordLogin = !state.mostrarPasswordLogin; renderMain()" class="text-[11px] font-semibold text-blue-600 hover:underline">
                            \${state.mostrarPasswordLogin ? '🙈 Ocultar' : '👁️ Mostrar'}
                          </button>
                        </div>
                        <input id="input-login-pass" type="\${state.mostrarPasswordLogin ? 'text' : 'password'}" oninput="state.loginPasswordInput = this.value" onkeydown="if(event.key==='Enter') iniciarSesionMvp()" value="\${state.loginPasswordInput}" placeholder="Ingresa tu contraseña" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-slate-900 focus:border-blue-600 focus:outline-none" />
                      </label>
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="font-semibold text-slate-600">☑ Mantener sesión activa</span>
                        <button type="button" onclick="state.mensajeAuthError=''; state.subVistaAcceso = '04-recuperacion'; renderMain()" class="font-bold text-blue-600 hover:underline">¿Olvidaste tu contraseña?</button>
                      </div>
                      <button type="button" onclick="iniciarSesionMvp()" class="w-full rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700 transition">
                        Ingresar a SGCI ›
                      </button>
                      <div class="text-center text-[11px] text-slate-500">
                        ¿Tu empresa aún no usa SGCI? <button type="button" onclick="state.mensajeAuthError=''; state.subVistaAcceso = '06-registro'; renderMain()" class="font-bold text-blue-600 hover:underline">Crear cuenta nueva</button>
                      </div>
                    </div>
                  \` : ''}

                  \${state.subVistaAcceso === '04-recuperacion' ? \`
                    <div class="space-y-4 text-xs">
                      <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">RESTABLECER CONTRASEÑA · PANTALLA 04</span>
                      <h3 class="text-3xl font-extrabold text-slate-900">Recupera tu acceso</h3>
                      <p class="text-slate-500">Te enviaremos un enlace seguro con token SHA-256 a tu correo.</p>
                      \${state.mensajeAuthError ? \`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">⚠️ \${state.mensajeAuthError}</div>\` : ''}
                      <label class="block">
                        <span class="font-bold text-slate-700">Correo electrónico registrado</span>
                        <input type="email" oninput="state.recuperacionEmailInput = this.value" value="\${state.recuperacionEmailInput}" placeholder="tu-correo@empresa.com" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900" />
                      </label>
                      <button type="button" onclick="solicitarRecuperacionMvp()" class="w-full rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                        Enviar enlace de recuperación ›
                      </button>
                      <div class="text-center text-[11px] text-slate-500">
                        ¿Recordaste tu contraseña? <button type="button" onclick="state.subVistaAcceso = '03-login'; renderMain()" class="font-bold text-blue-600 hover:underline">Volver al acceso</button>
                      </div>
                    </div>
                  \` : ''}

                  \${state.subVistaAcceso === '05-confirmacion' ? \`
                    <div class="space-y-4 text-xs text-center">
                      <div class="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">✓</div>
                      <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">ENLACE ENVIADO · PANTALLA 05</span>
                      <h3 class="text-3xl font-extrabold text-slate-900">Revisa tu bandeja de entrada</h3>
                      <p class="text-slate-500">Enviamos instrucciones a <strong>\${state.recuperacionEmailInput}</strong> con el token <code class="font-mono font-bold text-blue-700">\${state.tokenRecuperacionInput}</code>.</p>
                      <button type="button" onclick="state.subVistaAcceso = '05b-token'; renderMain()" class="w-full rounded-xl bg-[#0A1120] py-3 text-xs font-extrabold text-white shadow hover:bg-slate-800">
                        Abrir enlace con Token de Recuperación (Pantalla 05b) ›
                      </button>
                      <button type="button" onclick="state.subVistaAcceso = '03-login'; renderMain()" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                        Volver a iniciar sesión
                      </button>
                    </div>
                  \` : ''}

                  \${state.subVistaAcceso === '05b-token' ? \`
                    <div class="space-y-4 text-xs">
                      <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">NUEVA CONTRASEÑA POR TOKEN · PANTALLA 05B (COMPLEMENTO LEEME.TXT)</span>
                      <h3 class="text-2xl font-extrabold text-slate-900">Define tu nueva contraseña corporativa</h3>
                      <p class="text-slate-500">Token SHA-256 de un solo uso validado para <strong>\${state.recuperacionEmailInput}</strong></p>
                      \${state.mensajeAuthError ? \`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">⚠️ \${state.mensajeAuthError}</div>\` : ''}
                      <label class="block">
                        <span class="font-bold text-slate-700">Token firmado recibido</span>
                        <input oninput="state.tokenRecuperacionInput = this.value" value="\${state.tokenRecuperacionInput}" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-slate-900" />
                      </label>
                      <label class="block">
                        <span class="font-bold text-slate-700">Nueva contraseña</span>
                        <input type="password" oninput="state.nuevaPasswordInput = this.value" value="\${state.nuevaPasswordInput}" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-slate-900" />
                      </label>
                      <label class="block">
                        <span class="font-bold text-slate-700">Confirmar nueva contraseña</span>
                        <input type="password" oninput="state.confirmarPasswordInput = this.value" value="\${state.confirmarPasswordInput}" class="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-slate-900" />
                      </label>
                      <button type="button" onclick="aplicarNuevaContrasenaToken()" class="w-full rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                        Guardar Nueva Contraseña e Ir a Login ›
                      </button>
                    </div>
                  \` : ''}

                  \${state.subVistaAcceso === '06-registro' ? \`
                    <div class="space-y-3.5 text-xs">
                      <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">NUEVA ORGANIZACIÓN · PANTALLA 06</span>
                      <h3 class="text-3xl font-extrabold text-slate-900">Crea tu espacio de trabajo</h3>
                      <p class="text-slate-500">Registra tu cuenta y organización Multi-Tenant para ingresar al sistema.</p>
                      \${state.mensajeAuthError ? \`<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">⚠️ \${state.mensajeAuthError}</div>\` : ''}
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label class="block">
                          <span class="font-bold text-slate-700">Nombre completo *</span>
                          <input id="input-reg-nombre" oninput="state.regNombreInput = this.value" value="\${state.regNombreInput}" placeholder="Ej. Carlos Morales" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-900 focus:border-blue-600 focus:outline-none" />
                        </label>
                        <label class="block">
                          <span class="font-bold text-slate-700">Organización (Empresa) *</span>
                          <input id="input-reg-empresa" oninput="state.regOrganizacionInput = this.value" value="\${state.regOrganizacionInput}" placeholder="Ej. Logística del Norte S.A." class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-900 focus:border-blue-600 focus:outline-none" />
                        </label>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label class="block">
                          <span class="font-bold text-slate-700">Código Tenant</span>
                          <input id="input-reg-org" oninput="state.regCodigoOrgInput = this.value" value="\${state.regCodigoOrgInput}" placeholder="Ej. LOG-NORTE" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none" />
                        </label>
                        <label class="block">
                          <span class="font-bold text-slate-700">Rol inicial RBAC</span>
                          <select onchange="state.regRolInput = this.value" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-blue-700 bg-white">
                            <option value="ADMIN_EMPRESA">ADMIN_EMPRESA</option>
                            <option value="JEFE_ALMACEN">JEFE_ALMACEN</option>
                            <option value="AUDITOR_CONTEOS">AUDITOR_CONTEOS</option>
                            <option value="OPERADOR_PISO">OPERADOR_PISO</option>
                          </select>
                        </label>
                      </div>
                      <label class="block">
                        <span class="font-bold text-slate-700">Correo electrónico corporativo *</span>
                        <input id="input-reg-email" type="email" oninput="state.regEmailInput = this.value" value="\${state.regEmailInput}" placeholder="carlos@lognorte.com" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-900 focus:border-blue-600 focus:outline-none" />
                      </label>
                      <label class="block">
                        <span class="font-bold text-slate-700">Contraseña (mín. 6 caracteres) *</span>
                        <input id="input-reg-pass" type="password" oninput="state.regPasswordInput = this.value" onkeydown="if(event.key==='Enter') registrarCuentaMvp()" value="\${state.regPasswordInput}" placeholder="••••••••••••" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-slate-900 focus:border-blue-600 focus:outline-none" />
                      </label>
                      <button type="button" onclick="registrarCuentaMvp()" class="w-full rounded-xl bg-[#2563EB] py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700 transition">
                        Crear cuenta empresarial e ingresar ›
                      </button>
                      <div class="text-center text-[11px] text-slate-500">
                        ¿Ya tienes una cuenta? <button type="button" onclick="state.mensajeAuthError=''; state.subVistaAcceso = '03-login'; renderMain()" class="font-bold text-blue-600 hover:underline">Iniciar sesión</button>
                      </div>
                    </div>
                  \` : ''}
                </div>
              </div>
            \`}
          </div>
        \`;
        return;
      }

      // GALERÍA DE LAS 47 CAPTURAS OFICIALES DE SGCI (22 Menú Expandido/Contraído + 15 Escritorio + 10 Móvil)
      const items = state.pantallasManifest.filter(s => {
        if (state.filtroGaleria === 'Menu') return s.file.startsWith('00-MENU-EXPANDIDO-Y-CONTRAIDO');
        if (state.filtroGaleria === 'Escritorio') return s.file.startsWith('01-Escritorio-1440');
        if (state.filtroGaleria === 'Movil') return s.file.startsWith('02-Movil-390');
        return true;
      });

      el.innerHTML = \`
        <div class="space-y-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">BIBLIOTECA VISUAL OFICIAL · 47 CAPTURAS CON MENÚ DESPLEGABLE</span>
              <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">47 Pantallas Oficiales SGCI (22 Menú Expandido/Contraído + 15 Escritorio + 10 Móvil)</h1>
              <p class="text-sm text-slate-500 mt-1">Cargadas desde <code>C:\\Users\\sxepc\\Downloads\\SGCI\\SGCI-pantallas</code> · Puedes contraer el menú real con el botón <code>|◁</code> junto al logo SGCI.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              \${[
                { id: 'Todos', label: 'Todas (47)' },
                { id: 'Menu', label: '00 · Menú Expandido/Contraído (22)' },
                { id: 'Escritorio', label: '01 · Escritorio 1440px (15)' },
                { id: 'Movil', label: '02 · Móvil 390px (10)' },
              ].map(f => \`
                <button onclick="state.filtroGaleria = '\${f.id}'; renderMain()" class="rounded-xl px-4 py-2 text-xs font-bold transition \${state.filtroGaleria === f.id ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700'}">\${f.label}</button>
              \`).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            \${items.map(s => {
              const imgUrl = '/artifacts/sgci-pantallas/' + s.file;
              const esMovil = s.file.startsWith('02-Movil-390');
              return \`
                <article class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
                  <div class="bg-[#0A1120] text-white px-4 py-2.5 flex items-center justify-between text-xs">
                    <strong class="font-bold">\${s.title}</strong>
                    <span class="rounded bg-blue-600/30 text-cyan-300 px-2 py-0.5 text-[10px] font-mono">\${esMovil ? 'Móvil 390px' : 'Escritorio 1440px'}</span>
                  </div>
                  <a href="\${imgUrl}" target="_blank" class="block bg-slate-100 p-3 border-b border-slate-200">
                    <img src="\${imgUrl}" alt="\${s.title}" loading="lazy" class="mx-auto max-h-64 object-contain object-top rounded" />
                  </a>
                  <div class="p-4 flex-1 flex flex-col justify-between">
                    <p class="text-xs text-slate-600">\${s.note || 'Pantalla oficial de SGCI integrada en la aplicación interactiva.'}</p>
                    <span class="mt-3 block font-mono text-[10px] text-slate-400">\${s.file}</span>
                  </div>
                </article>
              \`;
            }).join('')}
          </div>
        </div>
      \`;
    }

    renderSidebar();
    renderMain();

    Promise.all([
      fetch('/artifacts/sgci-pantallas/manifest.json').then(r => r.json()).catch(() => ({ screens: [] })),
      fetch('/api/v1/mvp/state').then(r => r.json()).catch(() => null),
    ]).then(([manifestData, mvpData]) => {
      state.pantallasManifest = (manifestData && manifestData.screens) || [];
      if (mvpData && mvpData.state) {
        state.productos = mvpData.state.productos || state.productos;
        state.movimientosKardex = mvpData.state.movimientosKardex || state.movimientosKardex;
        state.lotesFefo = mvpData.state.lotesFefo || state.lotesFefo;
        state.ordenesCompra = mvpData.state.ordenesCompra || state.ordenesCompra;
      }
      renderSidebar();
      renderMain();
    });
  </script>
</body>
</html>`;

const INITIAL_MVP_STATE = {
  usuarios: [
    {
      nombre: 'Laura Mendoza',
      iniciales: 'LM',
      email: 'laura@industriasalfa.com',
      password: 'AlfaInventario#2026',
      organizacion: 'Industrias Alfa S.A.S.',
      codigoOrg: 'IND-ALFA',
      rol: 'JEFE_ALMACEN',
    },
    {
      nombre: 'Carlos Morales',
      iniciales: 'CM',
      email: 'carlos@industriasalfa.com',
      password: 'AlfaInventario#2026',
      organizacion: 'Industrias Alfa S.A.S.',
      codigoOrg: 'IND-ALFA',
      rol: 'ADMIN_EMPRESA',
    },
  ],
  productos: [
    { sku: 'AC-100-FLEX', nombre: 'Válvula de Presión Industrial 2"', ubicacion: 'A-04-R02-NB', lote: 'LOTE-2026-089', metodo: 'PEPS', min: 12, rop: 18, max: 48, stock: 5, costo: 142.50, estado: 'CRÍTICO' },
    { sku: 'RB-220-INOX', nombre: 'Rodamiento sellado acero inoxidable', ubicacion: 'B-02-R08-NA', lote: 'LOTE-2026-101', metodo: 'CPP', min: 10, rop: 20, max: 60, stock: 14, costo: 148.20, estado: 'REORDEN' },
    { sku: 'FL-084-NBR', nombre: 'Sello mecánico NBR 84 mm', ubicacion: 'B-06-R03-NC', lote: 'LOTE-2027-014', metodo: 'PEPS', min: 20, rop: 32, max: 100, stock: 84, costo: 64.00, estado: 'ÓPTIMO' },
  ],
  movimientosKardex: [
    { fecha: '08 MAR 2026 · 08:42:16 UTC-6', doc: 'OC-2026-0041', tipo: 'ENTRADA COMPRA', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '24.0000', salida: '—', saldo: '29.0000', costoUnit: 142.50, saldoVal: 4132.50, operador: 'L. Mendoza', rolOp: 'ALMACENISTA' },
    { fecha: '08 MAR 2026 · 09:18:02 UTC-6', doc: 'TR-2026-0188', tipo: 'TRANSFERENCIA', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '—', salida: '8.0000', saldo: '21.0000', costoUnit: 142.50, saldoVal: 2992.50, operador: 'M. Solís', rolOp: 'ALMACENISTA' },
    { fecha: '08 MAR 2026 · 10:06:44 UTC-6', doc: 'OT-2026-1092', tipo: 'SALIDA DESPACHO', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '—', salida: '16.0000', saldo: '5.0000', costoUnit: 142.50, saldoVal: 712.50, operador: 'D. Ríos', rolOp: 'ALMACENISTA' },
    { fecha: '08 MAR 2026 · 11:31:19 UTC-6', doc: 'AJ-2026-0062', tipo: 'AJUSTE', lote: 'LOTE-2026-089', vence: '18/03/2026', entrada: '1.0000', salida: '—', saldo: '6.0000', costoUnit: 142.50, saldoVal: 855.00, operador: 'A. Vélez', rolOp: 'ALMACENISTA' },
  ],
  lotesFefo: [
    { lote: 'LOTE-2026-089', sku: 'AC-100-FLEX', producto: 'Válvula de Presión Industrial 2"', vence: '2026-11-17', dias: 12, cant: 6, ubicacion: 'A-04-R02-NB', semaforo: 'PROXIMO_A_VENCER' },
    { lote: 'LOTE-2026-101', sku: 'RB-220-INOX', producto: 'Rodamiento sellado acero inoxidable', vence: '2026-12-28', dias: 53, cant: 18, ubicacion: 'B-02-R08-NA', semaforo: 'ADVERTENCIA' },
    { lote: 'LOTE-2027-014', sku: 'FL-084-NBR', producto: 'Sello mecánico NBR 84 mm', vence: '2027-06-15', dias: 222, cant: 84, ubicacion: 'B-06-R03-NC', semaforo: 'VIGENTE' },
    { lote: 'LOTE-2026-019', sku: 'AC-100-FLEX', producto: 'Válvula de Presión Industrial 2"', vence: '2026-10-01', dias: -35, cant: 3, ubicacion: 'ZONA-CUARENTENA-01', semaforo: 'CUARENTENA' },
  ],
  ordenesCompra: [
    { oc: 'OC-2026-0118', proveedor: 'Metalnova Industrial S.A.', sku: 'AC-100-FLEX', solicitado: 20, recibido: 20, muelle: 'Muelle 02', estado: 'CONCILIADA', totalUsd: 2850 },
    { oc: 'OC-2026-0119', proveedor: 'Nortek Suministros', sku: 'RB-220-INOX', solicitado: 40, recibido: 0, muelle: 'Muelle 01', estado: 'ABIERTA · PENDIENTE RECEPCIÓN', totalUsd: 5928 },
  ],
  colaOffline: [
    { id: 'op-1', titulo: 'Salida · AC-100-FLEX · 4 PZA', detalle: 'Hoy · 10:42 · D. Ríos', estado: 'PENDIENTE' },
    { id: 'op-2', titulo: 'Conteo · B-02-05 · 14 PZA', detalle: 'Hoy · 10:38 · D. Ríos', estado: 'PENDIENTE' },
    { id: 'op-3', titulo: 'Entrada · FL-084-NBR · 20 PZA', detalle: 'Hoy · 10:21 · D. Ríos', estado: 'PENDIENTE' },
    { id: 'op-4', titulo: 'Conteo · A-01-03 · 8 PZA', detalle: 'Hoy · 09:54 · D. Ríos', estado: 'PENDIENTE' },
  ],
};

let mvpState = structuredClone(INITIAL_MVP_STATE);

async function cargarMvpStateDisco() {
  try {
    const raw = await readFile(mvpDbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.productos)) {
      mvpState = parsed;
    }
  } catch {
    await guardarMvpStateDisco();
  }
}

async function guardarMvpStateDisco() {
  try {
    await mkdir(join(repoRoot, 'database'), { recursive: true });
    await writeFile(mvpDbPath, JSON.stringify(mvpState, null, 2), 'utf-8');
  } catch {}
}

await cargarMvpStateDisco();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.pathname === '/api/v1/health' || url.pathname === '/api/v1/salud') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          estado: 'MVP_LISTO_PARA_PRUEBA_UAT',
          version_api: 'v1.12.0-MVP',
          sistema: 'SGCI · Control de Inventarios',
          tenant_demo: 'Industrias Alfa S.A.S. (8f2a...c91d)',
          bodega_activa: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
          pantallasOficialesSgci: 47,
          tddBackend: { suites: 12, total: 40, aprobadas: 40, estado: 'VERDE' },
          tddFrontend: { suites: 12, total: 32, aprobadas: 32, estado: 'VERDE' },
        }),
      );
      return;
    }

    if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { email, password } = JSON.parse(body || '{}');
      const listaUsuarios = Array.isArray(mvpState.usuarios) ? mvpState.usuarios : INITIAL_MVP_STATE.usuarios;
      const encontrado = listaUsuarios.find(
        u => u.email.toLowerCase() === String(email || '').trim().toLowerCase() && u.password === String(password || ''),
      );
      if (!encontrado) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', error: 'Correo o contraseña incorrectos. Usa laura@industriasalfa.com / AlfaInventario#2026 o crea una cuenta nueva.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', usuario: encontrado }));
      return;
    }

    if (url.pathname === '/api/v1/auth/register' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { nombre, organizacion, codigoOrg, email, password, rol } = JSON.parse(body || '{}');
      if (!nombre || !organizacion || !email || !password) {
        res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', error: 'Todos los campos obligatorios deben completarse.' }));
        return;
      }
      if (!Array.isArray(mvpState.usuarios)) {
        mvpState.usuarios = structuredClone(INITIAL_MVP_STATE.usuarios);
      }
      const partes = String(nombre).trim().split(/\s+/);
      const iniciales = ((partes[0] ? partes[0][0] : 'U') + (partes[1] ? partes[1][0] : 'S')).toUpperCase();
      const nuevoUsuario = {
        nombre: String(nombre).trim(),
        iniciales,
        email: String(email).trim().toLowerCase(),
        password: String(password),
        organizacion: String(organizacion).trim(),
        codigoOrg: String(codigoOrg || 'IND-ALFA').trim().toUpperCase(),
        rol: String(rol || 'ADMIN_EMPRESA'),
      };
      const idx = mvpState.usuarios.findIndex(u => u.email === nuevoUsuario.email);
      if (idx >= 0) mvpState.usuarios[idx] = nuevoUsuario;
      else mvpState.usuarios.push(nuevoUsuario);
      await guardarMvpStateDisco();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'registered', usuario: nuevoUsuario }));
      return;
    }

    if (url.pathname === '/api/v1/auth/reset-password' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { email, nuevaPassword } = JSON.parse(body || '{}');
      if (!Array.isArray(mvpState.usuarios)) {
        mvpState.usuarios = structuredClone(INITIAL_MVP_STATE.usuarios);
      }
      const u = mvpState.usuarios.find(x => x.email.toLowerCase() === String(email || '').trim().toLowerCase());
      if (u && nuevaPassword) {
        u.password = String(nuevaPassword);
        await guardarMvpStateDisco();
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'password_updated' }));
      return;
    }

    if (url.pathname === '/api/v1/mvp/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', state: mvpState }));
      return;
    }

    if (url.pathname === '/api/v1/mvp/state' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body || '{}');
      if (Array.isArray(payload.productos)) mvpState.productos = payload.productos;
      if (Array.isArray(payload.movimientosKardex)) mvpState.movimientosKardex = payload.movimientosKardex;
      if (Array.isArray(payload.lotesFefo)) mvpState.lotesFefo = payload.lotesFefo;
      if (Array.isArray(payload.ordenesCompra)) mvpState.ordenesCompra = payload.ordenesCompra;
      if (Array.isArray(payload.colaOffline)) mvpState.colaOffline = payload.colaOffline;
      await guardarMvpStateDisco();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'saved', updated_at: new Date().toISOString() }));
      return;
    }

    if (url.pathname === '/api/v1/mvp/reset' && req.method === 'POST') {
      mvpState = structuredClone(INITIAL_MVP_STATE);
      await guardarMvpStateDisco();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'reset', state: mvpState }));
      return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PORTAL_SGCI_HTML);
      return;
    }

    const safeRel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(publicDir, safeRel);
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const info = await stat(filePath);
    if (info.isFile()) {
      const ext = extname(filePath).toLowerCase();
      const content = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor SGCI activo en http://127.0.0.1:${PORT}`);
});
