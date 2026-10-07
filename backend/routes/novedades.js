const express = require('express');
const { fetchNovedades, dispatchNovedad } = require('../utils/supabase');
const { normalizar } = require('../utils/normalizar');

function createNovedadesRouter(sharedState, ioDash) {
    const router = express.Router();

    // GET /api/novedades — Lista todas las novedades
    router.get('/', async (req, res) => {
        try {
            const novedades = await fetchNovedades();
            const enriched = novedades.map(n => {
                const idKey = String(n.id);
                return {
                    ...n,
                    menciones: (sharedState.menciones && sharedState.menciones[idKey]) || [],
                    terminal: (sharedState.terminales && sharedState.terminales[idKey]) || n.terminal || ''
                };
            });
            res.json({ success: true, data: enriched });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/novedades/actualizar — Despacho universal (crear, resolver, editar)
    router.post('/actualizar', async (req, res) => {
        try {
            const { action, id_novedad, payload } = req.body;
            if (!action) {
                return res.status(400).json({ success: false, error: 'Falta campo action' });
            }

            console.log(`📥 [API Novedades] Acción ${action} recibida para ID ${id_novedad || 'NUEVA'}`);
            const result = await dispatchNovedad({ action, id_novedad, payload });

            // Si se asignó terminal en payload, guardar en estado
            if (id_novedad && payload && payload.terminal !== undefined) {
                if (!sharedState.terminales) sharedState.terminales = {};
                sharedState.terminales[String(id_novedad)] = payload.terminal;
            }

            // Consultar novedades frescas y emitir por Socket.IO
            const frescas = await fetchNovedades();
            const enriched = frescas.map(n => {
                const idKey = String(n.id);
                return {
                    ...n,
                    menciones: (sharedState.menciones && sharedState.menciones[idKey]) || [],
                    terminal: (sharedState.terminales && sharedState.terminales[idKey]) || n.terminal || ''
                };
            });
            sharedState.novedades = enriched;

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', enriched);
            }

            res.json({ success: true, data: result });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/actualizar:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/novedades/mencion — Agregar o quitar mención de usuario en una tarjeta
    router.post('/mencion', async (req, res) => {
        try {
            const { id_novedad, usuario, accion } = req.body;
            if (!id_novedad || !usuario || !accion) {
                return res.status(400).json({ success: false, error: 'Faltan parámetros id_novedad, usuario o accion' });
            }

            if (!sharedState.menciones) sharedState.menciones = {};
            const idKey = String(id_novedad);
            if (!Array.isArray(sharedState.menciones[idKey])) {
                sharedState.menciones[idKey] = [];
            }

            const uNorm = normalizar(usuario);
            if (accion === 'agregar') {
                if (!sharedState.menciones[idKey].includes(uNorm)) {
                    sharedState.menciones[idKey].push(uNorm);
                }
            } else if (accion === 'quitar') {
                sharedState.menciones[idKey] = sharedState.menciones[idKey].filter(m => m !== uNorm);
            }

            // Emitir actualización inmediata a carteleras conectadas
            const frescas = await fetchNovedades();
            const enriched = frescas.map(n => {
                const k = String(n.id);
                return {
                    ...n,
                    menciones: sharedState.menciones[k] || [],
                    terminal: (sharedState.terminales && sharedState.terminales[k]) || n.terminal || ''
                };
            });
            sharedState.novedades = enriched;

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', enriched);
            }

            res.json({ success: true, menciones: sharedState.menciones[idKey] });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/mencion:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/novedades/terminal — Asignar terminal a una tarjeta
    router.post('/terminal', async (req, res) => {
        try {
            const { id_novedad, terminal } = req.body;
            if (!id_novedad) {
                return res.status(400).json({ success: false, error: 'Falta id_novedad' });
            }

            if (!sharedState.terminales) sharedState.terminales = {};
            const idKey = String(id_novedad);
            sharedState.terminales[idKey] = (terminal || '').toUpperCase().trim();

            const frescas = await fetchNovedades();
            const enriched = frescas.map(n => {
                const k = String(n.id);
                return {
                    ...n,
                    menciones: (sharedState.menciones && sharedState.menciones[k]) || [],
                    terminal: sharedState.terminales[k] || n.terminal || ''
                };
            });
            sharedState.novedades = enriched;

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', enriched);
            }

            res.json({ success: true, terminal: sharedState.terminales[idKey] });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/terminal:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = createNovedadesRouter;
