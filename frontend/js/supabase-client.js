/**
 * supabase-client.js
 * Cliente centralizado de Supabase para DASH.
 * Gestiona consultas a las View Tables (view_dash_*) y la reactividad en tiempo real.
 */

const SUPABASE_URL = 'https://rsvajuxihvmpmrmlcbul.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n97mVkSclRpuv_OsseO3gg_BjR9QT3R';

// Inicializar cliente Supabase si el SDK está cargado
let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("⚡ [Supabase] Cliente inicializado correctamente.");
} else if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("⚡ [Supabase] Cliente inicializado correctamente (window.supabase).");
} else {
    console.warn("⚠️ [Supabase] SDK @supabase/supabase-js no detectado todavía. Se inicializará cuando esté disponible.");
}

function getSupabase() {
    if (!supabaseClient) {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    }
    return supabaseClient;
}

// ==============================================================
// 📥 LECTURAS (VIEW TABLES)
// ==============================================================

/**
 * Carga las novedades activas y resueltas desde view_dash_novedades.
 */
async function cargarNovedadesDesdeSupabase() {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client no inicializado");

    const { data, error } = await sb
        .from('view_dash_novedades')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("❌ [Supabase] Error cargando view_dash_novedades:", error);
        throw error;
    }

    // Normalizar formato para que coincida 100% con las estructuras de feed.js
    const novedadesNormalizadas = (data || []).map(row => ({
        ...row,
        id: String(row.id || row.card_id),
        nom: (row.nom || row.chofer_nombre || '').toUpperCase(),
        tractor: (row.tractor || '').toUpperCase(),
        semi: (row.semi || '').toUpperCase(),
        srv: (row.srv || row.servicio || 'S/A').toUpperCase(),
        n_ute: row.n_ute || 'S/D',
        timestamp: row.timestamp || row.creado_el || new Date().toISOString(),
        vencimientosObj: {
            mas: row.mas_tr,
            vtv: row.vtv_tr,
            mas_semi: row.mas_semi,
            vtv_semi: row.vtv_semi,
            esp_es: row.esp_es,
            vi: row.vi,
            ve: row.ve
        }
    }));

    return novedadesNormalizadas;
}

/**
 * Carga el catálogo de flota para autocompletado desde view_dash_flota.
 */
async function cargarFlotaDesdeSupabase() {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client no inicializado");

    const { data, error } = await sb
        .from('view_dash_flota')
        .select('*');

    if (error) {
        console.error("❌ [Supabase] Error cargando view_dash_flota:", error);
        throw error;
    }

    const flotaArray = [];
    const flotaMap = {};
    const vencimientosObj = [];

    (data || []).forEach(row => {
        const nomUpper = (row.nom || '').trim().toUpperCase();
        if (!nomUpper) return;

        const normKey = (typeof normalizarTexto === 'function') 
            ? normalizarTexto(nomUpper) 
            : nomUpper.toLowerCase();

        const item = {
            chofer_id: row.chofer_id,
            nom: nomUpper,
            nombre: nomUpper,
            tractor: (row.tractor || '').trim().toUpperCase(),
            semi: (row.semi || '').trim().toUpperCase(),
            n_ute: row.n_ute || 'S/D',
            srv: (row.srv || row.servicio || 'S/A').toUpperCase(),
            servicio: (row.srv || row.servicio || 'S/A').toUpperCase(),
            cisternado: row.cisternado || '',
            foto: row.foto || '',
            estado: row.estado_chofer || 'disponible',
            mas_tr: row.mas_tr,
            vtv_tr: row.vtv_tr,
            mas_semi: row.mas_semi,
            vtv_semi: row.vtv_semi,
            esp_es: row.esp_es,
            vi: row.vi,
            ve: row.ve
        };

        flotaArray.push(item);
        flotaMap[normKey] = item;

        if (row.tractor) {
            vencimientosObj.push({
                patente: row.tractor,
                mas: row.mas_tr,
                vtv: row.vtv_tr,
                mas_semi: row.mas_semi,
                vtv_semi: row.vtv_semi,
                esp_es: row.esp_es,
                vi: row.vi,
                ve: row.ve
            });
        }
    });

    return {
        flota: flotaArray,
        flotaMap: flotaMap,
        vencimientosObj: vencimientosObj,
        unidades: flotaArray
    };
}

/**
 * Carga los choferes que retornan hoy y mañana desde view_dash_retorno.
 */
async function cargarRetornosDesdeSupabase() {
    const sb = getSupabase();
    if (!sb) return [];

    try {
        const { data, error } = await sb
            .from('view_dash_retorno')
            .select('*');

        if (error) {
            console.warn("⚠️ [Supabase] Error en view_dash_retorno:", error.message);
            return [];
        }
        return data || [];
    } catch(e) {
        console.warn("⚠️ [Supabase] Excepción en view_dash_retorno:", e.message);
        return [];
    }
}

/**
 * Carga la lista de usuarios para @menciones desde view_dash_usuarios.
 */
async function cargarUsuariosDesdeSupabase() {
    const sb = getSupabase();
    if (!sb) return [];

    try {
        const { data, error } = await sb
            .from('view_dash_usuarios')
            .select('*');

        if (error) {
            console.warn("⚠️ [Supabase] Error en view_dash_usuarios:", error.message);
            return [];
        }
        return data || [];
    } catch(e) {
        return [];
    }
}

// ==============================================================
// 📤 ESCRITURAS (VIEW TRIGGER / NOVEDADES)
// ==============================================================

/**
 * Inserta una nueva novedad en Supabase mediante view_dash_novedades.
 */
async function crearNovedadEnSupabase(payload) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client no disponible");

    const record = {
        tipo_novedad: payload.tipo_novedad,
        nom: (payload.nom || '').toUpperCase(),
        tractor: (payload.tractor || '').toUpperCase(),
        fecha_objetivo: payload.fecha_objetivo || null,
        detalle: payload.detalle || '',
        creador: payload.creador || 'DASH',
        resuelto: false
    };

    const { data, error } = await sb
        .from('view_dash_novedades')
        .insert(record)
        .select();

    if (error) {
        console.error("❌ [Supabase] Error insertando novedad:", error);
        throw error;
    }

    console.log("✅ [Supabase] Novedad creada exitosamente:", data);
    return data;
}

/**
 * Marca una novedad como resuelta en Supabase.
 */
async function resolverNovedadEnSupabase(idNovedad) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client no disponible");

    const idNum = Number(idNovedad);
    const filter = !isNaN(idNum) ? { id: idNum } : { legacy_id: String(idNovedad) };

    const { data, error } = await sb
        .from('view_dash_novedades')
        .update({ 
            resuelto: true, 
            fecha_resolucion: new Date().toISOString() 
        })
        .match(filter)
        .select();

    if (error) {
        console.error("❌ [Supabase] Error resolviendo novedad:", error);
        throw error;
    }

    console.log("✅ [Supabase] Novedad resuelta exitosamente:", data);
    return data;
}

/**
 * Edita campos de una novedad en Supabase.
 */
async function editarNovedadEnSupabase(idNovedad, payload) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client no disponible");

    const idNum = Number(idNovedad);
    const filter = !isNaN(idNum) ? { id: idNum } : { legacy_id: String(idNovedad) };

    const updates = {};
    if (payload.detalle !== undefined) updates.detalle = payload.detalle;
    if (payload.fecha_objetivo !== undefined) updates.fecha_objetivo = payload.fecha_objetivo;
    if (payload.tipo_novedad !== undefined) updates.tipo_novedad = payload.tipo_novedad;
    if (payload.resuelto !== undefined) updates.resuelto = payload.resuelto;

    const { data, error } = await sb
        .from('view_dash_novedades')
        .update(updates)
        .match(filter)
        .select();

    if (error) {
        console.error("❌ [Supabase] Error editando novedad:", error);
        throw error;
    }

    console.log("✅ [Supabase] Novedad editada exitosamente:", data);
    return data;
}

// ==============================================================
// ⚡ REALTIME WEBSOCKET LISTENER
// ==============================================================
let realtimeChannel = null;

function iniciarRealtimeSupabase(onUpdateCallback) {
    const sb = getSupabase();
    if (!sb) return;

    if (realtimeChannel) {
        sb.removeChannel(realtimeChannel);
    }

    realtimeChannel = sb.channel('dash-realtime-public')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'novedades' 
        }, (payload) => {
            console.log("🔔 [Realtime] Evento detectado en tabla novedades:", payload.eventType);
            if (typeof onUpdateCallback === 'function') {
                onUpdateCallback(payload);
            }
        })
        .subscribe((status) => {
            console.log("⚡ [Realtime] Estado de suscripción:", status);
        });
}

// Despachador universal para resolver, crear y editar
window.despacharNovedad = async function(bodyData) {
    const sb = getSupabase();
    if (sb) {
        try {
            if (bodyData.action === 'resolver') {
                return await resolverNovedadEnSupabase(bodyData.id_novedad);
            } else if (bodyData.action === 'nueva') {
                return await crearNovedadEnSupabase(bodyData.payload);
            } else if (bodyData.action === 'editar') {
                return await editarNovedadEnSupabase(bodyData.id_novedad, bodyData.payload);
            }
        } catch(e) {
            console.error("❌ [Supabase] Error en despacho, reintentando con API_URL:", e);
        }
    }
    if (typeof API_URL !== 'undefined') {
        return fetch(`${API_URL}/api/novedades/actualizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
    }
};

// Exportar globalmente para que cualquier script pueda utilizarlas
window.DashSupabase = {
    getSupabase,
    cargarNovedades: cargarNovedadesDesdeSupabase,
    cargarFlota: cargarFlotaDesdeSupabase,
    cargarRetornos: cargarRetornosDesdeSupabase,
    cargarUsuarios: cargarUsuariosDesdeSupabase,
    crearNovedad: crearNovedadEnSupabase,
    resolverNovedad: resolverNovedadEnSupabase,
    editarNovedad: editarNovedadEnSupabase,
    iniciarRealtime: iniciarRealtimeSupabase,
    despacharNovedad: window.despacharNovedad
};
