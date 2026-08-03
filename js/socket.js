// Inicializar la conexión de Socket.IO
const socket = io(API_URL + '/dash');

function cargarDatosIniciales(intentos = 0) {
    fetch(`${API_URL}/api/datos`)
        .then(res => {
            if (!res.ok) return fetch(`${API_URL}/api/dash/flota`).then(r => r.json());
            return res.json();
        })
        .then(data => {
            if (data) {
                if (data.diagramas) {
                    RAM_Flota = data.diagramas.flota || data.diagramas.diagramas || data.flota || [];
                    if (data.diagramas.vencimientosObj) RAM_Flota.vencimientosObj = data.diagramas.vencimientosObj;
                } else if (data.flota) {
                    RAM_Flota = data.flota;
                }
                if (data.vencimientosObj && Array.isArray(RAM_Flota)) {
                    RAM_Flota.vencimientosObj = data.vencimientosObj;
                }
                if (data.flotaMap && Array.isArray(RAM_Flota)) RAM_Flota.flotaMap = data.flotaMap;
                if (data.usuarios) RAM_Usuarios = data.usuarios;
                if (typeof renderizar === 'function') renderizar();
            }
        })
        .catch(e => {
            console.warn(`[Socket] Intento ${intentos + 1}: al obtener /api/datos (${e.message}). Reintentando en 3s...`);
            if (intentos < 10) {
                setTimeout(() => cargarDatosIniciales(intentos + 1), 3000);
            }
        });
}

function cargarNovedadesIniciales(intentos = 0) {
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
            console.warn(`[Socket] Intento ${intentos + 1}: al obtener /api/novedades (${e.message}). Reintentando en 3s...`);
            if (intentos < 10) {
                setTimeout(() => cargarNovedadesIniciales(intentos + 1), 3000);
            }
        });
}

// Escucha inicial y carga de datos locales
socket.on('connect', () => {
    console.log("⚡ Conectado al servidor de novedades.");
    cargarDatosIniciales();
});

cargarNovedadesIniciales();

// Escuchadores de eventos de actualización en tiempo real
// datos_actualizados ya no se recibe por socket — se carga via HTTP en cargarDatosIniciales()

socket.on('novedades_actualizadas', (data) => { 
    RAM_Novedades = data; 
    if (typeof renderizar === 'function') renderizar(); 
});
