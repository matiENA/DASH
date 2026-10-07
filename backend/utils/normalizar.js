/**
 * normalizar.js
 * Normaliza cadenas de texto para comparaciones insensibles a mayúsculas y acentos.
 */
function normalizar(texto) {
    if (!texto) return '';
    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

module.exports = { normalizar };
