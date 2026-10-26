-- ==============================================================================
-- 🚀 ESQUEMA CANÓNICO DE VISTAS Y TABLAS PARA DASH (VERSIÓN 2.0 - REACT & HOT RAM)
-- Proyecto Supabase: rsvajuxihvmpmrmlcbul
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ASEGURAR TABLAS RELACIONALES BASE Y CAMPOS OPERATIVOS
-- ------------------------------------------------------------------------------

-- Tabla de Novedades: asegurar foreign keys y columnas requeridas
ALTER TABLE public.novedades 
    ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES public.terminales(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'media',
    ADD COLUMN IF NOT EXISTS creado_por_id UUID REFERENCES public.usuarios_auth(id) ON DELETE SET NULL;

-- Tabla de Menciones de Operadores (sustituye persistencia volátil en memoria)
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

-- Habilitar RLS en dash_menciones
ALTER TABLE public.dash_menciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en dash_menciones" ON public.dash_menciones;
CREATE POLICY "Permitir todo en dash_menciones" ON public.dash_menciones FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. ELIMINAR VISTAS ANTIGUAS (LEGACY)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.view_dash_novedades CASCADE;
DROP VIEW IF EXISTS public.view_dash_flota CASCADE;
DROP VIEW IF EXISTS public.view_dash_retorno CASCADE;
DROP VIEW IF EXISTS public.view_dash_usuarios CASCADE;
DROP VIEW IF EXISTS public.view_dash_terminales CASCADE;

-- ------------------------------------------------------------------------------
-- 3. VISTA CANÓNICA: view_dash_novedades (Conectada con la Nueva Versión)
-- Integra Chofer, Unidad, Tractor, Semi, Cisternado, Vencimientos, Terminal y Menciones
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_dash_novedades AS
SELECT 
    n.id,
    n.id AS card_id,
    n.tipo_novedad,
    n.tipo_novedad AS tipo,
    n.fecha_objetivo,
    n.fecha_objetivo AS fecha,
    n.fecha_resolucion,
    n.detalle,
    n.resuelto,
    n.prioridad,
    n.creado_el,
    n.creado_el AS timestamp,
    n.creado_por_id,
    COALESCE(u_auth.usuario, n.creador, 'DASH') AS creador,
    COALESCE(u_auth.usuario, n.creador, 'DASH') AS usuario,
    
    -- Chofer (JOIN relacional por ID)
    c.id AS chofer_id,
    UPPER(TRIM(COALESCE(c.nombre, ''))) AS nom,
    UPPER(TRIM(COALESCE(c.nombre, ''))) AS chofer_nombre,
    c.estado AS chofer_estado,
    cd.telefono AS chofer_telefono,
    c.foto,

    -- Unidad y Equipamiento (JOIN relacional por ID)
    u.id AS unidad_id,
    UPPER(TRIM(COALESCE(t.patente, ''))) AS tractor,
    UPPER(TRIM(COALESCE(s.patente, ''))) AS semi,
    s.cisternado,
    COALESCE(u.n_ute, 'S/D') AS n_ute,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS srv,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS servicio,

    -- Vencimientos y Certificaciones Operativas
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve,

    -- Terminal Operativa (Exclusiva para unidades LIBRES, JOIN con catálogo oficial de terminales)
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN COALESCE(term.codigo, '') ELSE '' END AS terminal,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN n.terminal_id ELSE NULL END AS terminal_id,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN term.nombre ELSE NULL END AS terminal_nombre,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN term.color_bg ELSE NULL END AS terminal_color_bg,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN term.color_text ELSE NULL END AS terminal_color_text,

    -- Menciones Agregadas en Formato Array de Strings
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
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id
LEFT JOIN public.terminales term ON n.terminal_id = term.id
LEFT JOIN public.usuarios_auth u_auth ON n.creado_por_id = u_auth.id;

-- ------------------------------------------------------------------------------
-- 4. VISTA CANÓNICA: view_dash_flota
-- Catálogo Completo de Choferes, Unidades, Vencimientos y Cisternado
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_dash_flota AS
SELECT 
    c.id AS chofer_id,
    UPPER(TRIM(c.nombre)) AS nom,
    UPPER(TRIM(c.nombre)) AS nombre,
    UPPER(TRIM(COALESCE(t.patente, ''))) AS tractor,
    UPPER(TRIM(COALESCE(s.patente, ''))) AS semi,
    s.cisternado,
    COALESCE(u.n_ute, 'S/D') AS n_ute,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS srv,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS servicio,
    c.estado AS estado_chofer,
    u.estado AS estado_unidad,
    c.foto,
    cd.telefono AS chofer_telefono,
    u.id AS unidad_id,
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve
FROM public.choferes c
LEFT JOIN public.chofer_documentacion cd ON cd.chofer_id = c.id
LEFT JOIN public.unidades u ON u.chofer_id = c.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
LEFT JOIN public.semis s ON u.semi_id = s.id
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id
WHERE c.estado != 'eliminado' OR c.estado IS NULL;

-- ------------------------------------------------------------------------------
-- 5. VISTA CANÓNICA: view_dash_retorno
-- Choferes Retornantes (HOY, MAÑANA) con Estados de Ayer, Hoy y Mañana
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_dash_retorno AS
SELECT 
    c.id AS chofer_id,
    UPPER(TRIM(c.nombre)) AS nom,
    UPPER(TRIM(COALESCE(t.patente, ''))) AS tractor,
    COALESCE(r.codigo_ayer, '-') AS codigo_ayer,
    COALESCE(r.codigo_hoy, '-') AS codigo_hoy,
    COALESCE(r.codigo_manana, '-') AS codigo_manana,
    r.retorna_cuando,
    r.fecha_retorno,
    r.dias_para_retorno
FROM public.choferes c
LEFT JOIN public.unidades u ON u.chofer_id = c.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
JOIN (
    -- Consulta de retornos basada en la tabla o función de diagramas existente
    SELECT 
        chofer_id,
        codigo_ayer,
        codigo_hoy,
        codigo_manana,
        retorna_cuando,
        fecha_retorno,
        dias_para_retorno
    FROM public.view_dash_retorno_calculado -- O cálculo directo de diagramas
) r ON r.chofer_id = c.id;

-- ------------------------------------------------------------------------------
-- 6. VISTA CANÓNICA: view_dash_usuarios (Segura - Sin Password Expuesto)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_dash_usuarios AS
SELECT 
    id,
    UPPER(TRIM(usuario)) AS usuario,
    LOWER(TRIM(rol)) AS rol
FROM public.usuarios_auth;

-- ------------------------------------------------------------------------------
-- 7. VISTA CANÓNICA: view_dash_terminales
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_dash_terminales AS
SELECT 
    id,
    codigo,
    nombre,
    color_bg,
    color_text,
    activo
FROM public.terminales
WHERE activo = true;

-- Permisos de lectura para anon y authenticated
GRANT SELECT ON public.view_dash_novedades TO anon, authenticated;
GRANT SELECT ON public.view_dash_flota TO anon, authenticated;
GRANT SELECT ON public.view_dash_retorno TO anon, authenticated;
GRANT SELECT ON public.view_dash_usuarios TO anon, authenticated;
GRANT SELECT ON public.view_dash_terminales TO anon, authenticated;
