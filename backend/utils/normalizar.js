/**
 * normalizar.js
 * Utilidad de sanitización y normalización de cadenas de texto para DASH.
 */

function normalizar(texto) {
    if (!texto || typeof texto !== 'string') return '';
    return texto
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos/acentos
        .toUpperCase();
}

function normalizarComparacion(texto) {
    if (!texto || typeof texto !== 'string') return '';
    return texto
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '');
}

module.exports = {
    normalizar,
    normalizarComparacion
};
