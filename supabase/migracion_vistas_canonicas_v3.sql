-- ==============================================================================
-- 🚀 MIGRACIÓN CANÓNICA: VISTAS UNIFICADAS, CONFIGURACIÓN ACID E HIGIENE RELACIONAL
-- Versión: 3.0 (Integración tipos_novedad, ventana deslizante 14d y ot_activa de Pañol)
-- ==============================================================================

-- 1. CONFIGURACIÓN ACID & TIMEOUTS
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE anon SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE postgres SET idle_in_transaction_session_timeout = '15s';

-- 2. HIGIENE RELACIONAL: ELIMINACIÓN DE ÍNDICE INACTIVO
DROP INDEX IF EXISTS public.idx_novedades_fecha_objetivo;

-- 3. RLS EN TERMINALES
ALTER TABLE public.terminales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica terminales" ON public.terminales;
CREATE POLICY "Lectura publica terminales" ON public.terminales FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modificacion terminales authenticated" ON public.terminales;
CREATE POLICY "Modificacion terminales authenticated" ON public.terminales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. RECREAR VISTA CANÓNICA: view_dash_novedades y v_canon_novedades_activas
DROP VIEW IF EXISTS public.v_canon_novedades_activas CASCADE;
DROP VIEW IF EXISTS public.view_dash_novedades CASCADE;

CREATE VIEW public.view_dash_novedades AS
SELECT 
    n.id,
    n.id AS card_id,
    COALESCE(tn.codigo, n.tipo_novedad) AS tipo_novedad,
    COALESCE(tn.codigo, n.tipo_novedad) AS tipo,
    tn.id AS tipo_novedad_id,
    COALESCE(tn.titulo, n.tipo_novedad) AS tipo_novedad_titulo,
    tn.bg_color AS tipo_bg_color,
    tn.text_color AS tipo_text_color,
    COALESCE(tn.requiere_fecha_objetivo, false) AS requiere_fecha_objetivo,
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
        SELECT array_agg(m.usuario_nombre)
        FROM public.dash_menciones m
        WHERE m.novedad_id = n.id
    ), ARRAY[]::text[]) AS menciones
FROM public.novedades n
LEFT JOIN public.tipos_novedad tn ON n.tipo_novedad_id = tn.id OR (n.tipo_novedad_id IS NULL AND n.tipo_novedad = tn.codigo)
LEFT JOIN public.choferes c ON n.chofer_id = c.id
LEFT JOIN public.servicios_choferes sc ON c.servicio_id = sc.id
LEFT JOIN public.chofer_documentacion cd ON cd.chofer_id = c.id
LEFT JOIN public.unidades u ON n.unidad_id = u.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
LEFT JOIN public.semis s ON u.semi_id = s.id
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id
LEFT JOIN public.terminales term ON n.terminal_id = term.id
LEFT JOIN public.dash d_user ON n.creado_por_id = d_user.id
WHERE NOT n.resuelto OR n.fecha_resolucion >= (CURRENT_DATE - INTERVAL '14 days');

-- 5. SINCRONIZAR VISTA HERMANA CANÓNICA (EOR + Pañol)
CREATE OR REPLACE VIEW public.v_canon_novedades_activas AS
SELECT * FROM public.view_dash_novedades;

-- 6. RECREAR VISTA CANÓNICA DE FLOTA: view_dash_flota
DROP VIEW IF EXISTS public.view_dash_flota CASCADE;

CREATE OR REPLACE VIEW public.view_dash_flota AS
WITH ot_activas AS (
    SELECT 
        uwo.tractor_id,
        uwo.semi_id,
        MAX(wo.ot_number) AS ot_activa
    FROM panol.unit_work_orders uwo
    JOIN panol.work_orders wo ON wo.id = uwo.work_order_id
    WHERE wo.status = 'ACTIVA'
    GROUP BY uwo.tractor_id, uwo.semi_id
)
SELECT 
    c.id AS chofer_id,
    c.nombre AS nom,
    COALESCE(
        CASE
            WHEN t.patente IS NOT NULL AND NOT t.patente ~ '^[0-9\\-/]+$'::text AND t.patente <> '|'::text THEN t.patente
            WHEN t.patente IS NULL AND s.patente IS NOT NULL AND (EXISTS (SELECT 1 FROM public.tractores tr WHERE upper(tr.patente) = upper(s.patente))) THEN s.patente
            ELSE NULL::text
        END, ''::text
    ) AS tractor,
    COALESCE(
        CASE
            WHEN (EXISTS (SELECT 1 FROM public.tractores tr WHERE upper(tr.patente) = upper(s.patente))) THEN NULL::text
            ELSE s.patente
        END, ''::text
    ) AS semi,
    COALESCE(s.cisternado, ''::text) AS cisternado,
    COALESCE(u.n_ute, ''::text) AS n_ute,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS srv,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS servicio,
    c.servicio_id AS servicio_chofer_id,
    COALESCE(c.estado, 'disponible'::text) AS estado_chofer,
    CASE 
        WHEN ota_t.ot_activa IS NOT NULL OR ota_s.ot_activa IS NOT NULL THEN 'taller'::text
        ELSE COALESCE(u.estado, 'disponible'::text)
    END AS estado_unidad,
    COALESCE(ota_t.ot_activa, ota_s.ot_activa) AS ot_activa,
    c.foto,
    u.id AS unidad_id,
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve
FROM public.choferes c
LEFT JOIN public.servicios_choferes sc ON c.servicio_id = sc.id
LEFT JOIN public.movimientos m ON m.id_chofer = c.id
LEFT JOIN public.unidades u ON COALESCE(m.id_unidad, c.unidad_id) = u.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
LEFT JOIN public.semis s ON u.semi_id = s.id
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id
LEFT JOIN ot_activas ota_t ON ota_t.tractor_id = u.tractor_id
LEFT JOIN ot_activas ota_s ON ota_s.semi_id = u.semi_id
WHERE length(TRIM(BOTH FROM c.nombre)) > 2
ORDER BY c.nombre;

-- 7. CONCEDER PERMISOS
GRANT SELECT ON public.view_dash_novedades TO anon, authenticated, service_role;
GRANT SELECT ON public.v_canon_novedades_activas TO anon, authenticated, service_role;
GRANT SELECT ON public.view_dash_flota TO anon, authenticated, service_role;
GRANT SELECT ON public.terminales TO anon, authenticated, service_role;
GRANT SELECT ON public.tipos_novedad TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
