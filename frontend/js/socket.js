/**
 * socket.js -> Adaptador Híbrido Supabase Realtime + Socket.IO Fallback
 * Conecta DASH directamente a las View Tables de Supabase con reactividad en tiempo real.
 */

let socket = null;
if (typeof io !== 'undefined') {
    try {
        socket = io(API_URL + '/dash', { transports: ['websocket', 'polling'] });
        console.log("⚡ [Socket] Socket.io cliente inicializado como respaldo.");
    } catch(e) {
        console.log("ℹ️ [Socket] Socket.io no disponible en entorno estático.");
    }
}

// ==============================================================
// 1. CARGA DE DATOS DE FLOTA Y USUARIOS
// ==============================================================
async function cargarDatosIniciales(intentos = 0) {
    // 1. Prioridad: Supabase View Tables (view_dash_flota, view_dash_usuarios)
    if (typeof window.DashSupabase !== 'undefined') {
        try {
            console.log("📥 [DASH] Cargando catálogo de flota y usuarios desde Supabase...");
            const [flotaData, retornosData, usuariosData] = await Promise.all([
                window.DashSupabase.cargarFlota(),
                window.DashSupabase.cargarRetornos(),
                window.DashSupabase.cargarUsuarios()
            ]);

            if (flotaData) {
                RAM_Flota = {
                    flota: flotaData.flotaMap || {},
                    flotaMap: flotaData.flotaMap || {},
                    diagramas: flotaData.flota || [],
                    unidades: flotaData.unidades || [],
                    vencimientosObj: flotaData.vencimientosObj || [],
                    retornos: retornosData || []
                };
            }

            if (usuariosData && usuariosData.length > 0) {
                RAM_Usuarios = usuariosData;
            }

            console.log(`✅ [DASH] Flota cargada desde Supabase (${(flotaData.flota || []).length} unidades/choferes).`);
            if (typeof renderizar === 'function') renderizar();
            return;
        } catch(sbErr) {
            console.warn("⚠️ [DASH] Falló carga directa de flota desde Supabase, intentando API_URL:", sbErr.message);
        }
    }

    // 2. Fallback: API HTTP del backend
    fetch(`${API_URL}/api/datos`)
        .then(res => {
            if (!res.ok) return fetch(`${API_URL}/api/dash/flota`).then(r => r.json());
            return res.json();
        })
        .then(data => {
            if (data) {
                if (data.diagramas) {
                    RAM_Flota = data.diagramas;
                    if (!RAM_Flota.flota) RAM_Flota.flota = data.diagramas.flota || {};
                    if (!RAM_Flota.diagramas) RAM_Flota.diagramas = data.diagramas.diagramas || [];
                    if (data.diagramas.vencimientosObj) RAM_Flota.vencimientosObj = data.diagramas.vencimientosObj;
                    if (data.diagramas.unidades) RAM_Flota.unidades = data.diagramas.unidades;
                    if (data.diagramas.ut) RAM_Flota.ut = data.diagramas.ut;
                } else if (data.flota) {
                    RAM_Flota = data.flota;
                    if (data.unidades) RAM_Flota.unidades = data.unidades;
                    if (data.ut) RAM_Flota.ut = data.ut;
                }
                if (data.ut && !RAM_Flota.ut) RAM_Flota.ut = data.ut;
                if (data.unidades && !RAM_Flota.unidades) RAM_Flota.unidades = data.unidades;
                if (!RAM_Flota.ut && RAM_Flota.unidades) RAM_Flota.ut = RAM_Flota.unidades;
                if (data.vencimientosObj) RAM_Flota.vencimientosObj = data.vencimientosObj;
                if (data.flotaMap) RAM_Flota.flotaMap = data.flotaMap;
                if (data.usuarios) RAM_Usuarios = data.usuarios;
                if (typeof renderizar === 'function') renderizar();
            }
        })
        .catch(e => {
            console.warn(`[Socket] Intento ${intentos + 1}: al obtener /api/datos (${e.message}). Reintentando en 4s...`);
            if (intentos < 5) {
                setTimeout(() => cargarDatosIniciales(intentos + 1), 4000);
            }
        });
}

// ==============================================================
// 2. CARGA DE NOVEDADES (TABLERO KANBAN)
// ==============================================================
async function cargarNovedadesIniciales(intentos = 0) {
    // 1. Prioridad: Supabase View Table view_dash_novedades
    if (typeof window.DashSupabase !== 'undefined') {
        try {
            console.log("📥 [DASH] Cargando novedades desde Supabase (view_dash_novedades)...");
            const novedades = await window.DashSupabase.cargarNovedades();
            if (Array.isArray(novedades)) {
                RAM_Novedades = novedades;
                console.log(`✅ [DASH] ${novedades.length} novedades cargadas desde Supabase.`);
                if (typeof renderizar === 'function') renderizar();
                return;
            }
        } catch(sbErr) {
            console.warn("⚠️ [DASH] Error cargando novedades desde Supabase, intentando API_URL:", sbErr.message);
        }
    }

    // 2. Fallback: API HTTP del backend
    fetch(`${API_URL}/api/dash/novedades`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res.json();
        })
        .then(data => { 
            if(data && data.success) { 
                RAM_Novedades = data.data; 
                if (typeof renderizar === 'function') renderizar(); 
            } 
        })
        .catch(e => {
            console.warn(`[Socket] Intento ${intentos + 1}: al obtener /api/novedades (${e.message}). Reintentando en 4s...`);
            if (intentos < 5) {
                setTimeout(() => cargarNovedadesIniciales(intentos + 1), 4000);
            }
        });
}

// ==============================================================
// 3. INICIALIZACIÓN REACTIVA
// ==============================================================
function iniciarConexiones() {
    // Iniciar Realtime de Supabase
    if (typeof window.DashSupabase !== 'undefined') {
        window.DashSupabase.iniciarRealtime((payload) => {
            console.log("🔔 [Realtime] Recibida actualización en novedades:", payload.eventType);
            cargarNovedadesIniciales();
        });
    }

    // Cargar datos
    cargarDatosIniciales();
    cargarNovedadesIniciales();

    // Socket.IO listeners si existe
    if (socket) {
        socket.on('connect', () => {
            console.log("⚡ Conectado al servidor de novedades (Socket.io).");
        });
        socket.on('novedades_actualizadas', (data) => { 
            RAM_Novedades = data; 
            if (typeof renderizar === 'function') renderizar(); 
        });
    }
}

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarConexiones);
} else {
    iniciarConexiones();
}
