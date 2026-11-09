/**
 * Definición Declarativa del Enrutador Frontend SGCI (Sección 6.1 de AGENTS.md).
 * Cubre los 10 Sprints y las 78 pantallas diseñadas en Figma con control de acceso RBAC.
 */

export interface DefinicionRutaSgci {
  id: string;
  path: string;
  titulo: string;
  subtitulo: string;
  grupoMenu: 'OPERACION' | 'INVENTARIO' | 'COMERCIAL' | 'GOBERNANZA' | 'FIGMA';
  pantallasFigma: string;
  rolesPermitidos: Array<'admin' | 'seller' | 'superadmin'>;
  icono: string;
}

export const RUTAS_APLICACION_SGCI: DefinicionRutaSgci[] = [
  {
    id: 'dashboard-ejecutivo',
    path: '/dashboard',
    titulo: 'Dashboard Ejecutivo',
    subtitulo: 'KPIs en vivo, valor de inventario, alertas de stock y accesos rápidos',
    grupoMenu: 'OPERACION',
    pantallasFigma: 'Pantallas 01–09',
    rolesPermitidos: ['admin', 'seller'],
    icono: '📊',
  },
  {
    id: 'catalogo-proveedores-clientes',
    path: '/catalogo-maestros',
    titulo: 'Catálogo, Proveedores y Clientes',
    subtitulo: 'Ficha técnica SKU, categorías, bodegas, directorio de proveedores y clientes',
    grupoMenu: 'INVENTARIO',
    pantallasFigma: 'Pantallas 10–20 y 36–41',
    rolesPermitidos: ['admin', 'seller'],
    icono: '📦',
  },
  {
    id: 'kardex-peps',
    path: '/kardex-almacenes',
    titulo: 'Kardex, Lotes FEFO y Racks',
    subtitulo: 'Libro mayor PEPS/CPP, topología de ubicaciones Bin, lotes y recepción OC',
    grupoMenu: 'INVENTARIO',
    pantallasFigma: 'Sprints 1–4 · Pantalla 45',
    rolesPermitidos: ['admin'],
    icono: '🏭',
  },
  {
    id: 'ajustes-conteos',
    path: '/ajustes-conteos',
    titulo: 'Conteos Ciegos y Ajustes',
    subtitulo: 'Auditoría física de bodega, actas de merma y doble firma de aprobación',
    grupoMenu: 'INVENTARIO',
    pantallasFigma: 'Pantallas 42–45 y 78',
    rolesPermitidos: ['admin'],
    icono: '📋',
  },
  {
    id: 'analitica-patrimonial-abc',
    path: '/analitica-patrimonial',
    titulo: 'Analítica Patrimonial y ABC',
    subtitulo: 'Valorización multi-almacén PEPS/UEPS/CPP, ERI y clasificación Pareto ABC',
    grupoMenu: 'INVENTARIO',
    pantallasFigma: 'Pantalla 14 · Analítica ABC',
    rolesPermitidos: ['admin'],
    icono: '📈',
  },
  {
    id: 'facturacion-caja',
    path: '/facturacion-caja',
    titulo: 'Facturación POS y Arqueo de Caja',
    subtitulo: 'Terminal de punto de venta, cobros en efectivo/transferencia y cierre de turno',
    grupoMenu: 'COMERCIAL',
    pantallasFigma: 'Pantallas 21–35, 75 y 76',
    rolesPermitidos: ['admin', 'seller'],
    icono: '💳',
  },
  {
    id: 'impuestos-precios',
    path: '/precios-impuestos',
    titulo: 'Listas de Precios, IVA y CSV',
    subtitulo: 'Reglas de ganancia (recargo/margen), tasas de IVA e importación masiva CSV',
    grupoMenu: 'COMERCIAL',
    pantallasFigma: 'Pantallas 46–52 y 70–74',
    rolesPermitidos: ['admin', 'seller'],
    icono: '🏷️',
  },
  {
    id: 'estados-alertas',
    path: '/alertas-estados',
    titulo: 'Centro de Alertas y Estados PWA',
    subtitulo: 'Notificaciones de stock mínimo, estados vacíos, errores y reconexión',
    grupoMenu: 'OPERACION',
    pantallasFigma: 'Pantallas 53–59, 68–69 y 77',
    rolesPermitidos: ['admin', 'seller'],
    icono: '🔔',
  },
  {
    id: 'gobernanza-reportes',
    path: '/gobernanza-saas',
    titulo: 'Gobernanza SaaS, Planes y Offline',
    subtitulo: 'Planes Emprende/Crece/Pro, Privacidad SuperAdmin, 6 Reportes y Cola IndexedDB',
    grupoMenu: 'GOBERNANZA',
    pantallasFigma: 'Pantallas 60–67 y 70–74',
    rolesPermitidos: ['admin', 'seller', 'superadmin'],
    icono: '🛡️',
  },
  {
    id: 'galeria-figma',
    path: '/galeria-figma-78',
    titulo: 'Biblioteca 78 Pantallas Figma',
    subtitulo: 'Inspección dual Escritorio (1440px) y Móvil (390px) de los 155 PNGs oficiales',
    grupoMenu: 'FIGMA',
    pantallasFigma: 'Pantallas 01–78 (155 PNGs)',
    rolesPermitidos: ['admin', 'seller', 'superadmin'],
    icono: '🎨',
  },
];

export function filtrarRutasPorRol(
  rol: 'admin' | 'seller' | 'superadmin',
): DefinicionRutaSgci[] {
  return RUTAS_APLICACION_SGCI.filter((ruta) => ruta.rolesPermitidos.includes(rol));
}
