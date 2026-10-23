# 🚀 Plan Maestro de Arquitectura DASH: Microservicio, Esquema Relacional, Auditoría Sheets y Migración a React

---

## 1. 🔍 Diagnóstico y Solución de Errores Detectados en Consola

### A. `TypeError: u.toLowerCase is not a function` en `feed.js:1421`
* **Causa Raíz:** En `feed.js`, la función `filtrarMenciones(input, cardId)` asumía que el array `RAM_Usuarios` contenía una lista plana de strings (ej. `["MATIAS", "JUAN"]`). Sin embargo, al cargar usuarios desde la vista de Supabase `view_dash_usuarios`, los elementos son objetos:
  ```json
  [
    { "id": "41bff09b-...", "usuario": "admin", "rol": "operador" },
    { "id": "fe9eace6-...", "usuario": "TRANSER", "rol": "admin" }
  ]
  ```
  Al ejecutar `usuarios.filter(u => u.toLowerCase().includes(val))`, JavaScript intentaba invocar `.toLowerCase()` sobre un objeto, lanzando la excepción.
* **Solución Aplicada:** Se normalizó la extracción del nombre del usuario de forma defensiva:
  ```javascript
  const filtrados = usuarios
      .map(u => (typeof u === 'string' ? u : (u && u.usuario ? u.usuario : '')).trim())
      .filter(uNom => uNom.length > 0 && uNom.toLowerCase().includes(val) && !yaEnMenciones.includes(uNom.toUpperCase()))
      .slice(0, 6);
  ```

---

### B. PostgreSQL `22007: invalid input syntax for type date: ""`
* **Causa Raíz:** Al editar o crear una novedad donde el campo de fecha objetivo no se completó (o se limpió), el input HTML envía una cadena vacía (`""`). En PostgreSQL, una columna de tipo `DATE` rechaza terminantemente el string vacío con el código de error `22007`. Para PostgreSQL, una fecha no especificada debe ser estrictamente `NULL`.
* **Falla en Cascada:**
  1. El cliente intentaba hacer `PATCH` directo a la vista `view_dash_novedades` con `fecha_objetivo: ""`.
  2. Supabase respondía con `400 Bad Request`.
  3. El frontend entraba en el bloque de contingencia intentando `POST http://localhost:3005/api/novedades/actualizar`.
  4. El backend tampoco sanitizaba la fecha, reenviaba `""` a Supabase y arrojaba `500 Internal Server Error`.
* **Solución Aplicada:**
  - En el frontend (`modal.js` y `supabase-client.js`), cualquier fecha vacía se convierte a `null`.
  - En el microservicio backend (`backend/utils/supabase.js`), se añadió la función sanitizadora `sanitizarFecha(valor)` que asegura que cualquier string vacío, `'null'` o `undefined` se transforme en `null` antes de llegar a la consulta SQL.

---

## 2. ⚡ Enrutamiento de Inputs mediante el Backend Microservicio

### Arquitectura de Flujo de Datos
El frontend ya no realiza mutaciones directas contra las tablas o vistas de Supabase. Todo evento de modificación (creación, edición, resolución, asignación de terminal y menciones) es despachado hacia el microservicio Express.

```mermaid
flowchart LR
    subgraph Frontend[Frontend DASH (Localhost:3000 / Render)]
        UI[Cartelera Kanban / Modales]
    end

    subgraph Backend[Backend Microservicio (Localhost:3005 / Render Web Service)]
        Router["/api/novedades/actualizar\n/api/novedades/terminal\n/api/novedades/mencion"]
        Sanitize["Sanitización (' ' ➔ NULL)\nResolución Relacional (Nombre/Patente ➔ IDs)"]
        SocketIO["Socket.IO Broadcast\n('novedades_actualizadas')"]
    end

    subgraph Supabase[Supabase PostgreSQL]
        TabNov[(Tabla: novedades)]
        TabMenc[(Tabla: dash_menciones)]
        ViewNov[(Vista: view_dash_novedades)]
    end

    UI -->|"1. POST Payload"| Router
    Router -->|"2. Validación & Parseo"| Sanitize
    Sanitize -->|"3. INSERT / UPDATE por ID"| TabNov
    TabNov -->|"4. Cambios reflejados"| ViewNov
    Router -->|"5. Push en Vivo a todos los clientes"| SocketIO
    SocketIO -->|"6. Renderizado Instantáneo"| UI
```

### Configuración de Entornos (Localhost vs Render)
En `frontend/js/config.js`, el backend conmuta automáticamente:
* **Desarrollo local:** `http://localhost:3005`
* **Producción en Render:** `https://dash-backend.onrender.com`

El despachador universal `window.despacharNovedad(bodyData)` ahora canaliza el 100% de los envíos a través del microservicio, garantizando:
1. Consistencia relacional (resuelve automáticamente `chofer_id` y `unidad_id`).
2. Sanitización estricta de fechas y strings.
3. Broadcast instantáneo por WebSocket a todas las pantallas operativas conectadas.

---

## 3. 🗄️ Esquema Relacional en Supabase (Diseño por IDs)

Para eliminar la dependencia de campos de texto desnormalizados o de memoria volátil en Node (como las menciones y terminales), se define la estructura relacional oficial.

### Script SQL DDL para Supabase (Editor SQL)

```sql
-- ==============================================================================
-- 🚀 ESQUEMA CANÓNICO RELACIONAL PARA DASH
-- Regla: Tablas normalizadas por ID (Foreign Keys estrictas)
-- ==============================================================================

-- 1. Asegurar que la tabla novedades posea los campos operativos requeridos
ALTER TABLE public.novedades 
    ADD COLUMN IF NOT EXISTS terminal TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    ADD COLUMN IF NOT EXISTS creado_por_id UUID REFERENCES public.usuarios_auth(id) ON DELETE SET NULL;

-- 2. Tabla relacional de Menciones (Reemplaza la memoria RAM del Node.js)
CREATE TABLE IF NOT EXISTS public.dash_menciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id BIGINT NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios_auth(id) ON DELETE SET NULL,
    usuario_nombre TEXT NOT NULL,
    mencionado_el TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_novedad_usuario UNIQUE (novedad_id, usuario_nombre)
);

CREATE INDEX IF NOT EXISTS idx_dash_menciones_novedad ON public.dash_menciones(novedad_id);
CREATE INDEX IF NOT EXISTS idx_dash_menciones_usuario ON public.dash_menciones(usuario_id);

-- 3. Habilitar RLS en dash_menciones
ALTER TABLE public.dash_menciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en dash_menciones" ON public.dash_menciones;
CREATE POLICY "Permitir todo en dash_menciones" ON public.dash_menciones FOR ALL USING (true) WITH CHECK (true);

-- 4. Actualizar la Vista Canónica view_dash_novedades para incluir menciones agregadas
CREATE OR REPLACE VIEW public.view_dash_novedades AS
SELECT 
    n.id,
    n.id AS card_id,
    n.legacy_id,
    n.tipo_novedad,
    n.tipo_novedad AS tipo,
    n.fecha_objetivo,
    n.fecha_objetivo AS fecha,
    n.detalle,
    n.resuelto,
    n.creador,
    n.creador AS usuario,
    n.creado_el,
    n.creado_el AS timestamp,
    n.fecha_resolucion,
    n.terminal,
    n.prioridad,
    -- Datos del Chofer (JOIN por ID)
    c.nombre AS nom,
    c.nombre AS chofer_nombre,
    c.id AS chofer_id,
    c.estado AS chofer_estado,
    cd.telefono AS chofer_telefono,
    c.foto,
    -- Datos de la Unidad (JOIN por ID)
    t.patente AS tractor,
    s.patente AS semi,
    s.cisternado,
    u.n_ute,
    su.denominacion AS srv,
    su.denominacion AS servicio,
    u.id AS unidad_id,
    -- Vencimientos y Documentación
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve,
    -- Menciones agregadas en formato Array
    COALESCE(
        (SELECT array_agg(m.usuario_nombre) FROM public.dash_menciones m WHERE m.novedad_id = n.id),
        ARRAY[]::TEXT[]
    ) AS menciones
FROM public.novedades n
LEFT JOIN public.choferes c ON n.chofer_id = c.id
LEFT JOIN public.chofer_documentacion cd ON cd.chofer_id = c.id
LEFT JOIN public.unidades u ON n.unidad_id = u.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
LEFT JOIN public.semis s ON u.semi_id = s.id
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id;
```

---

## 4. 📊 Auditoría Forense: Comunicación con Google Sheets (Versión Legacy)

Tras analizar los archivos de la versión anterior en `storage_ram_db` (`novedades.js`, `google_apps_script_trigger.gs`, `server.js` y `sync.js`), se identificaron las características exactas del modelo legacy:

### 1. Modelo de Almacenamiento "JSON Dump"
* **Hoja:** Hoja maestra de novedades (`ID_SPREADSHEET_MASTER: 1mhfXpFCF6upMlnRnZjDdBVS_wqTx5q8v0qQArNCnNAU`), pestaña `'novedades'`.
* **Estructura de Columnas:** No era una tabla relacional ni columnar clásica. Poseía únicamente 2 columnas:
  - **Columna A:** `id` (timestamp numérico, ej. `1784373541515`).
  - **Columna B:** `json_data` (el objeto completo serializado como texto plano vía `JSON.stringify(novedad)`).

### 2. Sincronización y Ciclo de Vida
* **Polling periódico:** Cada 30 segundos, el servidor ejecutaba `cargarNovedades` leyendo el rango `'novedades'!A:B` mediante la API de Google Sheets v4 y una Service Account (`serviceAccountAuth`).
* **Caché en RAM con purga de 14 días:** En memoria solo se retenían las novedades pendientes y aquellas resueltas con menos de 14 días. Las resueltas más antiguas permanecían en Google Sheets como almacenamiento frío (Cold Storage).
* **Escritura invertida en Planilla Mensual (`inyectarServicioEnSheetDispo`):**
  - Al resolver o actualizar una novedad, el backend buscaba la pestaña activa del mes en curso (ej. `'OCTUBRE 2026- Mov.Unidades y Choferes'` en `ID_SHEET_MOVIMIENTOS`).
  - Identificaba la columna dinámica `"Dispo."` para la fecha del día y la fila correspondiente al chofer o tractor.
  - Inyectaba directamente el servicio asignado (`DOCK SUD`, `UTE`, etc.) en la celda de la planilla de Google.
* **Trigger Google Apps Script (`google_apps_script_trigger.gs`):**
  - Se instalaba en la planilla de Google con un menú superior: `⚡ Supabase`.
  - Contaba con un activador `alModificarHoja` (evento `onEdit`) que, con un bloqueo de debounce de 120 segundos, ejecutaba un `UrlFetchApp.fetch(SERVER_URL + '/sync')` para forzar al servidor a extraer los datos modificados.

---

## 5. ⚛️ Recomendaciones Estratégicas para la Migración a React

Actualmente, el frontend cuenta con más de 2500 líneas de JavaScript vanilla distribuidas en `feed.js`, `modal.js`, etc., manipulando directamente el DOM mediante `innerHTML`. Además, la consola arroja la advertencia de producción de Tailwind CDN.

### A. Stack Tecnológico Sugerido
* **Framework:** **Vite + React 19 (TypeScript)** o **Next.js 15 (App Router)** si se requiere SSR.
* **Estilos:** **Tailwind CSS v4** mediante PostCSS / Vite Plugin (elimina por completo el script CDN y optimiza el bundle a < 30KB).
* **Componentes & Iconos:** **Lucide React** + **Radix UI / Shadcn UI** (para diálogos, popovers y autocompletados accesibles).
* **Manejo de Estado del Servidor:** **TanStack Query (React Query v5)** con mutaciones optimistas y revalidación automática.
* **Manejo de Estado UI:** **Zustand** para filtros globales, vista activa (todas / libres / pendientes / resueltos) y sesión.
* **Validación de Formularios:** **React Hook Form + Zod** (garantiza que ninguna fecha viaje como string vacío).

### B. Árbol de Componentes Recomendado

```text
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Barra superior, selector de tema, usuario
│   │   ├── FilterBar.tsx           # Filtros por servicio, terminal, búsqueda
│   │   └── QuickBar.tsx            # Acceso rápido para creación
│   ├── kanban/
│   │   ├── Board.tsx               # Contenedor principal del tablero
│   │   ├── Column.tsx              # Columna (Pendientes, En Curso, Resueltos)
│   │   └── NoveltyCard.tsx         # Tarjeta individual con badges y acciones
│   ├── mentions/
│   │   ├── MentionInput.tsx        # Input inline para @usuario
│   │   └── MentionBadge.tsx        # Tag visual de usuario mencionado
│   └── modals/
│       ├── NoveltyModal.tsx        # Modal unificado de creación / edición
│       └── FleetCombobox.tsx       # Autocomplete accesible de flota/chofer
├── hooks/
│   ├── useNovedades.ts             # React Query hook hacia /api/novedades
│   ├── useFlota.ts                 # React Query hook hacia /api/dash/flota
│   └── useRealtime.ts              # Listener Socket.IO / Supabase Realtime
└── schemas/
    └── novedad.schema.ts           # Esquema Zod con parseo seguro de fechas
```

### C. Esquema Zod de Validación (Prevención de Errores)
```typescript
import { z } from 'zod';

export const NovedadSchema = z.object({
  nom: z.string().min(1, "El chofer o denominación es requerida"),
  tractor: z.string().optional().default(""),
  srv: z.string().default("S/A"),
  n_ute: z.string().default("S/D"),
  tipo_novedad: z.string().min(1),
  terminal: z.string().default(""),
  // Transforma automáticamente string vacío a null
  fecha_objetivo: z.string().transform(v => (!v || v.trim() === '' ? null : v.trim())),
  detalle: z.string().default(""),
  creador: z.string().default("DASH")
});

export type NovedadFormData = z.infer<typeof NovedadSchema>;
```

### D. Hoja de Ruta de Migración (Roadmap Progresivo)
1. **Fase 1 (In-Place Fixes - Completado):**
   - Corregir el bug de menciones en Vanilla JS y la sanitización de fechas.
   - Enrutar el 100% de las mutaciones al backend microservicio.
2. **Fase 2 (Setup de Vite React SPA):**
   - Inicializar `frontend-react/` con Vite, Tailwind y TypeScript.
   - Conectar los hooks `useNovedades` y `useFlota` al backend (`http://localhost:3005`).
3. **Fase 3 (Migración de Componentes Clave):**
   - Migrar primero el `<NoveltyModal />` y el `<FleetCombobox />` con validación Zod.
   - Migrar la visualización de tarjetas `<NoveltyCard />` y el sistema de menciones.
4. **Fase 4 (Drag & Drop y Reemplazo Final):**
   - Implementar drag & drop fluido con `@dnd-kit/core`.
   - Reemplazar la carpeta `frontend/` y actualizar `render.yaml` para compilar el build de Vite en producción.
