# Prompts para construir la interfaz del SGCI en Figma (Atomic Design + Aurora Mist)

- **Proyecto:** SGCI — Sistema de Gestión de Control de Inventarios (SaaS Multi-Tenant)
- **Arquitectura UI:** Atomic Design (`Átomos`, `Moléculas`, `Organismos`) + Screaming Architecture (9 Módulos)
- **Paleta Oficial:** Aurora Mist (`#203959`, `#416772`, `#96ADA5`, `#ABB7B3`, `#839492`)
- **Formatos:** Escritorio Denso (`1440 × 900`) y PWA Mobile-First Bodega (`390 × 844`, objetivos táctiles $\ge 44\text{px}$)

---

## Cómo usar este archivo en Figma Make / First Draft

No pegues todo de una sola vez: un prompt único demasiado extenso hace que Figma simplifique las tablas y omita estados críticos. Este documento está dividido en **6 bloques secuenciales**:

1. **Bloque 1 (Variables de Color y Medidas):** Crea la colección `Aurora Mist` y los tokens de espaciado/radios.
2. **Bloque 2 (Tipografía y Numeración Tabular):** Define la escala tipográfica con `tabular-nums` para que las columnas de cantidades y costos en el Kardex alineen al milímetro.
3. **Bloque 3 (Componentes Atomic Design):** Construye los Átomos (`BotonAurora`, `CampoTextoAurora`), Moléculas (`SelectorTenantAlmacen`, `TarjetaIndicadorStock`, `BuscadorEscanerSku`) y Organismos (`TablaKardexAlmacen`, `MapaUbicacionesRack`).
4. **Bloque 4 (Estructura de Páginas del Archivo):** Organiza las 6 páginas del documento Figma.
5. **Bloque 5 (Pantallas de Escritorio `1440 × 900`):** Diseña las vistas densas para Jefes de Almacén, Contadores de Costos, Compradores y Administradores Tenant.
6. **Bloque 6 (Pantallas Móviles PWA Bodega `390 × 844`):** Diseña las vistas de pasillo/muelle con escáner QR/EAN-13, recepción de órdenes de compra, conteos cíclicos ciegos y cola offline (`IndexedDB`).

---

## Bloque 1 — Variables de Color (Paleta Oficial Aurora Mist) y Medidas

> Crea una colección de variables de Figma llamada `Aurora Mist` con un modo llamado `Institucional`. Añade exactamente estas variables de tipo color con estos nombres y valores hexadecimales. No inventes colores fuera de esta lista:
>
> **Núcleo Oficial Aurora Mist (5 Tonos Canónicos)**
> - `aurora-profundo`: `#203959` *(Navegación lateral, encabezados, barra de contexto Multi-Tenant y fondos profundos)*
> - `aurora-primario`: `#416772` *(Acciones principales, botones primarios, controles activos y gráficas)*
> - `aurora-acento`: `#96ADA5` *(Acentos visuales, indicadores de estado, badges secundarios y resaltados)*
> - `aurora-contraste`: `#ABB7B3` *(Texto claro y contenido legible sobre fondos `#203959`)*
> - `aurora-desactivado`: `#839492` *(Textos secundarios, bordes de formularios y controles deshabilitados)*
>
> **Superficies Operativas Derivadas**
> - `superficie-lienzo`: `#F4F7F6` *(Fondo general de la aplicación en escritorio y móvil)*
> - `superficie-tarjeta`: `#FFFFFF` *(Fondo de tarjetas, tablas y paneles modales)*
> - `superficie-hover`: `#E9F0EE` *(Fila de tabla seleccionada o estado hover sutil)*
> - `borde-sutil`: `#D5DEDB` *(Divisores de filas en tabla Kardex y bordes de tarjeta)*
>
> **Semáforo de Inventario, Lotes y Auditoría (WCAG AA)**
> - `estado-optimo-texto`: `#15624A` · `estado-optimo-fondo`: `#E6F0EB` *(Stock Óptimo / Lote Vigente)*
> - `estado-reorden-texto`: `#8A5214` · `estado-reorden-fondo`: `#F7EEE0` *(Punto de Reorden ROP / Lote Próximo a Vencer $\le 30$ días)*
> - `estado-critico-texto`: `#9C2F28` · `estado-critico-fondo`: `#F6E8E7` *(Stock Crítico $\le$ Mínimo / Lote Vencido / Discrepancia de Conteo)*
> - `estado-transito-texto`: `#203959` · `estado-transito-fondo`: `#E3EFF1` *(Mercancía en Tránsito Inter-Almacén / Sincronizando Offline)*
>
> Crea además una colección de variables numéricas llamada `Medidas SGCI`:
> - `touch-bodega`: `44` *(Altura y anchura mínima obligatoria para controles táctiles en PWA móvil con guantes)*
> - `alto-control-desktop`: `36`
> - `radio-tarjeta`: `12` · `radio-control`: `8` · `radio-insignia`: `999`
> - `espacio-1`: `4` · `espacio-2`: `8` · `espacio-3`: `12` · `espacio-4`: `16` · `espacio-5`: `24` · `espacio-6`: `32`

---

## Bloque 2 — Estilos de Texto y Numeración Contable

> Crea los estilos de texto usando la familia **Inter** para interfaz y **JetBrains Mono** para códigos SKU, EAN-13, lotes, UUIDs de Tenant y cifras contables del Kardex:
>
> | Nombre del Estilo | Familia | Tamaño (px) | Peso | Interlineado (px) | Variable de Color | Uso Principal |
> | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
> | `Titulo/Pantalla` | Inter | 22 | 700 | 30 | `aurora-profundo` | Encabezado de vista principal |
> | `Titulo/Seccion` | Inter | 16 | 600 | 24 | `aurora-profundo` | Títulos de tarjetas y paneles |
> | `KPI/ValorGrande` | Inter | 28 | 700 | 34 | `aurora-profundo` | Indicadores superiores (ERI %, Valor Total) |
> | `Cuerpo/Regular` | Inter | 14 | 400 | 20 | `aurora-profundo` | Texto general en escritorio |
> | `Cuerpo/MóvilInput` | Inter | 16 | 500 | 24 | `aurora-profundo` | Campos de formulario en móvil (evita zoom iOS) |
> | `Etiqueta/Campo` | Inter | 12 | 600 | 16 | `aurora-profundo` | Labels visibles encima de cada input |
> | `Tabla/Cabecera` | Inter | 11 | 700 | 16 | `aurora-primario` | Encabezados de columna en tabla Kardex |
> | `Auxiliar/Secundario` | Inter | 12 | 400 | 16 | `aurora-desactivado` | Textos de ayuda y marcas temporales |
> | `Mono/SKU-Lote` | JetBrains Mono | 12 | 600 | 16 | `aurora-profundo` | Códigos `SKU`, `EAN-13`, `Lote`, `Bin Location` |
> | `Mono/CifraKardex` | JetBrains Mono | 13 | 600 | 18 | `aurora-profundo` | Cantidades (4 decimales) y Costos Unitarios/Saldos |
> | `Insignia/Estado` | Inter | 11 | 600 | 14 | Hereda del estado | Badges de semáforo de stock y roles RBAC |
>
> **Regla obligatoria:** Activa `tabular-nums` en `KPI/ValorGrande` y `Mono/CifraKardex` para que las unidades (`1,250.0000`) y los saldos valorizados (`$ 45,890.50`) queden alineados a la derecha en todas las tablas.

---

## Bloque 3 — Librería de Componentes (Atomic Design: Átomos, Moléculas y Organismos)

> En una página llamada `03 · Componentes (Atomic Design)`, construye los siguientes componentes maestros con Auto Layout y variantes usando exclusivamente las variables de `Aurora Mist`:
>
> ### 1. Átomos (`src/diseno/atomos/`)
> - **`BotonAurora`:**
>   - Altura mínima `44px` (`touch-bodega`), radio `radio-control` (`8px`), padding horizontal `16px`, icono opcional a la izquierda.
>   - Variantes `variante`:
>     - `primario`: fondo `aurora-primario` (`#416772`), texto blanco.
>     - `profundo`: fondo `aurora-profundo` (`#203959`), texto `aurora-contraste` (`#ABB7B3`).
>     - `secundario`: fondo `aurora-acento` (`#96ADA5`), texto `aurora-profundo` (`#203959`) en negrita.
>     - `fantasma`: fondo transparente, borde `1px` `aurora-desactivado` (`#839492`), texto `aurora-profundo`.
>     - `peligro`: fondo `#9C2F28`, texto blanco.
>     - `desactivado`: fondo `aurora-desactivado` (`#839492`), texto blanco, opacidad 65%.
> - **`CampoTextoAurora`:**
>   - Estructura vertical: Etiqueta superior (`Etiqueta/Campo` + asterisco rojo si es obligatorio) + Caja de entrada (`min-h: 44px`, fondo `superficie-tarjeta`, radio `8px`, texto `16px`) + Texto inferior de ayuda o alerta de error con icono.
>   - Variantes `estado`: `normal` (borde `aurora-desactivado`), `foco` (borde `2px` `aurora-primario`), `error` (borde `2px` `estado-critico-texto` + mensaje `role="alert"`), `desactivado` (fondo `superficie-lienzo`).
> - **`InsigniaEstadoAurora`:**
>   - Píldora (`radio-insignia`), altura `22px`, icono semántico + texto obligatorio en mayúsculas compactas: `ÓPTIMO`, `PUNTO REORDEN`, `STOCK CRÍTICO`, `SOBRESTOCK`, `LOTE POR VENCER`, `EN TRÁNSITO`, `SINCRONIZADO`, `PENDIENTE OFFLINE`.
>
> ### 2. Moléculas (`src/diseno/moleculas/`)
> - **`SelectorTenantAlmacen`:**
>   - Barra horizontal con fondo `aurora-profundo` (`#203959`), texto `aurora-contraste` (`#ABB7B3`), borde `aurora-primario`.
>   - Muestra a la izquierda: indicador verde activo, nombre de la empresa (`Industrias Alfa S.A.S.`), UUID resumido del `tenant_id` en fuente `Mono/SKU-Lote`, e insignia del rol RBAC activo (ej. `JEFE_ALMACEN`).
>   - Muestra a la derecha: selector desplegable de **Bodega Activa** (`ALM-CENTRAL-01 — Bodega Central Monterrey`) e indicador de estado de conexión PWA (`Online · WebSockets Activo` o `Modo Offline Bodega · 3 mov. en cola`).
> - **`TarjetaIndicadorStock`:**
>   - Tarjeta (`superficie-tarjeta`, borde `1px` `borde-sutil`, radio `12px`, padding `16px`) que resume un SKU en una bodega:
>   - Cabecera: código `SKU` en `Mono/SKU-Lote` (`AC-100-FLEX`), nombre del producto, ubicación física (`Zona A · Pasillo 04 · Rack 02 · Nivel B`) e `InsigniaEstadoAurora` (`STOCK CRÍTICO` / `ÓPTIMO`).
>   - Cuerpo: Barra de progreso horizontal comparando `Stock Disponible` vs `Stock Mínimo`, `Punto de Reorden (ROP)` y `Stock Máximo`; cifras de `Disponible`, `Reservado` y `Costo Promedio / Capa PEPS`.
>   - Alerta de Lote (condicional): Franja inferior con número de lote más próximo a vencer (`LOTE-2026-089 · Vence en 12 días · Prioridad FEFO`).
>   - Pie de acciones rápidas: botones `Ver Kardex`, `Reordenar` y `Conteo Ciego`.
> - **`BuscadorEscanerSku`:**
>   - Barra combinada con input de búsqueda (`SKU`, `EAN-13`, `QR` o nombre de producto) + selector de filtro por categoría + botón táctil de `44px` `Escanear EAN-13 / QR` con icono de lector láser en `aurora-primario` (`#416772`).
>
> ### 3. Organismos (`src/diseno/organismos/`)
> - **`TablaKardexAlmacen`:**
>   - Organismo con dos variantes de visualización (`Modo: Escritorio 1440px` y `Modo: Móvil Bodega 390px`):
>   - **Cabecera del organismo:** Selector de método de valoración activo (`PEPS / FIFO`, `UEPS / LIFO`, `PROMEDIO PONDERADO`), buscador por documento/lote/operador, filtro por tipo de movimiento (`TODOS`, `ENTRADA_COMPRA`, `SALIDA_DESPACHO`, `TRANSFERENCIA`, `AJUSTE`, `MERMA`) y botón `Exportar Libro Kardex`.
>   - **En Escritorio:** Tabla densa con columnas: `Fecha/Hora UTC`, `Documento Origen` (`OC-2026-0041`), `Tipo Movimiento`, `Lote / Vencimiento`, `Entrada (Cant / Costo Unit.)`, `Salida (Cant / Costo Unit.)`, `Saldo Cantidad`, `Saldo Costo Unit.`, `Saldo Valorizado Total` y `Operador`.
>   - **En Móvil Bodega (390px):** Lista de tarjetas táctiles apiladas sin scroll horizontal, destacando el signo `+ / -` de unidades, el documento de referencia, el lote y el saldo resultante.
> - **`MapaUbicacionesRack`:**
>   - Organismo visual para topología de almacenes (`Zona` $\rightarrow$ `Pasillo` $\rightarrow$ `Rack` $\rightarrow$ `Nivel` $\rightarrow$ `Posición Bin`), mostrando celdas con porcentaje de ocupación volumétrica/unidades, código `ZONA-A-P04-R02-N01` y botón de transferencia inter-almacén.
> - **`NavegacionLateralAurora` (Escritorio) y `BarraInferiorBodega` (Móvil):**
>   - Menú lateral izquierdo de `256px` de ancho con fondo `aurora-profundo` (`#203959`), textos en `aurora-contraste` (`#ABB7B3`), ítem activo con fondo `aurora-primario` (`#416772`) y borde izquierdo de `4px` en `aurora-acento` (`#96ADA5`).

---

## Bloque 4 — Estructura de Páginas del Archivo Figma

> Organiza el documento Figma en estas 6 páginas exactamente en este orden:
> 1. `01 · Cubierta` — Portada ejecutiva con título `SGCI — Sistema de Gestión de Control de Inventarios (SaaS Multi-Tenant)`, arquitectura `Laravel 11 + Vue 3 + PostgreSQL/Prisma`, y las 5 muestras oficiales de la paleta **Aurora Mist** (`#203959`, `#416772`, `#96ADA5`, `#ABB7B3`, `#839492`).
> 2. `02 · Fundamentos` — Paleta de color, matriz de contraste WCAG AA, escala tipográfica `Inter` + `JetBrains Mono` y rejilla de espaciado.
> 3. `03 · Componentes (Atomic Design)` — Átomos, Moléculas y Organismos reutilizables.
> 4. `04 · Escritorio Denso (1440×900)` — Pantallas administrativas, contables y de supervisión multi-almacén.
> 5. `05 · Móvil PWA Bodega (390×844)` — Pantallas operativas de pasillo, muelle de recepción, escáner óptico y conteo cíclico ciego offline.
> 6. `06 · Prototipo y Flujos RBAC` — Conexiones interactivas entre pantallas según el rol del usuario.

---

## Bloque 5 — Pantallas de Escritorio Denso (`1440 × 900`)

> En la página `04 · Escritorio Denso (1440×900)`, genera estos 8 marcos usando la plantilla estándar de escritorio: `NavegacionLateralAurora` (`256px` a la izquierda en `#203959`), `SelectorTenantAlmacen` en la franja superior (`64px` de alto) y área de trabajo sobre `superficie-lienzo` (`#F4F7F6`) con padding de `24px`:
>
> 1. **`D-01 · Acceso Multi-Tenant (Login)`:**
>    - Fondo completo en `aurora-profundo` (`#203959`) con sutil retícula técnica. Tarjeta central blanca (`440px` de ancho) con badge superior `SGCI · Control de Inventarios SaaS`, campos `CampoTextoAurora` para: `Código de Organización (Tenant)` (`IND-ALFA`), `Correo Electrónico Corporativo` y `Contraseña`, alerta de validación accesible y botón primario de ancho completo `Iniciar Sesión Segura` en `#416772`.
> 2. **`D-02 · Centro de Mando e Indicadores (Dashboard Inventario)`:**
>    - Fila superior con 4 KPIs: `Exactitud de Registro (ERI): 99.4%`, `Valor Patrimonial del Inventario: $ 1,482,900.00`, `SKUs en Stock Crítico: 7 alertas`, `Lotes Próximos a Vencer (<= 30 días): 12 lotes`.
>    - Centro: Cuadrícula de moléculas `TarjetaIndicadorStock` mostrando productos en estado crítico/reorden a la izquierda, y panel de **Alertas en Tiempo Real (WebSockets)** a la derecha con eventos en vivo (`hace 2 min · Bodega Norte · SKU AC-100-FLEX descendió a 5 PZA`).
> 3. **`D-03 · Catálogo Maestro de Productos y Puntos de Reorden`:**
>    - Barra de herramientas con `BuscadorEscanerSku` (`SKU / EAN-13 / QR`), filtro por categoría, unidad de medida y estado.
>    - Tabla densa con columnas: `SKU`, `Código EAN-13/QR`, `Producto`, `Categoría`, `UoM`, `Método Costeo` (`PEPS` / `CPP`), `Stock Mínimo`, `Punto Reorden (ROP)`, `Stock Máximo`, `Existencia Total` y `Estado`.
> 4. **`D-04 · Topología de Almacenes, Zonas y Ubicaciones (Bin Locations)`:**
>    - Vista dividida: a la izquierda árbol jerárquico de almacenes del Tenant (`Bodega Central Monterrey` $\rightarrow$ `Zona A: Frío`, `Zona B: Seco` $\rightarrow$ `Pasillo 01 a 08` $\rightarrow$ `Rack / Nivel / Posición`); a la derecha organismo `MapaUbicacionesRack` con código de colores Aurora Mist y modal de **Transferencia Inter-Almacén** con estados `SOLICITADA`, `EN TRÁNSITO` y `RECIBIDA`.
> 5. **`D-05 · Libro Mayor de Kardex y Valoración Contable (PEPS / UEPS / CPP)`:**
>    - Instancia completa del organismo `TablaKardexAlmacen` en modo escritorio, acompañada en la parte superior por un comparador de capas de costo PEPS (mostrando cada lote de entrada, fecha de ingreso, cantidad original, saldo remanente, costo unitario de entrada y subtotal valorizado).
> 6. **`D-06 · Control de Lotes, Series y Semáforo FEFO`:**
>    - Tabla especializada por lote sanitario/industrial: `Número de Lote`, `Producto (SKU)`, `Almacén / Ubicación Bin`, `Fecha Fabricación`, `Fecha Vencimiento`, `Días Restantes`, `Prioridad de Despacho FEFO (#1, #2)` y acciones para colocar un lote en `CUARENTENA`.
> 7. **`D-07 · Conciliación de Auditoría y Conteos Físicos Ciegos`:**
>    - Pantalla para `AUDITOR_INVENTARIO`, `JEFE_ALMACEN` y `CONTADOR_COSTOS`. Muestra la tabla comparativa tras un conteo físico en bodega: `SKU`, `Ubicación`, `Cantidad en Sistema` (revelada solo en conciliación), `Cantidad Contada en PWA`, `Diferencia Unidades`, `Impacto Monetario ($)` y flujo de **Doble Firma de Autorización** para generar automáticamente el asiento de ajuste en el Kardex.
> 8. **`D-08 · Gobernanza del Tenant y Matriz de Usuarios (RBAC 10 Roles)`:**
>    - Panel exclusivo para `ADMIN_TENANT` y `SUPER_ADMIN_SAAS`: configuración del método de valoración contable por defecto, política de stock negativo, cuotas de almacenes/usuarios y tabla de usuarios con asignación de los **10 Roles RBAC** (`SUPER_ADMIN_SAAS`, `ADMIN_TENANT`, `GERENTE_OPERACIONES`, `JEFE_ALMACEN`, `SUPERVISOR_INVENTARIO`, `ALMACENISTA_OPERADOR`, `COMPRADOR_ABASTECIMIENTO`, `AUDITOR_INVENTARIO`, `CONTADOR_COSTOS`, `VISOR_CONSULTA`) y bodegas autorizadas.

---

## Bloque 6 — Pantallas Móviles PWA Bodega (`390 × 844` — Uso con Una Mano y Guantes)

> En la página `05 · Móvil PWA Bodega (390×844)`, crea estos 5 marcos diseñados para terminales portátiles rugerizadas y smartphones en pasillo de almacén. Todos los botones, selectores y filas accionables miden mínimo **`44px` de alto** (`touch-bodega`), sin scroll horizontal y con barra de navegación inferior de 4 destinos (`Inicio`, `Escanear`, `Conteos`, `Cola Offline`):
>
> 1. **`M-01 · Acceso Móvil de Operador (PWA Login 390px)`:**
>    - Versión móvil compacta de `PaginaInicioSesion.vue` con fondo `#203959`, campos de `16px` de fuente para evitar zoom automático en iOS/Android, y botón de acceso rápido.
> 2. **`M-02 · Escáner Óptico EAN-13 / QR en Pasillo (2 Toques)`:**
>    - Mitad superior: visor de cámara activa con recuadro de enfoque láser en color `aurora-acento` (`#96ADA5`), botón de linterna y selector `EAN-13 / QR Lote`.
>    - Mitad inferior (Hoja inferior / Bottom Sheet): ficha instantánea del producto recién escaneado (`AC-100-FLEX · Válvula de Presión 2"`), ubicación exacta (`Pasillo A · Rack 04 · Nivel 02`), lote sugerido por regla **FEFO** (`Usar primero LOTE-2026-089`) y dos botones grandes de `48px`: `Registrar Entrada` y `Registrar Salida / Picking`.
> 3. **`M-03 · Recepción de Orden de Compra en Muelle`:**
>    - Cabecera con número de orden (`OC-2026-0118 · Proveedor: Aceros del Norte`), barra de progreso de bultos escaneados (`18 de 20 recibidos`), lista de renglones con botones táctiles `+ / -`, captura de lote y fecha de vencimiento en el acto, y botón final `Confirmar Recepción / Levantar Acta de Discrepancia`.
> 4. **`M-04 · Conteo Cíclico Ciego en Pasillo (Sin Stock Teórico)`:**
>    - Diseñado para `AUDITOR_INVENTARIO` y `ALMACENISTA_OPERADOR`. Muestra la ubicación a verificar (`Pasillo B · Rack 02 · Bin 05`) y el SKU esperado, pero **oculta deliberadamente la cantidad del sistema** (muestra un badge `CONTEO CIEGO · CANTIDAD SISTEMA OCULTA`) para obligar a un conteo físico imparcial. Incluye teclado numérico grande y botón `Confirmar Conteo de Ubicación`.
> 5. **`M-05 · Cola de Sincronización Offline PWA (IndexedDB)`:**
>    - Banner superior de estado de red: `Sin conexión Wi-Fi en Bodega Fría · Guardando en IndexedDB local`.
>    - Lista de movimientos y conteos registrados sin conexión con insignia `PENDIENTE OFFLINE` o `SINCRONIZADO`, marca de tiempo local, firma del operador y botón primario `Sincronizar Ahora con Servidor Central (4 pendientes)`.

---

## Reglas de Restricción (Pegar al final de cada bloque en Figma)

> **Restricciones Estrictas de Diseño SGCI:**
> 1. **Fidelidad a la Paleta Aurora Mist:** Usa únicamente `#203959` (profundo), `#416772` (acción primaria), `#96ADA5` (acento), `#ABB7B3` (contraste sobre fondo oscuro) y `#839492` (secundario/bordes/desactivado), junto con los colores semánticos de alerta. No uses azules eléctricos ni morados genéricos.
> 2. **Inmutabilidad del Kardex:** En ninguna pantalla del Kardex debe existir un botón de «Editar movimiento» o «Borrar fila». El libro mayor de Kardex es inmutable (*append-only*); las correcciones se realizan mediante un nuevo movimiento de ajuste autorizado.
> 3. **Visibilidad Multi-Tenant y RBAC:** Todas las pantallas autenticadas deben mostrar en la barra superior el nombre del **Tenant activo**, su identificador y el badge con uno de los **10 Roles RBAC** canónicos, además del selector de **Bodega Activa**.
> 4. **Accesibilidad WCAG 2.1 AA:** Ningún estado se comunica solo con color: toda insignia lleva icono + etiqueta textual explícita (`STOCK CRÍTICO`, `PUNTO REORDEN`, `ÓPTIMO`). En móvil (`390px`), todo objetivo táctil tiene al menos `44 × 44 px`.
> 5. **Datos Reales de Inventario:** No uses textos *«Lorem ipsum»*. Usa datos industriales verosímiles: `SKU: AC-100-FLEX`, `Válvula de Presión Industrial 2"`, `LOTE-2026-089`, `Bodega Central Monterrey`, `PEPS / FIFO`, y montos formateados con numeración tabular.
