const express = require('express');
const { fetchFlota, fetchNovedades, fetchRetorno, fetchUsuarios, fetchTerminales, fetchServiciosChoferes, fetchTiposNovedad } = require('../utils/supabase');
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

    // ==============================================================
    // 👤 ENDPOINTS DE LEGAJO, OBSERVACIONES Y ASIGNACIÓN DE UNIDADES
    // ==============================================================

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cacheLegajo = new Map();
    const CACHE_TTL_MS = 60000;

    async function resolverChoferId(identificador) {
        if (!identificador) return null;
        const str = String(identificador).trim();
        if (UUID_REGEX.test(str)) return str;

        const norm = normalizarComparacion(str);
        const cleanNum = str.replace(/\D/g, '');

        // 1. Buscar en sharedState.flota en Hot RAM
        if (sharedState && sharedState.flota) {
            const chEnRAM = sharedState.flota.find(c => {
                if (c.chofer_id && UUID_REGEX.test(c.chofer_id)) {
                    if (c._safeId === str) return true;
                    if (c.dni && cleanNum && String(c.dni).replace(/\D/g, '') === cleanNum) return true;
                    if (c.legajo && c.legajo === str) return true;
                    const normC = normalizarComparacion(c.nom || '');
                    if (normC === norm) return true;
                }
                return false;
            });
            if (chEnRAM?.chofer_id) return chEnRAM.chofer_id;
        }

        // 2. Buscar en Supabase 'choferes'
        const { supabase } = require('../utils/supabase');
        if (supabase) {
            try {
                let query = supabase.from('choferes').select('id, nombre, dni, legajo');
                if (cleanNum && cleanNum.length >= 6) {
                    query = query.or(`dni.eq.${cleanNum},nombre.ilike.%${str}%,legajo.eq.${str}`);
                } else {
                    query = query.or(`nombre.ilike.%${str}%,legajo.eq.${str}`);
                }
                const { data } = await query.limit(1).maybeSingle();
                if (data?.id) return data.id;
            } catch (e) {}

            try {
                let docQuery = supabase.from('chofer_documentacion').select('chofer_id');
                if (cleanNum) {
                    docQuery = docQuery.or(`drv_codigo.eq.${str},dni.eq.${cleanNum},cuil.ilike.%${cleanNum}%`);
                } else {
                    docQuery = docQuery.eq('drv_codigo', str);
                }
                const { data: docData } = await docQuery.limit(1).maybeSingle();
                if (docData?.chofer_id) return docData.chofer_id;
            } catch (e) {}
        }

        return null;
    }

    // GET /api/dash/chofer/:id/legajo — Ficha documental y observaciones
    router.get('/chofer/:id/legajo', async (req, res) => {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Falta id de chofer" });

        const now = Date.now();
        const cached = cacheLegajo.get(id);
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            return res.json({ success: true, cached: true, ...cached.data });
        }

        try {
            const { supabase } = require('../utils/supabase');
            const choferId = await resolverChoferId(id);
            if (!choferId) {
                return res.status(404).json({ success: false, error: `Chofer '${id}' no encontrado.` });
            }

            const [docRes, obsRes] = await Promise.all([
                supabase.from('chofer_documentacion').select('*').eq('chofer_id', choferId).maybeSingle(),
                supabase.from('chofer_observaciones').select('*').eq('chofer_id', choferId).order('fecha', { ascending: false })
            ]);

            const payload = {
                chofer_id: choferId,
                documentacion: docRes.data || null,
                observaciones: obsRes.data || []
            };

            cacheLegajo.set(id, { timestamp: now, data: payload });
            cacheLegajo.set(choferId, { timestamp: now, data: payload });

            res.json({ success: true, cached: false, ...payload });
        } catch (err) {
            console.error("❌ Error consultando legajo de chofer:", err);
            res.status(500).json({ error: "Error consultando legajo", detalle: err.message });
        }
    });

    // PUT /api/dash/chofer/:id/legajo — Actualizar documentación
    router.put(['/chofer/:id/legajo', '/chofer/:id/documentos'], async (req, res) => {
        const { id } = req.params;
        const updates = req.body || {};
        try {
            const { supabase } = require('../utils/supabase');
            const choferId = await resolverChoferId(id);
            if (!choferId) {
                return res.status(404).json({ success: false, error: `Chofer '${id}' no encontrado.` });
            }

            const validCols = [
                'venc_licencia_nacional', 'venc_psicofisico', 'venc_cargas_peligrosas', 'venc_periodico',
                'venc_curso_shell', 'venc_manejo_def', 'curso_pae', 'apto_medico_venc', 'apto_medico_estado',
                'avalado_contratos', 'vacuna_antitetanica', 'metabolitos_7', 'vacuna_covid', 'dosis_covid',
                'obs_documentacion', 'telefono', 'email', 'domicilio', 'localidad', 'telefono_emergencia'
            ];

            const dbPayload = { actualizado_el: new Date().toISOString() };
            validCols.forEach(col => {
                if (updates[col] !== undefined) dbPayload[col] = updates[col];
            });

            if (updates.exVen) dbPayload.venc_periodico = updates.exVen;
            if (updates.licVen) dbPayload.venc_licencia_nacional = updates.licVen;
            if (updates.certVen) dbPayload.venc_cargas_peligrosas = updates.certVen;

            const { data, error } = await supabase
                .from('chofer_documentacion')
                .update(dbPayload)
                .eq('chofer_id', choferId)
                .select()
                .maybeSingle();

            if (error) throw error;

            cacheLegajo.delete(id);
            cacheLegajo.delete(choferId);

            res.json({
                success: true,
                message: "Documentación actualizada en Supabase",
                documentacion: data
            });
        } catch (err) {
            console.error("❌ Error actualizando legajo:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/dash/chofer/:id/observaciones — Registrar observación
    router.post('/chofer/:id/observaciones', async (req, res) => {
        const { id } = req.params;
        const obs = req.body || {};
        try {
            const { supabase } = require('../utils/supabase');
            const choferId = await resolverChoferId(id);
            if (!choferId) {
                return res.status(404).json({ success: false, error: `Chofer '${id}' no encontrado.` });
            }

            const nuevaObs = {
                chofer_id: choferId,
                fecha: obs.fecha || new Date().toISOString().split('T')[0],
                unidad_dominio: obs.unidad || obs.unidad_dominio || null,
                evento: obs.evento || 'Observación general',
                obs_evento: obs.obsEvento || obs.obs_evento || '',
                estado: obs.estado || 'PENDIENTE',
                obs_estado: obs.obsEstado || obs.obs_estado || '',
                admin_carga: obs.admin || obs.usuario || obs.admin_carga || 'Sistema'
            };

            const { data, error } = await supabase
                .from('chofer_observaciones')
                .insert([nuevaObs])
                .select()
                .maybeSingle();

            if (error) throw error;

            cacheLegajo.delete(id);
            cacheLegajo.delete(choferId);

            res.json({ success: true, observacion: data });
        } catch (err) {
            console.error("❌ Error insertando observación:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/dash/asignar-unidad — Asignar o desasignar unidad
    router.post(['/asignar-unidad', '/cambiar-unidad', '/chofer/:id/unidad'], async (req, res) => {
        try {
            const body = req.body || {};
            const idParam = req.params?.id;
            const identificadorChofer = idParam || body.id_chofer || body.chofer_id || body.id || body.safeId || body.nombre;

            if (!identificadorChofer) {
                return res.status(400).json({ success: false, error: "Identificador de chofer requerido" });
            }

            const { supabase } = require('../utils/supabase');
            const targetChoferId = await resolverChoferId(identificadorChofer);
            if (!targetChoferId) {
                return res.status(404).json({ success: false, error: `Chofer '${identificadorChofer}' no encontrado.` });
            }

            let targetUnidadId = body.id_unidad || body.unidad_id || null;
            if (targetUnidadId === 'null' || targetUnidadId === 'undefined' || targetUnidadId === '') {
                targetUnidadId = null;
            }

            const esDesasignar = (!targetUnidadId && !body.tractor && !body.semi && !body.n_ute) || body.desasignar === true;

            if (supabase) {
                if (esDesasignar) {
                    await supabase.from('choferes').update({ unidad_id: null, estado: 'inactivo', actualizado_el: new Date().toISOString() }).eq('id', targetChoferId);
                } else if (targetUnidadId) {
                    await supabase.from('choferes').update({ unidad_id: targetUnidadId, estado: 'circulando', actualizado_el: new Date().toISOString() }).eq('id', targetChoferId);
                    await supabase.from('unidades').update({ estado: 'circulando' }).eq('id', targetUnidadId);
                }
            }

            cacheLegajo.delete(targetChoferId);
            if (ioDash) {
                ioDash.emit('datos_actualizados', { timestamp: new Date().toISOString(), accion: 'asignacion_unidad' });
            }

            res.json({
                success: true,
                message: esDesasignar ? "Unidad desasignada exitosamente" : "Unidad asignada exitosamente",
                id_chofer: targetChoferId,
                id_unidad: targetUnidadId
            });
        } catch (err) {
            console.error("❌ Error en /api/dash/asignar-unidad:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /api/dash/tipos-novedad — Catálogo de tipos de novedad oficiales
    router.get('/tipos-novedad', async (req, res) => {
        try {
            const tipos = await fetchTiposNovedad();
            res.json({ success: true, count: tipos.length, data: tipos });
        } catch (err) {
            console.error("❌ Error en GET /api/dash/tipos-novedad:", err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = createDashRouter;
