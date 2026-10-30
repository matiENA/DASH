-- ==============================================================================
-- 🚀 MIGRACIÓN RELACIONAL: CATÁLOGO DE TIPOS DE NOVEDAD
-- Base de datos: rsvajuxihvmpmrmlcbul (Supabase)
-- ==============================================================================

-- 1. Crear tabla de catálogo oficial
CREATE TABLE IF NOT EXISTS public.tipos_novedad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    bg_color TEXT DEFAULT '#6366F1',
    text_color TEXT DEFAULT '#FFFFFF',
    requiere_fecha_objetivo BOOLEAN DEFAULT false,
    imprime_nota_movimientos BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    orden INT DEFAULT 0,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.tipos_novedad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de tipos_novedad" ON public.tipos_novedad;
CREATE POLICY "Lectura pública de tipos_novedad" ON public.tipos_novedad FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modificación tipos_novedad" ON public.tipos_novedad;
CREATE POLICY "Modificación tipos_novedad" ON public.tipos_novedad FOR ALL USING (true) WITH CHECK (true);

-- 3. Poblado inicial con los tipos vigentes en DASH
INSERT INTO public.tipos_novedad (codigo, titulo, bg_color, text_color, requiere_fecha_objetivo, imprime_nota_movimientos, orden)
VALUES
    ('LIBRES', 'Libres', '#00FFFF', '#020617', false, false, 1),
    ('BAJA_DIAGRAMA', 'Baja / Término de diagrama', '#EF4444', '#FFFFFF', true, true, 2),
    ('CERTIFICACION_UNIDAD', 'Certificación de unidad', '#FFAE42', '#020617', true, false, 3),
    ('REPARACION', 'Reparaciones requeridas', '#6366F1', '#FFFFFF', false, false, 4),
    ('ESTADO_DEMORA', 'Estado / Demora', '#D28976', '#FFFFFF', false, false, 5),
    ('EXAMEN_CHOFER', 'Exámenes / Vencimientos', '#10B981', '#FFFFFF', true, false, 6)
ON CONFLICT (codigo) DO UPDATE 
SET 
    titulo = EXCLUDED.titulo,
    imprime_nota_movimientos = EXCLUDED.imprime_nota_movimientos,
    requiere_fecha_objetivo = EXCLUDED.requiere_fecha_objetivo,
    bg_color = EXCLUDED.bg_color,
    text_color = EXCLUDED.text_color,
    orden = EXCLUDED.orden;

-- 4. Añadir columna FK en public.novedades manteniendo retrocompatibilidad
ALTER TABLE public.novedades 
    ADD COLUMN IF NOT EXISTS tipo_novedad_id UUID REFERENCES public.tipos_novedad(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_novedades_tipo_id ON public.novedades(tipo_novedad_id);

-- 5. Backfill inicial
UPDATE public.novedades n
SET tipo_novedad_id = t.id
FROM public.tipos_novedad t
WHERE n.tipo_novedad = t.codigo AND n.tipo_novedad_id IS NULL;

-- 6. Actualizar vista canónica view_dash_novedades
DROP VIEW IF EXISTS public.view_dash_novedades CASCADE;
CREATE VIEW public.view_dash_novedades AS
SELECT 
    n.id,
    n.id AS card_id,
    COALESCE(tn.codigo, n.tipo_novedad) AS tipo_novedad,
    COALESCE(tn.codigo, n.tipo_novedad) AS tipo,
    tn.id AS tipo_novedad_id,
    tn.titulo AS tipo_novedad_titulo,
    COALESCE(tn.imprime_nota_movimientos, false) AS imprime_nota_movimientos,
    n.fecha_objetivo,
    n.fecha_objetivo AS fecha,
    n.fecha_resolucion,
    n.detalle,
    n.resuelto,
    COALESCE(n.prioridad, 'media'::text) AS prioridad,
    n.creado_el,
    n.creado_el AS timestamp,
    n.creado_por_id,
    COALESCE(d_user.nombre, 'DASH'::text) AS creador,
    COALESCE(d_user.nombre, 'DASH'::text) AS usuario,
    c.id AS chofer_id,
    upper(TRIM(BOTH FROM COALESCE(c.nombre, ''::text))) AS nom,
    upper(TRIM(BOTH FROM COALESCE(c.nombre, ''::text))) AS chofer_nombre,
    COALESCE(c.estado, 'disponible'::text) AS chofer_estado,
    cd.telefono AS chofer_telefono,
    c.foto,
    u.id AS unidad_id,
    upper(TRIM(BOTH FROM COALESCE(t.patente, ''::text))) AS tractor,
    upper(TRIM(BOTH FROM COALESCE(s.patente, ''::text))) AS semi,
    s.cisternado,
    COALESCE(u.n_ute, 'S/D'::text) AS n_ute,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS srv,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS servicio,
    c.servicio_id AS servicio_chofer_id,
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve,
    CASE
        WHEN n.tipo_novedad = 'LIBRES'::text THEN COALESCE(term.codigo, ''::text)
        ELSE ''::text
    END AS terminal,
    CASE
        WHEN n.tipo_novedad = 'LIBRES'::text THEN n.terminal_id
        ELSE NULL::uuid
    END AS terminal_id,
    CASE
        WHEN n.tipo_novedad = 'LIBRES'::text THEN term.nombre
        ELSE NULL::text
    END AS terminal_nombre,
    COALESCE((
        SELECT array_agg(m.usuario_nombre) AS array_agg
        FROM dash_menciones m
        WHERE m.novedad_id = n.id
    ), ARRAY[]::text[]) AS menciones
FROM novedades n
LEFT JOIN public.tipos_novedad tn ON n.tipo_novedad_id = tn.id OR (n.tipo_novedad_id IS NULL AND n.tipo_novedad = tn.codigo)
LEFT JOIN choferes c ON n.chofer_id = c.id
LEFT JOIN servicios_choferes sc ON c.servicio_id = sc.id
LEFT JOIN chofer_documentacion cd ON cd.chofer_id = c.id
LEFT JOIN unidades u ON n.unidad_id = u.id
LEFT JOIN tractores t ON u.tractor_id = t.id
LEFT JOIN semis s ON u.semi_id = s.id
LEFT JOIN servicios_unidades su ON u.servicio_id = su.id
LEFT JOIN terminales term ON n.terminal_id = term.id
LEFT JOIN dash d_user ON n.creado_por_id = d_user.id;
