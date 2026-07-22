// Variable global que detecta si corre en local o producción
const API_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:3000'
    : window.location.origin;

// Estado global de la aplicación compartido entre módulos
let RAM_Flota = [];
let RAM_Novedades = [];
let vistaActual = 'pendientes';
