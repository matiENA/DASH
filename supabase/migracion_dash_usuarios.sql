-- ==============================================================================
-- 🚀 MIGRACIÓN: USUARIOS EXCLUSIVOS DASH VINCULADOS A SUPABASE AUTH
-- Proyecto Supabase: rsvajuxihvmpmrmlcbul
-- ==============================================================================

-- 1. ASEGURAR EXTENSIÓN PGCRYPTO
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. FUNCIÓN AUXILIAR PARA APROVISIONAR USUARIO EN AUTH.USERS Y PUBLIC.DASH
CREATE OR REPLACE FUNCTION public.crear_usuario_dash(
    p_usuario TEXT,
    p_password TEXT,
    p_rol TEXT DEFAULT 'operador'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_upper_user TEXT;
BEGIN
    v_upper_user := UPPER(TRIM(p_usuario));
    v_email := LOWER(v_upper_user) || '_dash@satelites.local';

    -- 1. Buscar si ya existe en auth.users por email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    -- Si no existe, crear en auth.users
    IF v_user_id IS NULL THEN
        -- Si es TRANSER y ya tiene el UUID histórico, reutilizarlo
        IF v_upper_user = 'TRANSER' THEN
            v_user_id := 'fe9eace6-f5fa-4c5b-92bc-1968829da19a'::uuid;
            -- Verificar si el id ya existía en auth.users
            IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
                INSERT INTO auth.users (
                    instance_id, id, aud, role, email, encrypted_password,
                    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                    created_at, updated_at
                ) VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    v_user_id,
                    'authenticated',
                    'authenticated',
                    v_email,
                    crypt(p_password, gen_salt('bf')),
                    NOW(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    jsonb_build_object('nombre', v_upper_user, 'rol', p_rol),
                    NOW(),
                    NOW()
                );
            ELSE
                UPDATE auth.users
                SET encrypted_password = crypt(p_password, gen_salt('bf')),
                    updated_at = NOW()
                WHERE id = v_user_id;
            END IF;
        ELSE
            v_user_id := gen_random_uuid();
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_user_id,
                'authenticated',
                'authenticated',
                v_email,
                crypt(p_password, gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('nombre', v_upper_user, 'rol', p_rol),
                NOW(),
                NOW()
            );
        END IF;
    ELSE
        -- Si ya existe, actualizar password en auth.users
        UPDATE auth.users
        SET encrypted_password = crypt(p_password, gen_salt('bf')),
            updated_at = NOW(),
            raw_user_meta_data = jsonb_build_object('nombre', v_upper_user, 'rol', p_rol)
        WHERE id = v_user_id;
    END IF;

    -- 2. Asegurar registro en public.dash
    INSERT INTO public.dash (id, nombre, "contraseña")
    VALUES (v_user_id, v_upper_user, p_password)
    ON CONFLICT (id) DO UPDATE
    SET nombre = v_upper_user,
        "contraseña" = p_password;

    RETURN v_user_id;
END;
$$;

-- 3. APROVISIONAR LOS 9 OPERADORES OFICIALES DE DASH
SELECT public.crear_usuario_dash('TRANSER', 'Mayo2026', 'admin');
SELECT public.crear_usuario_dash('Alex', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('Tomas', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('Mariano', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('Lino', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('Javier', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('Luis', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('GUSTAVO', 'Julio2026', 'operador');
SELECT public.crear_usuario_dash('matias', 'Julio2026', 'admin');

-- 4. ACTUALIZAR VISTA CANÓNICA view_dash_usuarios
DROP VIEW IF EXISTS public.view_dash_usuarios CASCADE;
CREATE VIEW public.view_dash_usuarios AS
SELECT 
    id,
    UPPER(TRIM(nombre)) AS usuario,
    'operador'::text AS rol
FROM public.dash;

-- 5. ACTUALIZAR VISTA CANÓNICA view_dash_novedades
-- (Une con public.dash y remueve el filtro restrictivo de tipo_novedad)
DROP VIEW IF EXISTS public.view_dash_novedades CASCADE;
CREATE VIEW public.view_dash_novedades AS
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
    COALESCE(n.prioridad, 'media') AS prioridad,
    n.creado_el,
    n.creado_el AS timestamp,
    n.creado_por_id,
    COALESCE(d_user.nombre, 'DASH') AS creador,
    COALESCE(d_user.nombre, 'DASH') AS usuario,
    
    -- Chofer
    c.id AS chofer_id,
    UPPER(TRIM(COALESCE(c.nombre, ''))) AS nom,
    UPPER(TRIM(COALESCE(c.nombre, ''))) AS chofer_nombre,
    COALESCE(c.estado, 'disponible') AS chofer_estado,
    cd.telefono AS chofer_telefono,
    c.foto,

    -- Unidad
    u.id AS unidad_id,
    UPPER(TRIM(COALESCE(t.patente, ''))) AS tractor,
    UPPER(TRIM(COALESCE(s.patente, ''))) AS semi,
    s.cisternado,
    COALESCE(u.n_ute, 'S/D') AS n_ute,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS srv,
    UPPER(TRIM(COALESCE(su.denominacion, 'GENERAL'))) AS servicio,

    -- Vencimientos
    t.vtv AS vtv_tr,
    t.mas AS mas_tr,
    s.vtv AS vtv_semi,
    s.mas AS mas_semi,
    s.esp_es,
    s.vi,
    s.ve,

    -- Terminal Operativa (Exclusiva para LIBRES)
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN COALESCE(term.codigo, '') ELSE '' END AS terminal,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN n.terminal_id ELSE NULL END AS terminal_id,
    CASE WHEN n.tipo_novedad = 'LIBRES' THEN term.nombre ELSE NULL END AS terminal_nombre,

    -- Menciones
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
LEFT JOIN public.dash d_user ON n.creado_por_id = d_user.id;

-- 6. PERMISOS
GRANT SELECT ON public.dash TO anon, authenticated;
GRANT SELECT ON public.view_dash_usuarios TO anon, authenticated;
GRANT SELECT ON public.view_dash_novedades TO anon, authenticated;
