require('dotenv').config();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { normalizar, normalizarComparacion } = require('./normalizar');
const { syncBajasGoogleSheets } = require('./googleSheetsSync');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rsvajuxihvmpmrmlcbul.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_n97mVkSclRpuv_OsseO3gg_BjR9QT3R';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ [Supabase] SUPABASE_URL o SUPABASE_KEY no están configurados en el entorno.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

console.log(`🐘 [Supabase] Cliente conectado a: ${SUPABASE_URL}`);

/**
 * Dispara la sincronización nativa de bajas hacia Google Sheets en segundo plano (asíncrono / no bloqueante)
 */
function dispararSyncBajas(contexto = null) {
    setImmediate(() => {
        syncBajasGoogleSheets(contexto, supabase).catch(err => {
            console.warn("⚠️ [Sync Bajas] Error en sync nativo de Google Sheets:", err.message);
        });
    });
}

/**
 * Consulta el catálogo de tipos de novedad desde public.tipos_novedad
 */
async function fetchTiposNovedad() {
    const { data, error } = await supabase
        .from('tipos_novedad')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

    if (error) {
        console.warn("⚠️ [Supabase] No se pudo cargar tipos_novedad:", error.message);
        return [];
    }
    return data || [];
}

/**
 * Sanitiza valores de fecha para evitar el error de PostgreSQL 22007 (string vacío a DATE)
 */
function sanitizarFecha(valor) {
    if (!valor || typeof valor !== 'string') return null;
    const v = valor.trim();
    if (v === '' || v.toLowerCase() === 'null' || v.toLowerCase() === 'undefined') return null;
    return v;
}

/**
 * Consulta la lista de novedades activas y resueltas desde view_dash_novedades
 */
async function fetchNovedades() {
    const { data, error } = await supabase
        .from('view_dash_novedades')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("❌ [Supabase] Error en fetchNovedades:", error.message);
        throw error;
    }
    return data || [];
}

/**
 * Consulta el catálogo de flota unificado desde view_dash_flota
 */
async function fetchFlota() {
    const { data, error } = await supabase
        .from('view_dash_flota')
        .select('*');

    if (error) {
        console.error("❌ [Supabase] Error en fetchFlota:", error.message);
        throw error;
    }
    return data || [];
}

/**
 * Consulta la lista de retornos desde view_dash_retorno
 */
async function fetchRetorno() {
    const { data, error } = await supabase
        .from('view_dash_retorno')
        .select('*');

    if (error) {
        console.error("❌ [Supabase] Error en fetchRetorno:", error.message);
        throw error;
    }
    return data || [];
}

/**
 * Consulta la lista de terminales activas desde public.terminales
 */
async function fetchTerminales() {
    const { data, error } = await supabase
        .from('terminales')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

    if (error) {
        console.warn("⚠️ [Supabase] No se pudo cargar terminales desde tabla:", error.message);
        return [];
    }
    return data || [];
}

/**
 * Consulta el catálogo de servicios de choferes activos desde servicios_choferes
 */
async function fetchServiciosChoferes() {
    const { data, error } = await supabase
        .from('servicios_choferes')
        .select('id, denominacion, descripcion, activo')
        .eq('activo', true)
        .order('denominacion', { ascending: true });

    if (error) {
        console.error("❌ [Supabase] Error en fetchServiciosChoferes:", error.message);
        return [];
    }
    return data || [];
}

/**
 * Consulta los usuarios activos desde view_dash_usuarios (omite campos sensibles)
 */
async function fetchUsuarios() {
    const { data, error } = await supabase
        .from('view_dash_usuarios')
        .select('id, usuario, rol');

    if (error) {
        console.error("❌ [Supabase] Error en fetchUsuarios:", error.message);
        throw error;
    }
    return data || [];
}

/**
 * Resuelve IDs relacionales para chofer, unidad y terminal
 */
async function resolverRelaciones({ nom, tractor, terminal, sharedState }) {
    let chofer_id = null;
    let unidad_id = null;
    let terminal_id = null;

    // 1. Chofer y Unidad desde Hot RAM (O(1)) o Supabase
    const nomClean = normalizarComparacion(nom);
    if (nomClean && sharedState && sharedState.flotaMap && sharedState.flotaMap[nomClean]) {
        const item = sharedState.flotaMap[nomClean];
        chofer_id = item.chofer_id || null;
        unidad_id = item.unidad_id || null;
    } else if (nom) {
        const { data: ch } = await supabase
            .from('choferes')
            .select('id, unidad_id')
            .ilike('nombre', `%${nom.trim()}%`)
            .limit(1);
        if (ch && ch.length > 0) {
            chofer_id = ch[0].id;
            unidad_id = ch[0].unidad_id || null;
        }
    }

    // 2. Unidad por tractor si aún no está asignada
    if (!unidad_id && tractor) {
        const trClean = tractor.trim().toUpperCase();
        const { data: tr } = await supabase
            .from('tractores')
            .select('id')
            .ilike('patente', trClean)
            .limit(1);
        if (tr && tr.length > 0) {
            const { data: u } = await supabase
                .from('unidades')
                .select('id')
                .eq('tractor_id', tr[0].id)
                .limit(1);
            if (u && u.length > 0) {
                unidad_id = u[0].id;
            }
        }
    }

    // 3. Terminal por código o nombre
    if (terminal) {
        const termClean = terminal.trim().toUpperCase();
        const { data: term } = await supabase
            .from('terminales')
            .select('id')
            .or(`codigo.ilike.${termClean},nombre.ilike.${termClean}`)
            .limit(1);
        if (term && term.length > 0) {
            terminal_id = term[0].id;
        }
    }

    return { chofer_id, unidad_id, terminal_id };
}

/**
 * Resuelve el ID relacional de usuario (creado_por_id) para public.novedades
 * contra la tabla exclusiva public.dash (vinculada a auth.users)
 */
async function resolverCreadorId({ creado_por_id, creador, usuario, sharedState }) {
    if (creado_por_id && typeof creado_por_id === 'string' && creado_por_id.length > 20) {
        return creado_por_id;
    }

    const uNombre = (creador || usuario || '').trim().toUpperCase();
    if (uNombre && sharedState && sharedState.usuarios && sharedState.usuarios.length > 0) {
        const uItem = sharedState.usuarios.find(u => (u.usuario || '').trim().toUpperCase() === uNombre);
        if (uItem && uItem.id) return uItem.id;
    }

    if (uNombre) {
        const { data: uDb } = await supabase
            .from('dash')
            .select('id')
            .ilike('nombre', uNombre)
            .limit(1);
        if (uDb && uDb.length > 0) return uDb[0].id;
    }

    // Fallback: usuario TRANSER en dash
    const { data: uDefault } = await supabase
        .from('dash')
        .select('id')
        .ilike('nombre', 'TRANSER')
        .limit(1);

    return uDefault && uDefault.length > 0 ? uDefault[0].id : null;
}

/**
 * Despacha acciones de mutación atómicas escribiendo directamente sobre public.novedades
 */
async function dispatchNovedad({ action, id_novedad, payload, sharedState }) {
    if (action === 'resolver') {
        const idNum = Number(id_novedad);
        if (isNaN(idNum)) throw new Error('ID de novedad numérico requerido para resolver');

        const updateData = {
            resuelto: true,
            fecha_resolucion: sanitizarFecha(payload?.fecha_resolucion) || new Date().toISOString()
        };

        // Si se especificó un nuevo servicio al resolver (ServiceDropOverlay), actualizar el chofer
        if (payload?.servicio || payload?.srv) {
            let nuevoSrv = (payload.servicio || payload.srv).trim().toUpperCase();
            if (nuevoSrv === 'CM') nuevoSrv = 'CAMPO';
            if (nuevoSrv === 'PP') nuevoSrv = 'PRODUCTOS PRIMARIOS';
            if (nuevoSrv === 'MET') nuevoSrv = 'METANOL';
            if (nuevoSrv === 'LIV' || nuevoSrv === 'LIV.') nuevoSrv = 'LIVIANO';

            const { data: srvRow } = await supabase
                .from('servicios_choferes')
                .select('id')
                .ilike('denominacion', nuevoSrv)
                .limit(1);

            if (srvRow && srvRow.length > 0) {
                const srvId = srvRow[0].id;
                const { data: novRow } = await supabase
                    .from('novedades')
                    .select('chofer_id')
                    .eq('id', idNum)
                    .single();

                if (novRow && novRow.chofer_id) {
                    await supabase
                        .from('choferes')
                        .update({ servicio_id: srvId })
                        .eq('id', novRow.chofer_id);
                    console.log(`✅ [Supabase] (Resolver) Chofer ${novRow.chofer_id} asignado a servicio ${nuevoSrv} (${srvId})`);
                }
            }
        }

        const { data, error } = await supabase
            .from('novedades')
            .update(updateData)
            .eq('id', idNum)
            .select();

        if (error) {
            console.error("❌ [Supabase] Error en update novedad (resolver):", error.message);
            throw error;
        }

        // Si la novedad resuelta correspondía a una baja de diagrama, disparar sincronización para refrescar notas
        dispararSyncBajas();

        return data;
    }

    if (action === 'nueva') {
        const relaciones = await resolverRelaciones({
            nom: payload.nom || payload.chofer,
            tractor: payload.tractor,
            terminal: payload.terminal,
            sharedState
        });

        const tipoNov = payload.tipo_novedad || payload.tipo || 'GENERAL';
        const esLibre = tipoNov === 'LIBRES';
        const finalTerminalId = esLibre ? (payload.terminal_id || relaciones.terminal_id || null) : null;
        const finalCreadorId = await resolverCreadorId({
            creado_por_id: payload.creado_por_id,
            creador: payload.creador,
            usuario: payload.usuario,
            sharedState
        });

        // Resolver tipo_novedad_id relacional
        let tipoNovId = payload.tipo_novedad_id || null;
        let imprimeNotas = false;
        try {
            const { data: tRow } = await supabase
                .from('tipos_novedad')
                .select('id, imprime_nota_movimientos')
                .eq('codigo', tipoNov)
                .limit(1);
            if (tRow && tRow.length > 0) {
                tipoNovId = tRow[0].id;
                imprimeNotas = Boolean(tRow[0].imprime_nota_movimientos);
            }
        } catch (e) {
            // Silencioso
        }

        const insertData = {
            tipo_novedad: tipoNov,
            tipo_novedad_id: tipoNovId,
            fecha_objetivo: sanitizarFecha(payload.fecha_objetivo || payload.fecha),
            detalle: payload.detalle || '',
            resuelto: false,
            creado_por_id: finalCreadorId,
            prioridad: payload.prioridad || 'media',
            chofer_id: payload.chofer_id || relaciones.chofer_id || null,
            unidad_id: payload.unidad_id || relaciones.unidad_id || null,
            terminal_id: finalTerminalId
        };

        const { data, error } = await supabase
            .from('novedades')
            .insert(insertData)
            .select();

        if (error) {
            console.error("❌ [Supabase] Error en insert novedad:", error.message);
            throw error;
        }

        if (imprimeNotas || tipoNov === 'BAJA_DIAGRAMA') {
            dispararSyncBajas({
                chofer_id: insertData.chofer_id,
                chofer_nombre: relaciones.chofer_nombre || payload.nom || payload.chofer || null,
                fecha_objetivo: insertData.fecha_objetivo,
                tipo_novedad: tipoNov,
                tipo_novedad_titulo: payload.tipo_novedad_titulo || tipoNov,
                detalle: insertData.detalle
            });
        }

        return data;
    }

    if (action === 'editar') {
        const idNum = Number(id_novedad);
        if (isNaN(idNum)) throw new Error('ID de novedad numérico requerido para editar');

        const updates = {};
        if (payload.detalle !== undefined) updates.detalle = payload.detalle;
        if (payload.fecha_objetivo !== undefined) updates.fecha_objetivo = sanitizarFecha(payload.fecha_objetivo);
        if (payload.tipo_novedad !== undefined) {
            updates.tipo_novedad = payload.tipo_novedad;
            try {
                const { data: tRow } = await supabase
                    .from('tipos_novedad')
                    .select('id')
                    .eq('codigo', payload.tipo_novedad)
                    .limit(1);
                if (tRow && tRow.length > 0) {
                    updates.tipo_novedad_id = tRow[0].id;
                }
            } catch (e) {}
            // Si la novedad no es de tipo LIBRES, se asegura que terminal_id sea null
            if (payload.tipo_novedad !== 'LIBRES') {
                updates.terminal_id = null;
            } else if (payload.terminal_id !== undefined) {
                updates.terminal_id = payload.terminal_id || null;
            }
        } else if (payload.terminal_id !== undefined) {
            updates.terminal_id = payload.terminal_id || null;
        }
        if (payload.creado_por_id !== undefined) {
            updates.creado_por_id = payload.creado_por_id || null;
        }
        if (payload.resuelto !== undefined) updates.resuelto = Boolean(payload.resuelto);
        if (payload.prioridad !== undefined) updates.prioridad = payload.prioridad;

        // Si se especificó un nuevo servicio, actualizar la relación en la tabla choferes (FK servicio_id)
        if (payload.servicio || payload.srv) {
            let nuevoSrv = (payload.servicio || payload.srv).trim().toUpperCase();
            if (nuevoSrv === 'CM') nuevoSrv = 'CAMPO';
            if (nuevoSrv === 'PP') nuevoSrv = 'PRODUCTOS PRIMARIOS';
            if (nuevoSrv === 'MET') nuevoSrv = 'METANOL';
            if (nuevoSrv === 'LIV' || nuevoSrv === 'LIV.') nuevoSrv = 'LIVIANO';

            const { data: srvRow } = await supabase
                .from('servicios_choferes')
                .select('id')
                .ilike('denominacion', nuevoSrv)
                .limit(1);

            if (srvRow && srvRow.length > 0) {
                const srvId = srvRow[0].id;
                const { data: novRow } = await supabase
                    .from('novedades')
                    .select('chofer_id')
                    .eq('id', idNum)
                    .single();

                if (novRow && novRow.chofer_id) {
                    await supabase
                        .from('choferes')
                        .update({ servicio_id: srvId })
                        .eq('id', novRow.chofer_id);
                    console.log(`✅ [Supabase] Chofer ${novRow.chofer_id} actualizado a servicio ${nuevoSrv} (${srvId})`);
                }
            }
        }

        const { data, error } = await supabase
            .from('novedades')
            .update(updates)
            .eq('id', idNum)
            .select();

        if (error) {
            console.error("❌ [Supabase] Error en update novedad (editar):", error.message);
            throw error;
        }

        if (updates.tipo_novedad === 'BAJA_DIAGRAMA' || updates.fecha_objetivo || payload.tipo_novedad === 'BAJA_DIAGRAMA') {
            dispararSyncBajas(null);
        }

        return data;
    }

    throw new Error(`Acción no reconocida: ${action}`);
}

/**
 * Asigna terminal a una novedad en la base de datos
 */
async function asignarTerminalNovedad(id_novedad, terminal, terminal_id) {
    const idNum = Number(id_novedad);
    if (isNaN(idNum)) throw new Error('ID de novedad inválido');

    // Verificar que la novedad sea estrictamente de tipo LIBRES
    const { data: nov } = await supabase
        .from('novedades')
        .select('tipo_novedad')
        .eq('id', idNum)
        .limit(1);

    if (nov && nov.length > 0 && nov[0].tipo_novedad !== 'LIBRES') {
        console.warn(`⚠️ [Supabase] Asignación de terminal rechazada: la novedad ID ${idNum} es de tipo ${nov[0].tipo_novedad} (terminal es exclusivo para LIBRES).`);
        return null;
    }

    let finalTermId = terminal_id || null;
    if (!finalTermId && terminal && terminal.trim().length > 0) {
        const termClean = terminal.trim().toUpperCase();
        const { data: term } = await supabase
            .from('terminales')
            .select('id')
            .or(`codigo.ilike.${termClean},nombre.ilike.${termClean}`)
            .limit(1);
        if (term && term.length > 0) {
            finalTermId = term[0].id;
        }
    }

    const { data, error } = await supabase
        .from('novedades')
        .update({ terminal_id: finalTermId })
        .eq('id', idNum)
        .select();

    if (error) {
        console.error("❌ [Supabase] Error asignando terminal:", error.message);
        throw error;
    }
    return data;
}

/**
 * Agrega o quita mención en public.dash_menciones
 */
async function gestionarMencionNovedad(id_novedad, usuario, accion) {
    const idNum = Number(id_novedad);
    if (isNaN(idNum)) throw new Error('ID de novedad inválido');

    const uNorm = normalizar(usuario);

    if (accion === 'agregar') {
        const { data, error } = await supabase
            .from('dash_menciones')
            .upsert({
                novedad_id: idNum,
                usuario_nombre: uNorm
            }, { onConflict: 'novedad_id,usuario_nombre' })
            .select();

        if (error) {
            console.error("❌ [Supabase] Error agregando mención:", error.message);
            throw error;
        }
        return data;
    } else if (accion === 'quitar') {
        const { data, error } = await supabase
            .from('dash_menciones')
            .delete()
            .match({ novedad_id: idNum, usuario_nombre: uNorm })
            .select();

        if (error) {
            console.error("❌ [Supabase] Error quitando mención:", error.message);
            throw error;
        }
        return data;
    }
}

/**
 * Autenticación exclusiva de DASH mediante public.dash (vinculada a auth.users)
 */
async function autenticarUsuario(usuario, password) {
    const uClean = (usuario || '').trim();
    if (!uClean || !password) throw new Error('Usuario y contraseña requeridos');

    const { data: users, error } = await supabase
        .from('dash')
        .select('id, nombre, "contraseña"')
        .ilike('nombre', uClean)
        .limit(1);

    if (error || !users || users.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    const user = users[0];
    if (user['contraseña'] !== password) {
        throw new Error('Contraseña incorrecta');
    }

    const uUpper = user.nombre.toUpperCase();
    return {
        id: user.id,
        usuario: uUpper,
        rol: uUpper === 'TRANSER' || uUpper === 'MATIAS' ? 'admin' : 'operador'
    };
}

/**
 * Suscribe a eventos en tiempo real de Supabase
 */
function iniciarRealtimeListener(onEventCallback) {
    try {
        const channel = supabase
            .channel('backend-dash-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'novedades'
            }, (payload) => {
                console.log(`🔔 [Supabase Realtime] Evento: ${payload.eventType} en novedades ID ${payload.new?.id || payload.old?.id}`);
                if (typeof onEventCallback === 'function') onEventCallback('novedades', payload);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'dash_menciones'
            }, (payload) => {
                console.log(`🔔 [Supabase Realtime] Evento mención: ${payload.eventType}`);
                if (typeof onEventCallback === 'function') onEventCallback('menciones', payload);
            })
            .subscribe((status) => {
                console.log(`⚡ [Supabase Realtime] Estado del canal: ${status}`);
            });

        return channel;
    } catch (e) {
        console.error("❌ [Supabase Realtime] Error iniciando listener:", e.message);
        return null;
    }
}

module.exports = {
    supabase,
    sanitizarFecha,
    fetchNovedades,
    fetchFlota,
    fetchRetorno,
    fetchTerminales,
    fetchServiciosChoferes,
    fetchUsuarios,
    fetchTiposNovedad,
    dispararSyncBajas,
    dispatchNovedad,
    asignarTerminalNovedad,
    gestionarMencionNovedad,
    autenticarUsuario,
    resolverCreadorId,
    iniciarRealtimeListener
};
