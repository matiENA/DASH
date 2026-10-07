// ==============================================================
// 🌐 CONFIGURACIÓN GLOBAL DE DASH
// ==============================================================

// Detección dinámica de entorno (Local vs Producción en Render Web Service)
const ES_LOCAL = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Asignación de puertos para entorno de prueba:
// Frontend: Puerto 3000
// Backend:  Puerto 3005
const PUERTO_BACKEND_LOCAL = (typeof window !== 'undefined' && window.location.port === '3005') ? '3000' : '3005';
const DEFAULT_LOCAL_BACKEND = `http://localhost:${PUERTO_BACKEND_LOCAL}`;

const DEFAULT_PROD_BACKEND = (typeof window !== 'undefined' && window.BACKEND_API_URL)
    ? window.BACKEND_API_URL
    : 'https://dash-backend.onrender.com';

const API_URL = ES_LOCAL ? DEFAULT_LOCAL_BACKEND : DEFAULT_PROD_BACKEND;

// Estado global de la aplicación compartido entre módulos
let RAM_Flota = [];
let RAM_Novedades = [];
let RAM_Usuarios = [];
let vistaActual = 'todas';
