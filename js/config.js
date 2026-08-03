// Variable global que detecta si corre en local o producción
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000'
    : 'https://diagramasnode.onrender.com';

// Estado global de la aplicación compartido entre módulos
let RAM_Flota = [];
let RAM_Novedades = [];
let RAM_Usuarios = [];
let vistaActual = 'todas';
