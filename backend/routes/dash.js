const express = require('express');
const { fetchFlota, fetchNovedades, fetchRetorno, fetchUsuarios } = require('../utils/supabase');

function createDashRouter(sharedState) {
    const router = express.Router();

    // GET /api/dash/flota — Catálogo de flota y choferes
    router.get('/flota', async (req, res) => {
        try {
            const rawFlota = await fetchFlota();
            
            const flotaLite = [];
            const flotaMap = {};
            const vencimientosObj = [];

            rawFlota.forEach(row => {
                const nomUpper = (row.nom || '').trim().toUpperCase();
                if (!nomUpper) return;

                const item = {
                    nom: nomUpper,
                    chofer_id: row.chofer_id,
                    srv_chofer: row.srv || row.servicio || 'GENERAL',
                    tractor: (row.tractor || '').toUpperCase(),
                    semi: (row.semi || '').toUpperCase(),
                    cisternado: row.cisternado || '',
                    n_ute: row.n_ute || 'S/D',
                    foto: row.foto || '',
                    estado: row.estado_chofer || 'disponible'
                };

                flotaLite.push(item);
                flotaMap[nomUpper] = item;

                if (row.tractor || row.semi) {
                    vencimientosObj.push({
                        patente: row.tractor || row.semi,
                        vtv: row.vtv_tr || row.vtv_semi,
                        mas: row.mas_tr || row.mas_semi,
                        esp_es: row.esp_es,
                        vi: row.vi,
                        ve: row.ve
                    });
                }
            });

            // Sincronizar estado en RAM
            if (sharedState) {
                sharedState.flota = flotaLite;
                sharedState.flotaMap = flotaMap;
            }

            res.json({
                success: true,
                flota: flotaLite,
                flotaMap: flotaMap,
                unidades: flotaLite,
                vencimientosObj: vencimientosObj,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/flota:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/retorno — Choferes que retornan hoy y mañana
    router.get('/retorno', async (req, res) => {
        try {
            const retornos = await fetchRetorno();
            res.json({
                success: true,
                data: retornos,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/retorno:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/novedades — Novedades para el muro Kanban
    router.get('/novedades', async (req, res) => {
        try {
            const novedades = await fetchNovedades();

            // Enriquecer con menciones en memoria si existen
            const novedadesConMenciones = novedades.map(n => {
                const idKey = String(n.id);
                return {
                    ...n,
                    menciones: (sharedState && sharedState.menciones && sharedState.menciones[idKey]) || [],
                    terminal: (sharedState && sharedState.terminales && sharedState.terminales[idKey]) || n.terminal || ''
                };
            });

            if (sharedState) {
                sharedState.novedades = novedadesConMenciones;
            }

            res.json({
                success: true,
                data: novedadesConMenciones,
                count: novedadesConMenciones.length,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/novedades:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/usuarios — Lista de usuarios para @menciones
    router.get('/usuarios', async (req, res) => {
        try {
            const usuarios = await fetchUsuarios();
            if (sharedState) sharedState.usuarios = usuarios;

            res.json({
                success: true,
                data: usuarios,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/usuarios:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/ut — Alias de flota
    router.get('/ut', async (req, res) => {
        try {
            const rawFlota = await fetchFlota();
            res.json({ success: true, data: rawFlota });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = createDashRouter;
