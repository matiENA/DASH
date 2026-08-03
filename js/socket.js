// Inicializar la conexión de Socket.IO
const socket = io(API_URL + '/dash');

function cargarDatosIniciales(intentos = 0) {
    fetch(`${API_URL}/api/dash/flota`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data && data.success) {
                RAM_Flota = data.flota || [];
                // Agregar flotaMap para búsqueda por nombre normalizado
                if (data.flotaMap) RAM_Flota.flotaMap = data.flotaMap;
                if (data.usuarios) RAM_Usuarios = data.usuarios;
            }
        })
        .catch(e => {
            console.warn(`[Socket] Intento ${intentos + 1}: al obtener /api/dash/flota (${e.message}). Reintentando en 3s...`);
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
