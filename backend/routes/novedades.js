const express = require('express');
const {
    fetchNovedades,
    dispatchNovedad,
    asignarTerminalNovedad,
    gestionarMencionNovedad
} = require('../utils/supabase');

function createNovedadesRouter(sharedState, ioDash) {
    const router = express.Router();

    // GET /api/novedades — Lista todas las novedades
    router.get('/', async (req, res) => {
        try {
            if (sharedState && sharedState.novedades && sharedState.novedades.length > 0) {
                return res.json({ success: true, data: sharedState.novedades, cached: true });
            }
            const novedades = await fetchNovedades();
            if (sharedState) sharedState.novedades = novedades;
            res.json({ success: true, data: novedades, cached: false });
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

            console.log(`📥 [API Novedades] Acción: ${action} para ID: ${id_novedad || 'NUEVA'}`);
            const result = await dispatchNovedad({ action, id_novedad, payload, sharedState });

            // Refrescar lista de novedades frescas desde Supabase
            const frescas = await fetchNovedades();
            if (sharedState) {
                sharedState.novedades = frescas;
                sharedState.lastNovedadesUpdate = new Date().toISOString();
            }

            // Emitir broadcast instantáneo vía Socket.IO a todas las pantallas
            if (ioDash) {
                ioDash.emit('novedades_actualizadas', frescas);
            }

            res.json({ success: true, data: result });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/actualizar:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/novedades/mencion — Agregar o quitar mención de usuario
    router.post('/mencion', async (req, res) => {
        try {
            const { id_novedad, usuario, accion } = req.body;
            if (!id_novedad || !usuario || !accion) {
                return res.status(400).json({ success: false, error: 'Faltan parámetros id_novedad, usuario o accion' });
            }

            console.log(`📥 [API Mención] ${accion} @${usuario} en novedad ${id_novedad}`);
            await gestionarMencionNovedad(id_novedad, usuario, accion);

            // Refrescar novedades e informar
            const frescas = await fetchNovedades();
            if (sharedState) {
                sharedState.novedades = frescas;
            }

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', frescas);
            }

            res.json({ success: true });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/mencion:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/novedades/terminal — Asignar terminal a una tarjeta
    router.post('/terminal', async (req, res) => {
        try {
            const { id_novedad, terminal, terminal_id } = req.body;
            if (!id_novedad) {
                return res.status(400).json({ success: false, error: 'Falta id_novedad' });
            }

            console.log(`📥 [API Terminal] Asignando terminal ${terminal || terminal_id} a novedad ${id_novedad}`);
            await asignarTerminalNovedad(id_novedad, terminal, terminal_id);

            const frescas = await fetchNovedades();
            if (sharedState) {
                sharedState.novedades = frescas;
            }

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', frescas);
            }

            res.json({ success: true });
        } catch (err) {
            console.error("❌ Error en POST /api/novedades/terminal:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = createNovedadesRouter;
