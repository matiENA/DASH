-- ==============================================================
-- Migración: Integración de servicios_choferes en view_dash_flota y view_dash_novedades
-- Relaciona el servicio real del chofer mediante FK choferes.servicio_id -> servicios_choferes.id
-- ==============================================================

DROP VIEW IF EXISTS public.view_dash_novedades CASCADE;
DROP VIEW IF EXISTS public.view_dash_flota CASCADE;

-- 1. Recrear view_dash_flota con servicios_choferes
CREATE OR REPLACE VIEW public.view_dash_flota AS
SELECT 
    c.id AS chofer_id,
    c.nombre AS nom,
    COALESCE(
        CASE
            WHEN t.patente IS NOT NULL AND NOT t.patente ~ '^[0-9\-/]+$'::text AND t.patente <> '|'::text THEN t.patente
            WHEN t.patente IS NULL AND s.patente IS NOT NULL AND (EXISTS ( SELECT 1 FROM tractores tr WHERE upper(tr.patente) = upper(s.patente))) THEN s.patente
            ELSE NULL::text
        END, ''::text
    ) AS tractor,
    COALESCE(
        CASE
            WHEN (EXISTS ( SELECT 1 FROM tractores tr WHERE upper(tr.patente) = upper(s.patente))) THEN NULL::text
            ELSE s.patente
        END, ''::text
    ) AS semi,
    COALESCE(s.cisternado, ''::text) AS cisternado,
    COALESCE(u.n_ute, ''::text) AS n_ute,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS srv,
    upper(TRIM(BOTH FROM COALESCE(sc.denominacion, su.denominacion, 'S/A'::text))) AS servicio,
    c.servicio_id AS servicio_chofer_id,
    COALESCE(c.estado, 'disponible'::text) AS estado_chofer,
    COALESCE(u.estado, 'disponible'::text) AS estado_unidad,
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
WHERE length(TRIM(BOTH FROM c.nombre)) > 2
ORDER BY c.nombre;

-- 2. Recrear view_dash_novedades con servicios_choferes
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
    COALESCE(n.prioridad, 'media'::text) AS prioridad,
    n.creado_el,
    n.creado_el AS "timestamp",
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
LEFT JOIN public.choferes c ON n.chofer_id = c.id
LEFT JOIN public.servicios_choferes sc ON c.servicio_id = sc.id
LEFT JOIN public.chofer_documentacion cd ON cd.chofer_id = c.id
LEFT JOIN public.unidades u ON n.unidad_id = u.id
LEFT JOIN public.tractores t ON u.tractor_id = t.id
LEFT JOIN public.semis s ON u.semi_id = s.id
LEFT JOIN public.servicios_unidades su ON u.servicio_id = su.id
LEFT JOIN public.terminales term ON n.terminal_id = term.id
LEFT JOIN public.dash d_user ON n.creado_por_id = d_user.id;
