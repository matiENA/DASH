require('dotenv').config();

const express = require('express');
const http = require('http');
const compression = require('compression');
const cors = require('cors');
const { Server } = require('socket.io');

const { fetchNovedades, iniciarRealtimeListener } = require('./utils/supabase');
const createDashRouter = require('./routes/dash');
const createNovedadesRouter = require('./routes/novedades');
const createAuthRouter = require('./routes/auth');

// ==============================================================
// 🚀 INICIALIZACIÓN DE EXPRESS Y HTTP SERVER
// ==============================================================
const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT, 10) || 3000;

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
// 🛡️ CONFIGURACIÓN DE CORS FLEXIBLE
// ==============================================================
const allowedExplicitOrigins = [
    process.env.FRONTEND_URL,
    "https://dash-frontend.onrender.com",
    "https://dash-aa1f.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000"
].filter(Boolean);

const checkOrigin = function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
        allowedExplicitOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
    ) {
        return callback(null, true);
    }
    // Permitir cualquier origen en modo API abierta para dashboards distribuidos
    return callback(null, true);
};

const corsConfig = {
    origin: checkOrigin,
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

ioDash.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Cliente conectado a /dash: ${socket.id}`);

    // Si ya hay novedades en memoria, enviarlas al conectar
    if (sharedState.novedades && sharedState.novedades.length > 0) {
        socket.emit('novedades_actualizadas', sharedState.novedades);
    }

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket.IO] Cliente desconectado de /dash: ${socket.id}`);
    });
});

// ==============================================================
// 🧠 ESTADO EN MEMORIA COMPARTIDO
// ==============================================================
const sharedState = {
    flota: [],
    flotaMap: {},
    novedades: [],
    usuarios: [],
    menciones: {}, // { [cardId]: ['USUARIO1', 'USUARIO2'] }
    terminales: {} // { [cardId]: 'DOCK SUD' }
};

// ==============================================================
// 🌉 PUENTE REALTIME: SUPABASE -> SOCKET.IO BROADCAST
// ==============================================================
iniciarRealtimeListener(async (payload) => {
    try {
        console.log("⚡ [Bridge Realtime] Notificando cambio a carteleras Socket.IO...");
        const novedades = await fetchNovedades();
        const enriched = novedades.map(n => {
            const idKey = String(n.id);
            return {
                ...n,
                menciones: sharedState.menciones[idKey] || [],
                terminal: sharedState.terminales[idKey] || n.terminal || ''
            };
        });
        sharedState.novedades = enriched;
        ioDash.emit('novedades_actualizadas', enriched);
    } catch (e) {
        console.error("❌ [Bridge Realtime] Error sincronizando novedades:", e.message);
    }
});

// ==============================================================
// 🛣️ RUTAS API
// ==============================================================

// Health checks para monitoreo de Render Web Service
app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "dash-backend",
        version: "1.0.0",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Rutas modulares
app.use('/api/dash', createDashRouter(sharedState));
app.use('/api/novedades', createNovedadesRouter(sharedState, ioDash));
app.use('/api/auth', createAuthRouter());

// Compatibilidad con frontend legado /api/datos
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
        service: "DASH Web Service Backend",
        status: "online",
        compression: "gzip",
        endpoints: {
            health: "/health",
            dash_flota: "/api/dash/flota",
            dash_retorno: "/api/dash/retorno",
            dash_novedades: "/api/dash/novedades",
            dash_usuarios: "/api/dash/usuarios",
            novedades_actualizar: "/api/novedades/actualizar",
            novedades_mencion: "/api/novedades/mencion",
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
server.listen(PORT, () => {
    console.log(`\n==============================================================`);
    console.log(`🚀 [DASH Backend] Web Service activo en puerto ${PORT}`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`⚡ Socket.IO activo en namespace /dash`);
    console.log(`==============================================================\n`);
});
