// Variable global que detecta si corre en local o producción
// ⚠️ TEMPORAL: RAILWAY (Para volver a Render, descomentar Render y comentar Railway)
// const PROD_URL = 'https://diagramasnode.onrender.com';
const PROD_URL = 'https://diagramasnode-production.up.railway.app';

const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000'
    : PROD_URL;

// Estado global de la aplicación compartido entre módulos
let RAM_Flota = [];
let RAM_Novedades = [];
let RAM_Usuarios = [];
let vistaActual = 'todas';
