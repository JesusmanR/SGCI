# Protocolo y Guía Operativa de Agentes — SGCI
## Sistema de Gestión de Control de Inventarios (Multi-Tenant SaaS)

Bienvenido al repositorio central de **SGCI (Sistema de Gestión de Control de Inventarios)**. Este documento establece las directrices arquitectónicas, estándares de desarrollo, convenciones de código y reglas de interacción obligatorias para todos los agentes de software y desarrolladores que operen en este espacio de trabajo.

---

## 1. Misión y Alcance del Repositorio

SGCI es una plataforma empresarial SaaS Multi-Tenant de alto rendimiento, diseñada para el control exhaustivo de inventarios, trazabilidad de lotes con fechas de vencimiento, valoración multialmacén mediante libro mayor (Kardex inmutable), gestión de adquisiciones y conteos cíclicos con capacidades PWA Offline-First.

- **Directorio raíz del proyecto:** [C:/dev/SGCI](file:///C:/dev/SGCI)
- **Documentación de arquitectura y ADRs:** [docs/02-arquitectura-sistema-adr.md](file:///C:/dev/SGCI/docs/02-arquitectura-sistema-adr.md)
- **Backend (Laravel 11 / PHP 8.2+):** [backend/](file:///C:/dev/SGCI/backend)
- **Frontend (Vue 3 / TypeScript / Pinia):** [frontend/](file:///C:/dev/SGCI/frontend)
- **Definición de Datos (Prisma / PostgreSQL):** [database/prisma/schema.prisma](file:///C:/dev/SGCI/database/prisma/schema.prisma)

---

## 2. Roles de Agentes y Gobernanza de Tareas

Cada agente asignado a este repositorio debe operar estrictamente dentro de su dominio de especialidad, sin modificar archivos asignados a otros roles salvo expresa coordinación.

| Rol de Agente | Especialidad y Responsabilidades | Archivos y Rutas Asignadas |
|---|---|---|
| `system-architect` | Diseño de arquitectura, ADRs, contratos DTO transversales, gobernanza del repositorio | [AGENTS.md](file:///C:/dev/SGCI/AGENTS.md), [docs/](file:///C:/dev/SGCI/docs) |
| `database-specialist` | Modelado relacional PostgreSQL, esquema declarativo Prisma, migraciones Eloquent, índices y seeds | [database/prisma/](file:///C:/dev/SGCI/database/prisma), [backend/database/](file:///C:/dev/SGCI/backend/database) |
| `backend-dev` | Lógica de negocio Screaming Architecture, servicios de dominio, controladores, observadores, estrategias | [backend/app/Modulos/](file:///C:/dev/SGCI/backend/app/Modulos), [backend/routes/](file:///C:/dev/SGCI/backend/routes) |
| `frontend-dev` | SPA/PWA con Vue 3, Pinia, Tailwind CSS, Atomic Design, Service Worker offline | [frontend/src/](file:///C:/dev/SGCI/frontend/src), [frontend/public/](file:///C:/dev/SGCI/frontend/public) |
| `test-engineer` | Automatización de pruebas unitarias, integración y e2e (Pest/PHPUnit y Vitest) | [backend/tests/](file:///C:/dev/SGCI/backend/tests), [frontend/tests/](file:///C:/dev/SGCI/frontend/tests) |
| `code-reviewer` | Inspección estática de código, cumplimiento SOLID, adherencia a estándares de estilo | Auditoría global antes de merge |
| `security-scanner` | Auditoría de seguridad OWASP, validación de aislamiento multi-tenant, sanitización y JWT | Auditoría de cierre y pentesting |

---

## 3. Orquestación Paralela y Flujo de Trabajo Git-Flow

Para garantizar la no colisión en ejecuciones concurrentes de agentes:

1. **Ramas por Funcionalidad (`feat/<modulo>`):**
   - Toda implementación debe nacer desde la rama principal `main` o `develop` hacia `feat/<modulo-especifico>` (ejemplos: `feat/kardex-peps`, `feat/auth-jwt-refresh`, `feat/conteos-pwa-offline`).
   - Los agentes jamás deben realizar commits directos en ramas productivas sin validación de suite de pruebas.

2. **Convención de Commits Semánticos:**
   - `feat(<modulo>): <descripción concisa>`: Incorporación de nueva funcionalidad.
   - `fix(<modulo>): <descripción concisa>`: Corrección de error verificado con prueba.
   - `test(<modulo>): <descripción concisa>`: Creación o enriquecimiento de casos de prueba.
   - `refactor(<modulo>): <descripción concisa>`: Modificación interna sin alterar el contrato público.
   - `docs(<modulo>): <descripción concisa>`: Documentación técnica o diagramas.

3. **Ciclo de Integración y Calidad (Quality Gates):**
   - **TDD Previo:** Ninguna clase o componente se considera completado si no cuenta con sus pruebas ejecutadas y aprobadas.
   - **Revisión por Pares (`code-reviewer`):** Evaluación de complejidad ciclomática, PSR-12, ESLint y Screaming Architecture.
   - **Auditoría de Seguridad (`security-scanner`):** Verificación de fuga de datos de inquilinos (`tenant_id`), inyección SQL y manejo de tokens.

---

## 4. Filosofía TDD Obligatoria (Test-Driven Development)

El desarrollo en SGCI sigue estrictamente el ciclo **Rojo -> Verde -> Refactorizar**:

1. **Backend (Pest / PHPUnit):**
   - Nomenclatura obligatoria: `*Test.php`.
   - Ubicación: [backend/tests/Unit/Modulos/](file:///C:/dev/SGCI/backend/tests/Unit/Modulos) y [backend/tests/Feature/Modulos/](file:///C:/dev/SGCI/backend/tests/Feature/Modulos).
   - Cobertura mínima requerida: 85% en servicios de cálculo de Kardex, valoración de costos y aislamiento multi-tenant.
   - Comando de ejecución: `php artisan test` o `./vendor/bin/pest`.

2. **Frontend (Vitest):**
   - Nomenclatura obligatoria: `*.prueba.ts` o `*.spec.ts`.
   - Ubicación adyacente a componentes o en [frontend/tests/](file:///C:/dev/SGCI/frontend/tests).
   - Cobertura obligatoria para stores de Pinia (cálculos de inventario y colas de sincronización offline) y utilidades de formato.
   - Comando de ejecución: `npm run test` o `npx vitest run`.

---

## 5. Convenciones Estrictas de Backend (PHP 8.2+ / Laravel 11)

### 5.1. Arquitectura "Gritante" (Screaming Architecture)
El código de negocio no debe ocultarse en carpetas genéricas de Laravel (`app/Models`, `app/Http/Controllers`). Debe estructurarse en [backend/app/Modulos/](file:///C:/dev/SGCI/backend/app/Modulos) con módulos autosuficientes y desacoplados:

- [Tenants/](file:///C:/dev/SGCI/backend/app/Modulos/Tenants): Aislamiento, subdominios, membresías y configuración corporativa.
- [Autenticacion/](file:///C:/dev/SGCI/backend/app/Modulos/Autenticacion): JWT, Refresh Token, RBAC de 10 roles, políticas de acceso.
- [Catalogo/](file:///C:/dev/SGCI/backend/app/Modulos/Catalogo): Artículos, categorías, marcas, unidades de medida, conversiones, códigos de barra (EAN-13, QR).
- [Almacenes/](file:///C:/dev/SGCI/backend/app/Modulos/Almacenes): Bodegas, zonas, pasillos, estantes, ubicaciones bin y transferencias internas.
- [LotesVencimientos/](file:///C:/dev/SGCI/backend/app/Modulos/LotesVencimientos): Lotes de producción, fechas de caducidad, semaforización de alertas y cuarentena.
- [Kardex/](file:///C:/dev/SGCI/backend/app/Modulos/Kardex): Libro mayor inmutable de movimientos, cálculo de costos (PEPS, UEPS, CPP).
- [Compras/](file:///C:/dev/SGCI/backend/app/Modulos/Compras): Órdenes de compra, proveedores, recepciones de mercadería y cotejo contra factura.
- [AuditoriaConteos/](file:///C:/dev/SGCI/backend/app/Modulos/AuditoriaConteos): Conteos físicos cíclicos, ajustes de inventario, discrepancias y actas de mermas.
- [AlertasTiempoReal/](file:///C:/dev/SGCI/backend/app/Modulos/AlertasTiempoReal): Notificaciones push, WebSockets (Pusher/Reverb) de umbrales críticos de stock.

### 5.2. Estructura Interna por Módulo
Cada módulo en [backend/app/Modulos/<Modulo>/](file:///C:/dev/SGCI/backend/app/Modulos) debe mantener una organización uniforme:
```
backend/app/Modulos/<NombreModulo>/
├── Acciones/           # Clases ejecutables de caso de uso único (ej: RegistrarEntradaKardexAccion)
├── Controladores/      # Controladores HTTP delgados (Thin Controllers)
├── DTOs/               # Data Transfer Objects inmutables readonly
├── Eventos/            # Eventos del dominio y eventos broadcast para WebSockets
├── Modelos/            # Modelos Eloquent con Scope Multi-Tenant
├── Observadores/       # Eloquent Observers (ej: MovimientoKardexObserver)
├── Politicas/          # Laravel Policies para autorización de los 10 roles
├── Peticiones/         # Form Requests para validación y sanitización estricta
├── Recursos/           # API Resources (Serialización JSON API v1)
└── Servicios/          # Lógica de dominio pesada e interfaces de estrategias
```

### 5.3. Principios SOLID y Patrones de Diseño Obligatorios
- **Patrón Strategy:** Obligatorio para cálculo de costos de inventario. La interfaz `EstrategiaValoracionInterface` desacopla el cálculo del movimiento en Kardex. Las implementaciones soportadas son `ValoracionPeps`, `ValoracionUeps` y `ValoracionPromedioPonderado`.
- **Patrón Observer:** La clase `MovimientoKardexObserver` reacciona ante eventos del ciclo de vida del Kardex:
  - Al insertar/confirmar un movimiento: actualiza existencias consolidadas por almacén y lote.
  - Verifica si el saldo resultante cruza los umbrales de stock mínimo o máximo.
  - Dispara eventos de difusión en tiempo real vía WebSockets hacia la interfaz de usuario.
  - Genera bitácora inmutable de trazabilidad y auditoría.
- **Patrón DTO (Data Transfer Object):** Está estrictamente prohibido pasar `$request->all()` o arreglos asociativos a los servicios. Se deben emplear DTOs `readonly` fuertemente tipados con constructor promovido en PHP 8.2+.

### 5.4. Aislamiento Multi-Tenant y Auditoría Estricta
- Toda tabla de negocio debe incluir la clave de partición lógica `tenant_id` (UUID v7/v4 con clave foránea indexada).
- Aplicación de un **Global Scope de Eloquent** (`TenantScope`) a través del Trait `TieneInquilino`, garantizando que ninguna consulta SQL pueda leer o escribir registros de otro cliente.
- Campos de auditoría obligatorios en todas las entidades:
  ```sql
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  updated_by UUID NULL
  ```

### 5.5. Especificación Declarativa Dual (Prisma + Eloquent)
- El esquema central y canónico de base de datos se declara formalmente en [database/prisma/schema.prisma](file:///C:/dev/SGCI/database/prisma/schema.prisma).
- Las migraciones de Laravel en `backend/database/migrations/` deben reflejar con exactitud milimétrica el contrato definido en Prisma, asegurando compatibilidad relacional y documentación tipada.

### 5.6. Seguridad, JWT y RBAC
- Autenticación sin estado mediante **JWT** con tiempo de vida corto (15 a 30 minutos) y **Refresh Token** persistido en base de datos con rotación criptográfica obligatoria y detección de reúso.
- Matriz RBAC con 10 roles del sistema implementada mediante políticas de autorización (`Policies`) y compuertas (`Gates`).

---

## 6. Convenciones Estrictas de Frontend (Vue 3 / TypeScript / Pinia / Tailwind)

### 6.1. Screaming Architecture y Organización Modular
El frontend en [frontend/src/](file:///C:/dev/SGCI/frontend/src) replica la arquitectura orientada al negocio:
```
frontend/src/
├── diseno/             # Sistema de Diseño Atomic Design global
│   ├── atomos/         # Botones, inputs, badges de estado, avatares, spinners
│   ├── moleculas/      # Campos de formulario con validación, tarjetas de métrica, buscador
│   └── organismos/     # Barras de navegación, cabecera multi-tenant, tablas de datos, modales
├── modulos/            # Módulos de negocio (Screaming Architecture)
│   ├── autenticacion/  # Login, selector de tenant, recuperación de contraseña
│   ├── catalogo/       # Listado de productos, ficha técnica, selector de categorías
│   ├── almacenes/      # Vista de bodegas, mapa de ubicaciones binarias
│   ├── lotes/          # Semáforo de vencimientos, cuarentena, trazabilidad
│   ├── kardex/         # Tabla de movimientos, selector de estrategia de costeo
│   ├── compras/        # Emisión de órdenes, cotejo físico de recepciones
│   ├── conteos/        # Interfaz de conteo móvil PWA, reconciliación ciega
│   └── alertas/        # Centro de notificaciones WebSockets en vivo
├── router/             # Definición de rutas protegidas y guardas de navegación RBAC
├── stores/             # Stores transversales de Pinia (SesionStore, ConexionStore)
└── servicios/          # Cliente HTTP Axios configurado con interceptores de Token
```

### 6.2. Atomic Design y Paleta Oficial Aurora Mist
Todos los componentes visuales deben adherirse rigurosamente a la paleta institucional **Aurora Mist**:

| Color Oficial | Hexadecimal | Nombre Técnico | Uso en SGCI |
|---|---|---|---|
| **Midnight Slate** | `#203959` | `aurora-midnight` | Encabezados, barra lateral de navegación, botones primarios institucionales, texto de alto contraste. |
| **Steel Teal** | `#416772` | `aurora-teal` | Botones de acción secundaria, enlaces activos, pestañas seleccionadas, acentos de foco. |
| **Sage Whisper** | `#96ADA5` | `aurora-sage` | Fondos de tarjetas suaves, badges informativos, bordes de elementos interactivos. |
| **Silver Mist** | `#ABB7B3` | `aurora-silver` | Divisores, bordes de tablas, estados inactivos o deshabilitados, fondos neutros. |
| **Dusty Jade** | `#839492` | `aurora-jade` | Iconos de soporte, subtítulos secundarios, estados de advertencia atenuada. |

Configuración requerida en `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      aurora: {
        midnight: '#203959',
        teal: '#416772',
        sage: '#96ADA5',
        silver: '#ABB7B3',
        jade: '#839492',
      }
    }
  }
}
```

### 6.3. PWA y Resiliencia Offline-First
- Para la operativa de bodega y conteos cíclicos en zonas con baja conectividad, la aplicación implementa Service Worker mediante Workbox.
- Almacenamiento local mediante IndexedDB (vía Pinia y Dexie.js o LocalForage) para registrar conteos físicos y movimientos pendientes.
- Mecanismo de sincronización en segundo plano (Background Sync) que drena la cola de operaciones al restablecerse la conexión, resolviendo conflictos con marca temporal `updated_at`.

---

## 7. Protocolo de Auditoría de Cierre (Quality Assurance)

Antes de dar por concluida cualquier tarea o integración:

1. **Revisión de Código (`code-reviewer`):**
   - Comprueba que no existen consultas N+1 en Eloquent.
   - Verifica que ningún controlador de Laravel contenga lógica de cálculo de inventario.
   - Comprueba que los DTOs sean inmutables y tipados.
   - Valida que los componentes Vue utilicen `<script setup lang="ts">` y no contengan lógica HTTP directa (deben usar servicios y composables).

2. **Escaneo de Seguridad (`security-scanner`):**
   - Comprueba la presencia de `TenantScope` en todas las consultas de base de datos.
   - Comprueba que los identificadores expuestos en rutas sean UUIDs y no enteros autoincrementales predecibles (evitar IDOR).
   - Verifica que los tokens de refresco se almacenen con hash seguro y se invaliden tras un solo uso.
   - Verifica la desinfección de entradas y protección contra inyecciones XSS y SQL.

---
*Este manual operativo es de cumplimiento mandatorio e innegociable para todos los agentes del ecosistema SGCI.*
