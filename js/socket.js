// Inicializar la conexión de Socket.IO
const socket = io(API_URL);

// Escucha inicial y carga de datos locales
socket.on('connect', () => {
    console.log("⚡ Conectado al servidor de novedades.");
    // Fetch inicial de la flota desde la API principal para tener datos de autocompletado de inmediato
    fetch(`${API_URL}/api/datos`)
        .then(res => res.json())
        .then(data => {
            if (data && data.diagramas && data.diagramas.diagramas) {
                RAM_Flota = data.diagramas.diagramas;
            }
        })
        .catch(e => console.error("Error al obtener datos iniciales de la flota:", e));
});

// Carga inicial de novedades existentes
fetch(`${API_URL}/api/novedades`)
    .then(res => res.json())
    .then(data => { 
        if(data.success) { 
            RAM_Novedades = data.data; 
            renderizar(); 
        } 
    })
    .catch(e => console.error("Error al obtener novedades iniciales:", e));

// Escuchadores de eventos de actualización en tiempo real
socket.on('datos_actualizados', (data) => { 
    if(data && data.diagramas) {
        RAM_Flota = data.diagramas.diagramas; 
    }
});

socket.on('novedades_actualizadas', (data) => { 
    RAM_Novedades = data; 
    renderizar(); 
});
