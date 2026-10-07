/**
 * server.js (Frontend Local Test Server)
 * Servidor HTTP nativo de Node.js para entorno de prueba.
 * Sirve los archivos estáticos de DASH en el puerto 3000 sin dependencias externas.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Manejo de preflight CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Normalizar ruta al index.html si es raíz
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    let filePath = path.join(BASE_DIR, pathname);

    // Protección básica contra path traversal
    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Acceso denegado');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // SPA fallback a index.html
            const fallbackPath = path.join(BASE_DIR, 'index.html');
            fs.readFile(fallbackPath, (errFallback, content) => {
                if (errFallback) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('404 No Encontrado');
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(content);
            });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (errRead, data) => {
            if (errRead) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('Error leyendo archivo');
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`\n==============================================================`);
    console.log(`🌐 [DASH Frontend] Servidor de prueba activo en puerto ${PORT}`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 Backend objetivo: http://localhost:3005`);
    console.log(`==============================================================\n`);
});
