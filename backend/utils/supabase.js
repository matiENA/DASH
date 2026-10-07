require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rsvajuxihvmpmrmlcbul.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_n97mVkSclRpuv_OsseO3gg_BjR9QT3R';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ [Supabase] SUPABASE_URL o SUPABASE_KEY no están configurados en el entorno.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`🐘 [Supabase] Cliente conectado a: ${SUPABASE_URL}`);

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
 * Consulta los usuarios activos desde view_dash_usuarios
 */
async function fetchUsuarios() {
    const { data, error } = await supabase
        .from('view_dash_usuarios')
        .select('*');

    if (error) {
        console.error("❌ [Supabase] Error en fetchUsuarios:", error.message);
        throw error;
    }
    return data || [];
}

/**
 * Despacha acciones de mutación (crear, resolver, editar) sobre view_dash_novedades
 */
async function dispatchNovedad({ action, id_novedad, payload }) {
    if (action === 'resolver') {
        const idNum = Number(id_novedad);
        const filter = !isNaN(idNum) ? { id: idNum } : { legacy_id: String(id_novedad) };

        const updateData = {
            resuelto: true,
            fecha_resolucion: (payload && payload.fecha_resolucion) ? payload.fecha_resolucion : new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('view_dash_novedades')
            .update(updateData)
            .match(filter)
            .select();

        if (error) throw error;
        return data;
    }

    if (action === 'nueva') {
        const insertData = {
            tipo_novedad: payload.tipo_novedad || payload.tipo || 'GENERAL',
            fecha_objetivo: payload.fecha_objetivo || payload.fecha || new Date().toISOString().split('T')[0],
            detalle: payload.detalle || '',
            resuelto: false,
            creador: payload.creador || payload.usuario || 'DASH',
            nom: payload.nom || payload.chofer || null,
            tractor: payload.tractor || null,
            n_ute: payload.n_ute || null
        };

        const { data, error } = await supabase
            .from('view_dash_novedades')
            .insert(insertData)
            .select();

        if (error) throw error;
        return data;
    }

    if (action === 'editar') {
        const idNum = Number(id_novedad);
        const filter = !isNaN(idNum) ? { id: idNum } : { legacy_id: String(id_novedad) };

        const updates = {};
        if (payload.detalle !== undefined) updates.detalle = payload.detalle;
        if (payload.fecha_objetivo !== undefined) updates.fecha_objetivo = payload.fecha_objetivo;
        if (payload.tipo_novedad !== undefined) updates.tipo_novedad = payload.tipo_novedad;
        if (payload.resuelto !== undefined) updates.resuelto = payload.resuelto;

        const { data, error } = await supabase
            .from('view_dash_novedades')
            .update(updates)
            .match(filter)
            .select();

        if (error) throw error;
        return data;
    }

    throw new Error(`Acción no reconocida: ${action}`);
}

/**
 * Autenticación mediante función RPC login_dash_usuario
 */
async function autenticarUsuario(usuario, password) {
    try {
        const { data, error } = await supabase.rpc('login_dash_usuario', {
            p_usuario: usuario,
            p_password: password
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.warn("⚠️ [Auth] Falló RPC login_dash_usuario, verificando view_dash_usuarios:", err.message);
        const { data: users, error: errUsers } = await supabase
            .from('view_dash_usuarios')
            .select('*')
            .ilike('usuario', usuario)
            .limit(1);

        if (!errUsers && users && users.length > 0) {
            return {
                id: users[0].id,
                usuario: users[0].usuario,
                rol: users[0].rol || 'operador'
            };
        }
        throw err;
    }
}

/**
 * Suscribe a eventos en tiempo real de la tabla novedades
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
                console.log(`🔔 [Backend Realtime] Evento: ${payload.eventType} en novedades ID ${payload.new?.id || payload.old?.id}`);
                if (typeof onEventCallback === 'function') {
                    onEventCallback(payload);
                }
            })
            .subscribe((status) => {
                console.log(`⚡ [Backend Realtime] Estado del canal: ${status}`);
            });

        return channel;
    } catch (e) {
        console.error("❌ [Backend Realtime] Error iniciando listener:", e.message);
        return null;
    }
}

module.exports = {
    supabase,
    fetchNovedades,
    fetchFlota,
    fetchRetorno,
    fetchUsuarios,
    dispatchNovedad,
    autenticarUsuario,
    iniciarRealtimeListener
};
