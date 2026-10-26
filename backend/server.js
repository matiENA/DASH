require('dotenv').config();

const express = require('express');
const http = require('http');
const compression = require('compression');
const cors = require('cors');
const { Server } = require('socket.io');

const {
    fetchFlota,
    fetchNovedades,
    fetchRetorno,
    fetchUsuarios,
    fetchTerminales,
    fetchServiciosChoferes,
    iniciarRealtimeListener
} = require('./utils/supabase');
const { normalizarComparacion } = require('./utils/normalizar');

const createDashRouter = require('./routes/dash');
const createNovedadesRouter = require('./routes/novedades');
const createAuthRouter = require('./routes/auth');

// ==============================================================
// 🚀 INICIALIZACIÓN DE EXPRESS Y HTTP SERVER
// ==============================================================
const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT, 10) || 3005;

// ==============================================================
// 📦 COMPRESIÓN GZIP (Reduce transferencia de datos hasta un 85%)
// ==============================================================
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// ==============================================================
// 🛡️ CONFIGURACIÓN DE CORS
// ==============================================================
const corsConfig = {
    origin: (origin, callback) => callback(null, true), // Flexible para dashboards y Static Sites
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
};

app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==============================================================
// ⚡ SOCKET.IO CON NAMESPACE /dash
// ==============================================================
const io = new Server(server, {
    cors: corsConfig,
    transports: ['websocket', 'polling']
});

const ioDash = io.of('/dash');

// ==============================================================
// 🧠 ESTADO EN MEMORIA COMPARTIDO (HOT RAM ENGINE)
// ==============================================================
const sharedState = {
    flota: [],
    flotaMap: {},
    novedades: [],
    usuarios: [],
    retornos: [],
    catalogoTerminales: [],
    servicios: [],
    vencimientosObj: [],
    lastFlotaUpdate: null,
    lastNovedadesUpdate: null,
    lastRetornosUpdate: null
};

ioDash.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Cliente conectado a /dash: ${socket.id}`);

    // Si ya hay novedades en Hot RAM, enviarlas al instante sin tocar la base de datos
    if (sharedState.novedades && sharedState.novedades.length > 0) {
        socket.emit('novedades_actualizadas', sharedState.novedades);
    }

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket.IO] Cliente desconectado de /dash: ${socket.id}`);
    });
});

// ==============================================================
// 🔄 HIDRATACIÓN INICIAL DE HOT RAM AL ARRANCAR
// ==============================================================
async function hidratarHotRAM() {
    try {
        console.log("⚡ [Hot RAM] Precargando catálogo de flota, novedades y retornos en memoria...");
        const [rawFlota, novedades, retornos, usuarios, terminales, servicios] = await Promise.all([
            fetchFlota().catch(() => []),
            fetchNovedades().catch(() => []),
            fetchRetorno().catch(() => []),
            fetchUsuarios().catch(() => []),
            fetchTerminales().catch(() => []),
            fetchServiciosChoferes().catch(() => [])
        ]);

        const flotaLite = [];
        const flotaMap = {};
        const vencimientosObj = [];

        rawFlota.forEach(row => {
            const nomUpper = (row.nom || '').trim().toUpperCase();
            if (!nomUpper) return;

            const item = {
                chofer_id: row.chofer_id,
                nom: nomUpper,
                nombre: nomUpper,
                srv: (row.srv || row.servicio || 'S/A').toUpperCase(),
                servicio: (row.srv || row.servicio || 'S/A').toUpperCase(),
                srv_chofer: (row.srv || row.servicio || 'S/A').toUpperCase(),
                tractor: (row.tractor || '').trim().toUpperCase(),
                semi: (row.semi || '').trim().toUpperCase(),
                cisternado: row.cisternado || '',
                n_ute: row.n_ute || 'S/D',
                foto: row.foto || '',
                estado: row.estado_chofer || 'disponible',
                unidad_id: row.unidad_id || null,
                mas_tr: row.mas_tr || null,
                vtv_tr: row.vtv_tr || null,
                mas_semi: row.mas_semi || null,
                vtv_semi: row.vtv_semi || null,
                esp_es: row.esp_es || null,
                vi: row.vi || null,
                ve: row.ve || null
            };

            flotaLite.push(item);
            flotaMap[normalizarComparacion(nomUpper)] = item;

            if (row.tractor || row.semi) {
                vencimientosObj.push({
                    patente: row.tractor || row.semi,
                    tractor: row.tractor || '',
                    semi: row.semi || '',
                    cisternado: row.cisternado || '',
                    vtv: row.vtv_tr || row.vtv_semi,
                    mas: row.mas_tr || row.mas_semi,
                    esp_es: row.esp_es,
                    vi: row.vi,
                    ve: row.ve
                });
            }
        });

        sharedState.flota = flotaLite;
        sharedState.flotaMap = flotaMap;
        sharedState.vencimientosObj = vencimientosObj;
        sharedState.novedades = novedades;
        sharedState.usuarios = usuarios;
        sharedState.catalogoTerminales = terminales;
        sharedState.servicios = servicios;

        // Enriquecer retornos con tractor si viene vacío
        sharedState.retornos = retornos.map(r => ({
            ...r,
            tractor: r.tractor || (flotaMap[normalizarComparacion(r.nom)]?.tractor || '')
        }));

        sharedState.lastFlotaUpdate = new Date().toISOString();
        sharedState.lastNovedadesUpdate = new Date().toISOString();
        sharedState.lastRetornosUpdate = new Date().toISOString();

        console.log(`✅ [Hot RAM] Hidratado exitoso: ${flotaLite.length} choferes en flota, ${novedades.length} novedades, ${retornos.length} retornos.`);
    } catch (e) {
        console.error("❌ [Hot RAM] Error durante la hidratación inicial:", e.message);
    }
}

// ==============================================================
// 🌉 PUENTE REALTIME: SUPABASE -> HOT RAM -> SOCKET.IO BROADCAST
// ==============================================================
iniciarRealtimeListener(async (origen, payload) => {
    try {
        console.log(`⚡ [Realtime Bridge] Evento detectado desde ${origen}. Refrescando Hot RAM...`);
        const novedades = await fetchNovedades();
        sharedState.novedades = novedades;
        sharedState.lastNovedadesUpdate = new Date().toISOString();

        // Push inmediato a todos los clientes conectados
        ioDash.emit('novedades_actualizadas', novedades);
    } catch (e) {
        console.error("❌ [Realtime Bridge] Error sincronizando novedades:", e.message);
    }
});

// ==============================================================
// ⏱️ DIRTY CHECK DEFENSIVO CADA 30 SEGUNDOS
// ==============================================================
setInterval(async () => {
    try {
        // Refresco silencioso de retornos y novedades
        const [frescas, rets] = await Promise.all([
            fetchNovedades().catch(() => null),
            fetchRetorno().catch(() => null)
        ]);

        if (frescas) {
            sharedState.novedades = frescas;
            sharedState.lastNovedadesUpdate = new Date().toISOString();
        }

        if (rets) {
            sharedState.retornos = rets.map(r => ({
                ...r,
                tractor: r.tractor || (sharedState.flotaMap[normalizarComparacion(r.nom)]?.tractor || '')
            }));
            sharedState.lastRetornosUpdate = new Date().toISOString();
        }
    } catch (e) {
        // Silencioso para no ensuciar logs
    }
}, 30000);

// ==============================================================
// 🛣️ RUTAS API
// ==============================================================

// Health checks para monitoreo y despliegue en Render Web Service
app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "dash-backend",
        version: "2.0.0",
        uptime: Math.round(process.uptime()),
        hot_ram: {
            flota_count: sharedState.flota.length,
            novedades_count: sharedState.novedades.length,
            retornos_count: sharedState.retornos.length
        },
        timestamp: new Date().toISOString()
    });
});

// Rutas modulares
app.use('/api/dash', createDashRouter(sharedState, ioDash));
app.use('/api/novedades', createNovedadesRouter(sharedState, ioDash));
app.use('/api/auth', createAuthRouter());

// Compatibilidad con endpoints heredados
app.get('/api/datos', (req, res) => {
    res.json({
        success: true,
        diagramas: {
            flota: sharedState.flotaMap || {},
            diagramas: sharedState.flota || [],
            unidades: sharedState.flota || []
        },
        usuarios: sharedState.usuarios || [],
        timestamp: new Date().toISOString()
    });
});

// Ruta raíz informativa
app.get('/', (req, res) => {
    res.json({
        service: "DASH Web Service Backend (Hot RAM Engine)",
        status: "online",
        compression: "gzip",
        endpoints: {
            health: "/health",
            dash_flota: "/api/dash/flota",
            dash_retorno: "/api/dash/retorno",
            dash_novedades: "/api/dash/novedades",
            dash_usuarios: "/api/dash/usuarios",
            dash_terminales: "/api/dash/terminales",
            novedades_actualizar: "/api/novedades/actualizar",
            novedades_mencion: "/api/novedades/mencion",
            novedades_terminal: "/api/novedades/terminal",
            auth_login: "/api/auth/login"
        }
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error("💥 Error interno no capturado:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
});

// ==============================================================
// 🟢 ARRANQUE DEL SERVIDOR
// ==============================================================
server.listen(PORT, async () => {
    console.log(`\n==============================================================`);
    console.log(`🚀 [DASH Backend] Web Service activo en puerto ${PORT}`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`⚡ Socket.IO activo en namespace /dash`);
    console.log(`==============================================================\n`);

    await hidratarHotRAM();
});
