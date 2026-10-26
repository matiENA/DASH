const express = require('express');
const { fetchFlota, fetchNovedades, fetchRetorno, fetchUsuarios, fetchTerminales, fetchServiciosChoferes } = require('../utils/supabase');
const { normalizarComparacion } = require('../utils/normalizar');

function createDashRouter(sharedState, ioDash) {
    const router = express.Router();

    // GET /api/dash/flota — Catálogo de flota y choferes con Hot RAM
    router.get('/flota', async (req, res) => {
        try {
            if (sharedState && sharedState.flota && sharedState.flota.length > 0) {
                return res.json({
                    success: true,
                    flota: sharedState.flota,
                    flotaMap: sharedState.flotaMap,
                    unidades: sharedState.flota,
                    vencimientosObj: sharedState.vencimientosObj || [],
                    cached: true,
                    timestamp: sharedState.lastFlotaUpdate || new Date().toISOString()
                });
            }

            const rawFlota = await fetchFlota();
            const flotaLite = [];
            const flotaMap = {};
            const vencimientosObj = [];

            rawFlota.forEach(row => {
                const nomUpper = (row.nom || '').trim().toUpperCase();
                if (!nomUpper) return;

                const item = {
                    chofer_id: row.chofer_id,
                    nom: nomUpper,
                    nombre: nomUpper,
                    srv: (row.srv || row.servicio || 'S/A').toUpperCase(),
                    servicio: (row.srv || row.servicio || 'S/A').toUpperCase(),
                    srv_chofer: (row.srv || row.servicio || 'S/A').toUpperCase(),
                    tractor: (row.tractor || '').trim().toUpperCase(),
                    semi: (row.semi || '').trim().toUpperCase(),
                    cisternado: row.cisternado || '',
                    n_ute: row.n_ute || 'S/D',
                    foto: row.foto || '',
                    estado: row.estado_chofer || 'disponible',
                    unidad_id: row.unidad_id || null,
                    mas_tr: row.mas_tr || null,
                    vtv_tr: row.vtv_tr || null,
                    mas_semi: row.mas_semi || null,
                    vtv_semi: row.vtv_semi || null,
                    esp_es: row.esp_es || null,
                    vi: row.vi || null,
                    ve: row.ve || null
                };

                flotaLite.push(item);
                const normKey = normalizarComparacion(nomUpper);
                flotaMap[normKey] = item;

                if (row.tractor || row.semi) {
                    vencimientosObj.push({
                        patente: row.tractor || row.semi,
                        tractor: row.tractor || '',
                        semi: row.semi || '',
                        cisternado: row.cisternado || '',
                        vtv: row.vtv_tr || row.vtv_semi,
                        mas: row.mas_tr || row.mas_semi,
                        esp_es: row.esp_es,
                        vi: row.vi,
                        ve: row.ve
                    });
                }
            });

            if (sharedState) {
                sharedState.flota = flotaLite;
                sharedState.flotaMap = flotaMap;
                sharedState.vencimientosObj = vencimientosObj;
                sharedState.lastFlotaUpdate = new Date().toISOString();
            }

            res.json({
                success: true,
                flota: flotaLite,
                flotaMap: flotaMap,
                unidades: flotaLite,
                vencimientosObj: vencimientosObj,
                cached: false,
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
            if (sharedState && sharedState.retornos && sharedState.retornos.length > 0) {
                return res.json({
                    success: true,
                    data: sharedState.retornos,
                    cached: true,
                    timestamp: sharedState.lastRetornosUpdate || new Date().toISOString()
                });
            }

            const retornos = await fetchRetorno();

            // Enriquecer tractor desde flotaMap si viene vacío
            const retornosEnriquecidos = retornos.map(r => {
                let tractorFinal = r.tractor || '';
                if (!tractorFinal && sharedState && sharedState.flotaMap) {
                    const normK = normalizarComparacion(r.nom);
                    if (sharedState.flotaMap[normK]) {
                        tractorFinal = sharedState.flotaMap[normK].tractor || '';
                    }
                }
                return {
                    ...r,
                    tractor: tractorFinal
                };
            });

            if (sharedState) {
                sharedState.retornos = retornosEnriquecidos;
                sharedState.lastRetornosUpdate = new Date().toISOString();
            }

            res.json({
                success: true,
                data: retornosEnriquecidos,
                cached: false,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/retorno:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/novedades — Novedades activas y resueltas enriquecidas
    router.get('/novedades', async (req, res) => {
        try {
            if (sharedState && sharedState.novedades && sharedState.novedades.length > 0) {
                return res.json({
                    success: true,
                    data: sharedState.novedades,
                    count: sharedState.novedades.length,
                    cached: true,
                    timestamp: sharedState.lastNovedadesUpdate || new Date().toISOString()
                });
            }

            const novedades = await fetchNovedades();

            if (sharedState) {
                sharedState.novedades = novedades;
                sharedState.lastNovedadesUpdate = new Date().toISOString();
            }

            res.json({
                success: true,
                data: novedades,
                count: novedades.length,
                cached: false,
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
            if (sharedState && sharedState.usuarios && sharedState.usuarios.length > 0) {
                return res.json({
                    success: true,
                    data: sharedState.usuarios,
                    cached: true
                });
            }

            const usuarios = await fetchUsuarios();
            if (sharedState) sharedState.usuarios = usuarios;

            res.json({
                success: true,
                data: usuarios,
                cached: false,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/usuarios:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/terminales — Catálogo oficial de terminales
    router.get('/terminales', async (req, res) => {
        try {
            if (sharedState && sharedState.catalogoTerminales && sharedState.catalogoTerminales.length > 0) {
                return res.json({
                    success: true,
                    data: sharedState.catalogoTerminales,
                    cached: true
                });
            }

            const terminales = await fetchTerminales();
            if (sharedState) sharedState.catalogoTerminales = terminales;

            res.json({
                success: true,
                data: terminales,
                cached: false,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/terminales:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/servicios — Catálogo de servicios de choferes desde servicios_choferes
    router.get('/servicios', async (req, res) => {
        try {
            if (sharedState && sharedState.servicios && sharedState.servicios.length > 0) {
                return res.json({
                    success: true,
                    data: sharedState.servicios,
                    cached: true
                });
            }

            const servicios = await fetchServiciosChoferes();
            if (sharedState) sharedState.servicios = servicios;

            res.json({
                success: true,
                data: servicios,
                cached: false,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/servicios:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/dash/refresh — Fuerza la invalidación y refresco de Hot RAM
    router.post('/refresh', async (req, res) => {
        try {
            console.log("⚡ [Hot RAM] Invocada recarga manual de caché...");
            const [novs, fl, rets, usrs, terms] = await Promise.all([
                fetchNovedades().catch(() => []),
                fetchFlota().catch(() => []),
                fetchRetorno().catch(() => []),
                fetchUsuarios().catch(() => []),
                fetchTerminales().catch(() => [])
            ]);

            if (sharedState) {
                sharedState.novedades = novs;
                sharedState.usuarios = usrs;
                sharedState.catalogoTerminales = terms;

                // Reconstruir mapa de flota
                const flotaLite = [];
                const flotaMap = {};
                fl.forEach(row => {
                    const nomUpper = (row.nom || '').trim().toUpperCase();
                    if (!nomUpper) return;
                    const item = { ...row, nom: nomUpper };
                    flotaLite.push(item);
                    flotaMap[normalizarComparacion(nomUpper)] = item;
                });
                sharedState.flota = flotaLite;
                sharedState.flotaMap = flotaMap;

                // Enriquecer retornos con tractores
                sharedState.retornos = rets.map(r => ({
                    ...r,
                    tractor: r.tractor || (flotaMap[normalizarComparacion(r.nom)]?.tractor || '')
                }));
            }

            if (ioDash) {
                ioDash.emit('novedades_actualizadas', sharedState.novedades);
                ioDash.emit('datos_actualizados', { timestamp: new Date().toISOString() });
            }

            res.json({ success: true, message: "Hot RAM actualizado correctamente" });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = createDashRouter;
