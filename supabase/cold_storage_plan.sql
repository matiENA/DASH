-- ==============================================================================
-- 🧊 PLAN Y PROCEDIMIENTO DE COLD STORAGE PARA DASH (Supabase PostgreSQL + Google Drive)
-- Proyecto Supabase: rsvajuxihvmpmrmlcbul
-- Referencia Obsidian: "cold storage.md" (#plan #dash #supabase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA DE ALMACENAMIENTO HISTÓRICO (Cold Storage en Base de Datos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.novedades_historico (
    id BIGINT PRIMARY KEY,
    unidad_id UUID,
    chofer_id UUID,
    tipo_novedad TEXT NOT NULL,
    fecha_objetivo DATE,
    fecha_resolucion TIMESTAMPTZ,
    detalle TEXT,
    resuelto BOOLEAN DEFAULT true,
    creado_el TIMESTAMPTZ,
    actualizado_el TIMESTAMPTZ,
    prioridad TEXT DEFAULT 'media',
    creado_por_id UUID,
    terminal_id UUID,
    archivado_el TIMESTAMPTZ DEFAULT NOW(),
    metadatos JSONB DEFAULT '{}'::jsonb
);

-- Índices eficientes para consultas de auditoría histórica
CREATE INDEX IF NOT EXISTS idx_novedades_hist_fecha_resolucion ON public.novedades_historico(fecha_resolucion);
CREATE INDEX IF NOT EXISTS idx_novedades_hist_chofer ON public.novedades_historico(chofer_id);
CREATE INDEX IF NOT EXISTS idx_novedades_hist_unidad ON public.novedades_historico(unidad_id);

-- Tabla histórica de menciones
CREATE TABLE IF NOT EXISTS public.dash_menciones_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id BIGINT NOT NULL,
    usuario_id UUID,
    usuario_nombre TEXT NOT NULL,
    mencionado_el TIMESTAMPTZ,
    archivado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dash_menciones_hist_novedad ON public.dash_menciones_historico(novedad_id);

-- ------------------------------------------------------------------------------
-- 2. FUNCIÓN DE PURGA Y ARCHIVADO ATÓMICO (Hot RAM -> Cold Storage)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archivar_novedades_resueltas(p_dias_retencion INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_filas_movidas INT := 0;
    v_menciones_movidas INT := 0;
    v_fecha_corte TIMESTAMPTZ;
BEGIN
    v_fecha_corte := NOW() - (p_dias_retencion || ' days')::INTERVAL;

    -- 1. Copiar menciones a historico antes de purgar
    WITH menciones_a_mover AS (
        SELECT m.*
        FROM public.dash_menciones m
        JOIN public.novedades n ON m.novedad_id = n.id
        WHERE n.resuelto = true 
          AND n.fecha_resolucion <= v_fecha_corte
    ),
    menciones_insertadas AS (
        INSERT INTO public.dash_menciones_historico (id, novedad_id, usuario_id, usuario_nombre, mencionado_el)
        SELECT id, novedad_id, usuario_id, usuario_nombre, mencionado_el
        FROM menciones_a_mover
        ON CONFLICT (id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_menciones_movidas FROM menciones_insertadas;

    -- 2. Mover novedades resueltas antiguas a novedades_historico
    WITH novedades_a_mover AS (
        DELETE FROM public.novedades
        WHERE resuelto = true 
          AND fecha_resolucion <= v_fecha_corte
        RETURNING *
    ),
    novedades_insertadas AS (
        INSERT INTO public.novedades_historico (
            id, unidad_id, chofer_id, tipo_novedad, fecha_objetivo,
            fecha_resolucion, detalle, resuelto, creado_el, actualizado_el,
            prioridad, creado_por_id, terminal_id, archivado_el
        )
        SELECT 
            id, unidad_id, chofer_id, tipo_novedad, fecha_objetivo,
            fecha_resolucion, detalle, resuelto, creado_el, actualizado_el,
            prioridad, creado_por_id, terminal_id, NOW()
        FROM novedades_a_mover
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_filas_movidas FROM novedades_insertadas;

    RETURN jsonb_build_object(
        'success', true,
        'fecha_corte', v_fecha_corte,
        'novedades_archivadas', v_filas_movidas,
        'menciones_archivadas', v_menciones_movidas
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. INTEGRACIÓN CON GOOGLE DRIVE (Flujo ETL & Script / Cron)
-- ------------------------------------------------------------------------------
/*
Arquitectura de Exportación a Google Drive:
1. Trigger o Cron semanal (n8n o Render Cron Worker / Node script).
2. Lee `public.novedades_historico` WHERE `archivado_el >= NOW() - INTERVAL '7 days'`.
3. Vía Google Drive API v3 / Google Sheets API v4 (Service Account):
   - Carpeta: "DASH - Archivo Histórico Cold Storage"
   - Planilla / Archivo: "DASH_HISTORICO_YYYY.xlsx" o CSV/JSON dump comprimido.
   - Apendiza las novedades resueltas con todos sus metadatos (Chofer, Tractor, Detalle, Resolución).
4. Mantiene la tabla activa `public.novedades` con tamaño constante (< 500 filas),
   asegurando latencias de consulta en Hot RAM de 1 a 3 ms y cero consumo redundante de cuotas Supabase.
*/
