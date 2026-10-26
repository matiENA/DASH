-- ==============================================================================
-- 🚀 MIGRACIÓN DE CATÁLOGO OFICIAL DE TERMINALES OPERATIVAS PARA DASH
-- Elimina dependencia de columna terminal TEXT legacy y restringe a las 4 oficiales:
-- DOCK SUD, TVM, TPH, TLC
-- ==============================================================================

-- 1. Eliminar columna legacy de novedades si aún existe (con CASCADE para limpiar dependientes)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'novedades' 
          AND column_name = 'terminal'
    ) THEN
        ALTER TABLE public.novedades DROP COLUMN terminal CASCADE;
    END IF;
END $$;

-- 2. Desactivar terminales que no pertenecen al cuarteto oficial
UPDATE public.terminales 
SET activo = false 
WHERE codigo NOT IN ('DOCK SUD', 'TVM', 'TPH', 'TLC');

-- 3. Asegurar activación y nombre de DOCK SUD
UPDATE public.terminales 
SET activo = true,
    nombre = 'Dock Sud'
WHERE codigo = 'DOCK SUD';

-- 4. Insertar / Actualizar las 3 nuevas terminales
INSERT INTO public.terminales (codigo, nombre, activo)
VALUES 
    ('TVM', 'TVM', true),
    ('TPH', 'TPH', true),
    ('TLC', 'TLC', true)
ON CONFLICT (codigo) DO UPDATE 
SET activo = true, 
    nombre = EXCLUDED.nombre;

-- 5. Recrear / refrescar view_dash_terminales con catálogo activo
CREATE OR REPLACE VIEW public.view_dash_terminales AS
SELECT 
    id,
    codigo,
    nombre,
    activo
FROM public.terminales
WHERE activo = true;

GRANT SELECT ON public.view_dash_terminales TO anon, authenticated;
