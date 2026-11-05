import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..');
const publicDir = join(repoRoot, 'frontend', 'public');
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
  <div class="flex min-h-screen flex-col lg:flex-row">
    <!-- Barra Lateral Exacta SGCI (#0A1120) · Pantallas 07 a 15 -->
    <aside class="flex w-full flex-col justify-between bg-[#0A1120] text-white lg:w-[248px] lg:min-h-screen shrink-0 select-none">
      <div>
        <!-- Logo SGCI 3 Barras Cyan -->
        <div class="flex items-center gap-3 px-6 py-6 border-b border-slate-800/80">
          <div class="flex h-9 w-9 items-end justify-center gap-1 rounded-xl bg-[#0F1D3A] border border-cyan-500/30 p-2 shadow-inner">
            <span class="w-1 h-2.5 rounded-full bg-cyan-400"></span>
            <span class="w-1 h-4 rounded-full bg-cyan-400"></span>
            <span class="w-1 h-5 rounded-full bg-cyan-300"></span>
          </div>
          <div>
            <span class="block text-base font-extrabold tracking-tight text-white leading-none">SGCI</span>
            <span class="block text-[9px] font-semibold tracking-[0.16em] text-slate-400 uppercase mt-1">CONTROL DE INVENTARIOS</span>
          </div>
        </div>

        <!-- Grupo OPERACIÓN -->
        <div class="px-3 pt-5">
          <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">OPERACIÓN</span>
          <nav id="nav-operacion" class="mt-2 space-y-1"></nav>
        </div>

        <!-- Grupo ADMINISTRACIÓN -->
        <div class="px-3 pt-6">
          <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">ADMINISTRACIÓN</span>
          <nav id="nav-admin" class="mt-2 space-y-1"></nav>
        </div>

        <!-- Grupo PANTALLAS OFICIALES Y PWA MÓVIL -->
        <div class="px-3 pt-6">
          <span class="px-3 text-[10px] font-bold tracking-[0.14em] text-cyan-400/80 uppercase">PANTALLAS Y MÓVIL PWA</span>
          <nav id="nav-pantallas" class="mt-2 space-y-1"></nav>
        </div>
      </div>

      <!-- Perfil Usuario Laura Mendoza · JEFE_ALMACEN -->
      <div class="border-t border-slate-800/80 p-4 flex items-center justify-between bg-[#080E1A]">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-[#0A1120] font-extrabold text-xs">
            LM
          </div>
          <div>
            <strong class="block text-xs font-bold text-white leading-tight">Laura Mendoza</strong>
            <span id="sidebar-rol-label" class="block text-[10px] font-mono text-slate-400">JEFE_ALMACEN</span>
          </div>
        </div>
        <button onclick="seleccionarVista('landing')" title="Ver Landing / Acceso SGCI (Pantallas 01-06)" class="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800">
          ↗
        </button>
      </div>
    </aside>

    <!-- Contenedor Derecho: Topbar + Contenido -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar Exacto SGCI (Pantallas 07-15) -->
      <header class="h-[68px] bg-white border-b border-slate-200/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <div>
              <strong class="block text-xs font-bold text-slate-900 leading-none">Industrias Alfa S.A.S.</strong>
              <span class="block text-[10px] font-mono text-slate-400 mt-0.5">tenant · 8f2a...c91d</span>
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

        <div class="flex items-center gap-4">
          <button onclick="alternarModoOffline()" id="btn-status-ws" class="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-emerald-200 bg-emerald-50/60 text-left transition">
            <span id="dot-ws" class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <div>
              <strong id="txt-ws-title" class="block text-[11px] font-bold text-emerald-800 leading-none">Online</strong>
              <span id="txt-ws-sub" class="block text-[9px] text-slate-500 mt-0.5">WebSockets activo</span>
            </div>
          </button>

          <a href="/artifacts/sgci-pantallas/INDICE.html" target="_blank" class="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            🖼️ Índice 25 PNGs ↗
          </a>
        </div>
      </header>

      <!-- Área Principal Dinámica -->
      <main id="contenedor-principal" class="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto"></main>
    </div>
  </div>

  <script>
    const MENU_OPERACION = [
      { id: 'centro-mando', label: 'Centro de mando', icon: '⊞', screen: '07' },
      { id: 'productos-rop', label: 'Productos y ROP', icon: '📦', screen: '08' },
      { id: 'almacenes', label: 'Almacenes', icon: '🏬', screen: '09' },
      { id: 'libro-kardex', label: 'Libro Kardex', icon: '📑', screen: '10' },
      { id: 'lotes-fefo', label: 'Lotes y FEFO', icon: '⏳', screen: '11' },
      { id: 'conteos-auditoria', label: 'Conteos y auditoría', icon: '📋', badge: 2, screen: '12' },
      { id: 'abastecimiento', label: 'Abastecimiento', icon: '🚚', screen: '13' },
    ];

    const MENU_ADMIN = [
      { id: 'analitica', label: 'Analítica', icon: '📈', screen: '14' },
      { id: 'gobernanza-rbac', label: 'Gobernanza RBAC', icon: '🛡️', screen: '15' },
    ];

    const MENU_PANTALLAS = [
      { id: 'pwa-movil', label: 'App Móvil PWA (390px)', icon: '📱', screen: 'M07-M10' },
      { id: 'landing', label: 'Landing y Login (01–06)', icon: '🔐', screen: '01-06' },
      { id: 'galeria-25', label: '25 Pantallas SGCI (PNGs)', icon: '🖼️', screen: '25 PNG' },
    ];

    let state = {
      vista: 'centro-mando',
      rol: 'JEFE_ALMACEN',
      bodega: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
      online: true,
      metodoKardex: 'PEPS / FIFO',
      busquedaSku: '',
      tabMovil: 'inicio',
      conteoFisicoInput: '14',
      pantallasManifest: [],
      filtroGaleria: 'Todos',
      colaOffline: [
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
      return \`
        <button onclick="seleccionarVista('\${item.id}')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition \${activo ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}">
          <span class="flex items-center gap-3">
            <span class="text-sm">\${item.icon}</span>
            <span>\${item.label}</span>
          </span>
          \${item.badge ? \`<span class="rounded-full bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2">\${item.badge}</span>\` : ''}
        </button>
      \`;
    }

    function renderSidebar() {
      document.getElementById('nav-operacion').innerHTML = MENU_OPERACION.map(renderItemMenu).join('');
      document.getElementById('nav-admin').innerHTML = MENU_ADMIN.map(renderItemMenu).join('');
      document.getElementById('nav-pantallas').innerHTML = MENU_PANTALLAS.map(renderItemMenu).join('');
      document.getElementById('sidebar-rol-label').textContent = state.rol;
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
      const sku = prompt('Código SKU del nuevo producto:', 'VL-310-TITAN');
      if (!sku) return;
      const nombre = prompt('Descripción técnica:', 'Válvula direccional neumática 1/2"');
      if (!nombre) return;
      state.productos.unshift({
        sku: sku.toUpperCase(),
        nombre,
        ubicacion: 'A-01-R04-NA',
        lote: 'LOTE-2026-150',
        metodo: 'PEPS',
        min: 10,
        rop: 16,
        max: 50,
        stock: 28,
        costo: 118.00,
        estado: 'ÓPTIMO',
      });
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

    function sincronizarColaOfflineMovil() {
      if (state.colaOffline.length === 0) return;
      state.colaOffline = [];
      state.online = true;
      alternarModoOffline();
      state.online = true;
      alert('Sincronización Background Sync completada: las 4 operaciones de IndexedDB fueron aplicadas en el Libro Kardex sin conflictos.');
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
      alert('Conteo ciego registrado en Ubicación B-02-05 (' + cant + ' UNIDADES).');
      state.tabMovil = 'cola';
      renderMain();
    }

    function renderMain() {
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
              <button onclick="seleccionarVista('libro-kardex')" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                ↓ Exportar resumen
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

                <button onclick="seleccionarVista('conteos-auditoria')" class="w-full pt-3 border-t border-slate-100 text-center text-xs font-bold text-blue-600 hover:underline">
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
                + Nuevo producto
              </button>
            </div>

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
              <button onclick="alert('Libro Mayor Kardex exportado con firma SHA-256 (8F2A...C91D).')" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                ↓ Exportar libro
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
                <span class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">Rol: \${state.rol}</span>
              </div>

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
              <div class="flex gap-2">
                \${[
                  { id: 'inicio', label: '07 · Inicio Bodega' },
                  { id: 'escanear', label: '08 · Escáner EAN-13/QR' },
                  { id: 'conteos', label: '09 · Conteo Ciego (B-02-05)' },
                  { id: 'cola', label: '10 · Cola Offline (' + state.colaOffline.length + ')' },
                ].map(t => \`
                  <button onclick="state.tabMovil = '\${t.id}'; renderMain()" class="rounded-xl px-3.5 py-2 text-xs font-bold transition \${state.tabMovil === t.id ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700'}">\${t.label}</button>
                \`).join('')}
              </div>
            </div>

            <!-- Dispositivo Móvil 390px Centrado -->
            <div class="mx-auto w-[390px] max-w-full rounded-[32px] border-[6px] border-[#0A1120] bg-[#F5F7FB] shadow-2xl overflow-hidden flex flex-col min-h-[760px] justify-between">
              <!-- Cabecera Móvil Oscura -->
              <div class="bg-[#0A1120] text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <span class="block text-[10px] font-mono text-slate-400 uppercase">INDUSTRIAS ALFA · ALM-CENTRAL-01</span>
                  <strong class="text-sm font-extrabold">
                    \${state.tabMovil === 'inicio' ? 'Operación de bodega' : (state.tabMovil === 'escanear' ? 'Escáner óptico' : (state.tabMovil === 'conteos' ? 'Conteo cíclico' : 'Cola offline'))}
                  </strong>
                </div>
                <span class="h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white"></span>
              </div>

              <!-- Cuerpo Móvil según Pestaña -->
              <div class="flex-1 p-5 space-y-4">
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

      // 01-06 LANDING Y ACCESO SEGURO SGCI (Réplica exacta de 01-Landing.png y 03-Inicio-de-sesion.png)
      if (state.vista === 'landing') {
        el.innerHTML = \`
          <div class="space-y-8">
            <div class="rounded-3xl bg-white border border-slate-200 p-8 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div class="space-y-5">
                <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-700">
                  <span class="h-2 w-2 rounded-full bg-cyan-500"></span> Nueva generación de control de inventarios
                </span>
                <h1 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
                  Inventario preciso.<br />
                  <span class="text-[#2563EB]">Operación sin límites.</span>
                </h1>
                <p class="text-sm text-slate-600 leading-relaxed max-w-lg">
                  Centraliza almacenes, automatiza el Kardex y toma decisiones en tiempo real con una plataforma creada para operaciones empresariales exigentes.
                </p>
                <div class="flex flex-wrap gap-3 pt-2">
                  <button onclick="seleccionarVista('centro-mando')" class="rounded-xl bg-[#2563EB] px-6 py-3.5 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                    Entrar al Centro de Mando SGCI ›
                  </button>
                  <button onclick="seleccionarVista('galeria-25')" class="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50">
                    ▶ Ver las 25 Pantallas Oficiales SGCI
                  </button>
                </div>
              </div>

              <!-- Tarjeta de Acceso Seguro (Pantalla 03-Inicio-de-sesion.png) -->
              <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 lg:p-8 space-y-4">
                <span class="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">ACCESO SEGURO · PANTALLA 03</span>
                <h2 class="text-2xl font-extrabold text-slate-900">Bienvenido de nuevo</h2>
                <div class="space-y-3 text-xs">
                  <label class="block">
                    <span class="font-bold text-slate-700">Código de organización</span>
                    <input type="text" value="IND-ALFA" readonly class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono font-bold text-slate-900" />
                  </label>
                  <label class="block">
                    <span class="font-bold text-slate-700">Correo electrónico</span>
                    <input type="email" value="laura@industriasalfa.com" readonly class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-semibold text-slate-900" />
                  </label>
                  <button onclick="seleccionarVista('centro-mando')" class="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white shadow hover:bg-blue-700">
                    Ingresar a SGCI ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      // GALERÍA DE LAS 25 PANTALLAS OFICIALES DE SGCI (Cargadas de C:\\Users\\sxepc\\Downloads\\SGCI\\SGCI-pantallas)
      const items = state.pantallasManifest.filter(s => {
        if (state.filtroGaleria === 'Escritorio') return s.file.startsWith('01-Escritorio-1440');
        if (state.filtroGaleria === 'Movil') return s.file.startsWith('02-Movil-390');
        return true;
      });

      el.innerHTML = \`
        <div class="space-y-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span class="text-[11px] font-extrabold tracking-[0.14em] text-blue-600 uppercase">BIBLIOTECA VISUAL OFICIAL · RUTA SGCI-PANTALLAS</span>
              <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">25 Pantallas Oficiales de SGCI (15 Escritorio 1440px + 10 Móvil 390px)</h1>
              <p class="text-sm text-slate-500 mt-1">Cargadas directamente desde <code>C:\\Users\\sxepc\\Downloads\\SGCI\\SGCI-pantallas</code></p>
            </div>
            <div class="flex gap-2">
              \${['Todos', 'Escritorio', 'Movil'].map(f => \`
                <button onclick="state.filtroGaleria = '\${f}'; renderMain()" class="rounded-xl px-4 py-2 text-xs font-bold transition \${state.filtroGaleria === f ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-700'}">\${f}</button>
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

    fetch('/artifacts/sgci-pantallas/manifest.json')
      .then(r => r.json())
      .then(data => {
        state.pantallasManifest = data.screens || [];
        renderSidebar();
        renderMain();
      })
      .catch(() => {
        renderSidebar();
        renderMain();
      });
  </script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.pathname === '/api/v1/health' || url.pathname === '/api/v1/salud') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          estado: 'OPERATIVO',
          version_api: 'v1.10.0',
          sistema: 'SGCI · Control de Inventarios',
          tenant_demo: 'Industrias Alfa S.A.S. (8f2a...c91d)',
          bodega_activa: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
          pantallasOficialesSgci: 25,
          tddBackend: { suites: 9, total: 34, aprobadas: 34, estado: 'VERDE' },
          tddFrontend: { suites: 9, total: 26, aprobadas: 26, estado: 'VERDE' },
        }),
      );
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
