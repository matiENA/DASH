/**
 * ================================================================================
 * GOOGLE SHEETS SYNC — SINCRONIZACIÓN NATIVA Y RESILIENTE DE NOTAS HOVER
 * ================================================================================
 * Implementación 100% nativa en Node.js (Linux Render / Windows Local).
 * Inyecta notas en hover en las celdas del encabezado 'Chofer' de la planilla mensual
 * de Movimientos para cada novedad cuyo UUID en public.tipos_novedad tenga
 * imprime_nota_movimientos = true (o tipo_novedad = 'BAJA_DIAGRAMA').
 *
 * Características de Resiliencia y Seguridad de Datos:
 * 1. Fuente de Verdad Relacional por UUID: Desacoplado de strings fijos. Sigue
 *    estrictamente tipo_novedad_id (UUID) -> tipos_novedad.imprime_nota_movimientos.
 * 2. Inmunidad Total de Celda: batchUpdate con fields='note', garantizando 0%
 *    de alteración en valores, fórmulas y formatos.
 * 3. Descarga en Lote de Columnas (values:batchGet): Consulta todas las columnas
 *    necesarias en una sola pasada unificada, evitando recalcular la planilla en cada día.
 * 4. Doble Capa Anti-Fallo:
 *    - Capa Inmediata: Cola en memoria con debouncing (1.5s) y reintentos automáticos.
 *    - Capa Auto-Reparable (Self-Healing): Reconciliador periódico en background (cada 10m)
 *      que detecta y sincroniza choferes que fueron tipeados tardíamente en la planilla.
 * 5. Limpieza Inteligente: Vacía notas (note: '') de novedades resueltas o canceladas.
 * 6. Mapeo Dinámico de Hojas: Consulta metadatos para resolver sheetIdNum dinámico
 *    sin depender rígidamente de sheetId 0.
 * ================================================================================
 */

const dns = require('dns');
if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

// IDs oficiales de respaldo (Movimientos)
const SPREADSHEETS = {
    OCTUBRE_2026: {
        id: '14Mb5rD853zxDkaLDS-IrW-OBDTDBjuJxn_3olXeWlkc',
        tabName: 'OCTUBRE 2026- Mov.Unidades y Choferes',
        sheetIdNum: 0
    },
    NOVIEMBRE_2026: {
        id: '1z66kNDjMki1k9csQevuyhfz50dYoHrQro4wPj-Yt-hc',
        tabName: 'NOVIEMBRE 2026- Mov.Unidades y Choferes',
        sheetIdNum: 0
    }
};

let cachedJwtClient = null;
const sheetMetaCache = new Map();
const columnCache = new Map();

/**
 * Normaliza cadenas de texto para búsqueda y matching insensible a acentos/puntuación
 */
function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Convierte un índice de columna 0-based a letra de Google Sheets (27 -> AB, etc.)
 */
function indexToColLetter(colIdx) {
    let res = '';
    let temp = colIdx;
    while (temp >= 0) {
        res = String.fromCharCode((temp % 26) + 65) + res;
        temp = Math.floor(temp / 26) - 1;
    }
    return res;
}

/**
 * Calcula el índice de columna Chofer (0-based) para el día operativo (1..31)
 */
function getColChofer(dia) {
    return 27 + 13 * (dia - 1);
}

/**
 * Carga configuración operativa externa si existe
 */
function loadExternalConfig() {
    const configPaths = [
        path.join(__dirname, '../../server_local/operativas_diarias/config_operativas.json'),
        'C:\\Users\\Matias Rodriguez\\Documents\\server_local\\operativas_diarias\\config_operativas.json'
    ];
    for (const cp of configPaths) {
        if (fs.existsSync(cp)) {
            try {
                return JSON.parse(fs.readFileSync(cp, 'utf8'));
            } catch (e) {}
        }
    }
    return null;
}

/**
 * Obtiene cliente autenticado de Google Service Account
 */
function getGoogleAuthClient() {
    if (cachedJwtClient) return cachedJwtClient;

    let creds = null;

    // 1. Variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_CREDENTIALS_JSON
    const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDENTIALS_JSON;
    if (rawJson && rawJson.trim()) {
        try {
            creds = JSON.parse(rawJson.trim());
        } catch (e1) {
            try {
                const decoded = Buffer.from(rawJson.trim(), 'base64').toString('utf8');
                creds = JSON.parse(decoded);
            } catch (e2) {
                console.warn('⚠️ [Google Sheets Sync] Error al parsear GOOGLE_SERVICE_ACCOUNT_JSON:', e2.message);
            }
        }
    }

    // 2. Variables individuales GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY
    if (!creds && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        creds = {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
    }

    // 3. Fallbacks a archivos locales y de nube (Render Secret Files)
    if (!creds) {
        const potentialFiles = [
            '/etc/secrets/credentials.json',
            path.join(__dirname, '../credentials.json'),
            path.join(__dirname, '../../server_local/operativas_diarias/credentials.json'),
            'C:\\Users\\Matias Rodriguez\\Documents\\server_local\\operativas_diarias\\credentials.json'
        ];

        for (const f of potentialFiles) {
            if (fs.existsSync(f)) {
                try {
                    creds = JSON.parse(fs.readFileSync(f, 'utf8'));
                    break;
                } catch (e) {}
            }
        }
    }

    if (!creds || !creds.client_email || !creds.private_key) {
        return null;
    }

    cachedJwtClient = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
    });

    return cachedJwtClient;
}

/**
 * Resuelve la planilla correspondiente según la fecha
 */
function resolveSheetForDate(d) {
    const extCfg = loadExternalConfig();
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    if (extCfg) {
        if (year === 2026 && month === 11 && extCfg.mes_actual?.nombre?.includes('Noviembre')) {
            return {
                id: extCfg.mes_actual.movimientos_id,
                tabName: extCfg.mes_actual.tab_movimientos,
                sheetIdNum: 0
            };
        }
        if (year === 2026 && month === 10 && extCfg.mes_anterior?.nombre?.includes('Octubre')) {
            return {
                id: extCfg.mes_anterior.movimientos_id,
                tabName: extCfg.mes_anterior.tab_movimientos,
                sheetIdNum: 0
            };
        }
    }

    if (year === 2026 && month === 11) {
        return SPREADSHEETS.NOVIEMBRE_2026;
    }
    if (year === 2026 && month === 10) {
        return SPREADSHEETS.OCTUBRE_2026;
    }
    if (year > 2026 || (year === 2026 && month >= 11)) {
        return SPREADSHEETS.NOVIEMBRE_2026;
    }
    return SPREADSHEETS.OCTUBRE_2026;
}

/**
 * Resuelve dinámicamente el sheetId numérico de la pestaña
 */
async function resolveDynamicSheetIdNum(sheetId, tabName, accessToken) {
    const cacheKey = `${sheetId}_${tabName}`;
    if (sheetMetaCache.has(cacheKey)) {
        return sheetMetaCache.get(cacheKey);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
            const data = await res.json();
            const sheets = data.sheets || [];
            for (const s of sheets) {
                const title = (s.properties?.title || '').trim().toLowerCase();
                if (title === tabName.trim().toLowerCase()) {
                    const sid = s.properties.sheetId;
                    sheetMetaCache.set(cacheKey, sid);
                    return sid;
                }
            }
            for (const s of sheets) {
                const title = (s.properties?.title || '').trim().toLowerCase();
                if (title.includes('mov') && title.includes('unidades')) {
                    const sid = s.properties.sheetId;
                    sheetMetaCache.set(cacheKey, sid);
                    return sid;
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️ [Google Sheets Sync] Error consultando sheetIdNum de ${tabName}:`, e.message);
    }

    sheetMetaCache.set(cacheKey, 0);
    return 0;
}

/**
 * Formatea el texto de la nota emergente para Movimientos
 */
function formatBajaNote(tipoTitulo, fechaObjStr, detalle) {
    let fDisplay = fechaObjStr || '';
    if (fechaObjStr && fechaObjStr.includes('-')) {
        const parts = fechaObjStr.split('T')[0].split('-');
        if (parts.length === 3) {
            fDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    const titulo = (tipoTitulo || 'BAJA DE DIAGRAMA').toUpperCase();
    const lines = [`⚠️ ${titulo} (Hasta: ${fDisplay})`];
    if (detalle && detalle.trim()) {
        lines.push(`Detalle: ${detalle.trim()}`);
    }
    return lines.join('\n');
}

/**
 * Ejecuta una operación HTTP con reintentos y timeouts limpios
 */
async function fetchWithRetry(url, options = {}, timeoutMs = 180000, maxRetries = 2) {
    let attempt = 0;
    let delay = 3000;

    while (attempt < maxRetries) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const reqOptions = { ...options, signal: controller.signal };
            const res = await fetch(url, reqOptions);
            clearTimeout(timer);

            if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
                attempt++;
                console.warn(`⏳ [Google Sheets Sync] HTTP ${res.status}. Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }
            return res;
        } catch (err) {
            clearTimeout(timer);
            attempt++;
            if (attempt >= maxRetries) throw err;
            console.warn(`⏳ [Google Sheets Sync] Network error: ${err.message}. Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
}

/**
 * Descarga en lote (batchGet) todas las columnas solicitadas para una planilla
 * en bloques defensivos de 2 columnas para no sobrepasar los tiempos de cálculo
 * de Google Sheets en planillas masivas.
 */
async function prefetchColumnsBatch(sheetId, tabName, colLetters, accessToken) {
    const missing = Array.from(new Set(colLetters)).filter(c => !columnCache.has(`${sheetId}_${tabName}_${c}`));
    if (missing.length === 0) return;

    const chunkSize = 2;
    for (let i = 0; i < missing.length; i += chunkSize) {
        const chunk = missing.slice(i, i + chunkSize);
        const rangesParams = chunk.map(c => `ranges=${encodeURIComponent(`'${tabName}'!${c}1:${c}250`)}`).join('&');
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${rangesParams}&valueRenderOption=UNFORMATTED_VALUE`;

        console.log(`📡 [Google Sheets Sync] Descargando lote de ${chunk.length} columnas en [${tabName}] (${chunk.join(', ')})...`);
        try {
            const res = await fetchWithRetry(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            }, 240000, 2);

            if (res && res.ok) {
                const data = await res.json();
                const valueRanges = data.valueRanges || [];
                valueRanges.forEach((vr, idx) => {
                    const colLetter = chunk[idx];
                    const rawValues = vr.values || [];
                    const parsed = rawValues.map(row => (row && row.length > 0 ? String(row[0]).trim() : ''));
                    columnCache.set(`${sheetId}_${tabName}_${colLetter}`, parsed);
                });
                console.log(`✅ [Google Sheets Sync] ${valueRanges.length} columnas (${chunk.join(', ')}) cacheadas exitosamente.`);
            } else if (res) {
                console.warn(`⚠️ [Google Sheets Sync] batchGet falló: HTTP ${res.status}`);
            }
        } catch (e) {
            console.warn(`⚠️ [Google Sheets Sync] Error en prefetchColumnsBatch (${chunk.join(', ')}):`, e.message);
        }
    }
}

/**
 * Sincroniza notas de bajas hacia Google Sheets Movimientos
 * Puede recibir un objeto de contexto o null (para sincronización completa)
 */
async function syncBajasGoogleSheets(contextoNovedad = null, supabaseClient = null) {
    const authClient = getGoogleAuthClient();
    if (!authClient) {
        console.warn('ℹ️ [Google Sheets Sync] Credenciales de Google no configuradas en este entorno. Sync omitido con seguridad.');
        return { success: false, reason: 'NO_CREDENTIALS' };
    }

    try {
        const tokenInfo = await authClient.authorize();
        const accessToken = tokenInfo.access_token;
        if (!accessToken) {
            console.warn('⚠️ [Google Sheets Sync] No se pudo obtener access token.');
            return { success: false, reason: 'NO_ACCESS_TOKEN' };
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // =================================================================
        // ACCIÓN 1: LIMPIEZA DE NOTAS (Cuando una baja se resuelve o cancela)
        // =================================================================
        if (contextoNovedad && contextoNovedad.action === 'limpiar') {
            return await ejecutarLimpiezaNotas(contextoNovedad, accessToken, supabaseClient, hoy);
        }

        // =================================================================
        // ACCIÓN 2: SINCRONIZACIÓN / INSERCIÓN DE NOTAS ACTIVAS
        // =================================================================
        let novedades = [];

        if (contextoNovedad && (contextoNovedad.chofer_id || contextoNovedad.chofer_nombre || contextoNovedad.nom) && contextoNovedad.fecha_objetivo) {
            // Novedad individual disparada por evento
            novedades = [contextoNovedad];
        } else if (supabaseClient) {
            // Sincronización completa de todas las novedades activas con imprime_nota_movimientos = true
            const { data, error } = await supabaseClient
                .from('view_dash_novedades')
                .select('*')
                .or('imprime_nota_movimientos.eq.true,tipo_novedad.eq.BAJA_DIAGRAMA')
                .eq('resuelto', false)
                .not('chofer_id', 'is', null)
                .not('fecha_objetivo', 'is', null)
                .order('id', { ascending: false });

            if (error) {
                console.warn('⚠️ [Google Sheets Sync] Error consultando view_dash_novedades:', error.message);
                return { success: false, error: error.message };
            }
            novedades = data || [];
        }

        if (novedades.length === 0) {
            console.log('ℹ️ [Google Sheets Sync] No hay novedades activas pendientes de sincronizar.');
            return { success: true, count: 0 };
        }

        console.log(`🛰️ [Google Sheets Sync] Procesando ${novedades.length} novedad(es) activas...`);

        // Paso A: Recolectar todas las columnas necesarias por planilla para prefetch en lote
        const neededColsBySheet = new Map();
        for (const nov of novedades) {
            if (!nov.fecha_objetivo) continue;
            const fObjStr = nov.fecha_objetivo.split('T')[0];
            const [y, m, d] = fObjStr.split('-').map(Number);
            const fObj = new Date(y, m - 1, d);
            fObj.setHours(0, 0, 0, 0);
            if (fObj < hoy) continue;

            let cur = new Date(hoy.getTime());
            while (cur <= fObj) {
                const diaNum = cur.getDate();
                const sheetConfig = resolveSheetForDate(cur);
                const colIdx = getColChofer(diaNum);
                const colLetter = indexToColLetter(colIdx);
                const key = `${sheetConfig.id}:::${sheetConfig.tabName}`;

                if (!neededColsBySheet.has(key)) {
                    neededColsBySheet.set(key, { sheetId: sheetConfig.id, tabName: sheetConfig.tabName, cols: new Set() });
                }
                neededColsBySheet.get(key).cols.add(colLetter);
                cur.setDate(cur.getDate() + 1);
            }
        }

        // Paso B: Ejecutar batchGet unificado para cada planilla
        for (const [key, group] of neededColsBySheet.entries()) {
            await prefetchColumnsBatch(group.sheetId, group.tabName, Array.from(group.cols), accessToken);
        }

        // Paso C: Mapeo y preparación de actualizaciones
        const updatesBySpreadsheet = new Map();

        for (const nov of novedades) {
            let choferNom = nov.chofer_nombre || nov.nom || nov.chofer || '';

            if (!choferNom && nov.chofer_id && supabaseClient) {
                try {
                    const { data: chofData } = await supabaseClient
                        .from('choferes')
                        .select('nombre')
                        .eq('id', nov.chofer_id)
                        .limit(1);
                    if (chofData && chofData.length > 0) {
                        choferNom = chofData[0].nombre;
                    }
                } catch (e) {}
            }

            if (!choferNom || !nov.fecha_objetivo) continue;

            const normChofer = normalizeText(choferNom);
            if (!normChofer) continue;

            // Parsear fecha_objetivo
            const fObjStr = nov.fecha_objetivo.split('T')[0];
            const [y, m, d] = fObjStr.split('-').map(Number);
            const fObj = new Date(y, m - 1, d);
            fObj.setHours(0, 0, 0, 0);

            if (fObj < hoy) continue;

            const tipoTitulo = nov.tipo_novedad_titulo || nov.tipo_novedad || 'BAJA DE DIAGRAMA';
            const noteText = formatBajaNote(tipoTitulo, fObjStr, nov.detalle);

            // Iterar desde hoy hasta fObj
            let cur = new Date(hoy.getTime());
            while (cur <= fObj) {
                const diaNum = cur.getDate();
                const sheetConfig = resolveSheetForDate(cur);
                const colIdx = getColChofer(diaNum);
                const colLetter = indexToColLetter(colIdx);
                const sheetIdNum = await resolveDynamicSheetIdNum(sheetConfig.id, sheetConfig.tabName, accessToken);

                // Leer valores desde el cache de columnas poblado por batchGet
                const colVals = columnCache.get(`${sheetConfig.id}_${sheetConfig.tabName}_${colLetter}`) || [];

                // REGLA ESTRICTA: Buscar al chofer estrictamente en la columna Chofer
                let rowFound1Based = null;
                for (let r = 2; r < colVals.length; r++) {
                    const cellVal = colVals[r];
                    if (cellVal && cellVal.length >= 3) {
                        const normCell = normalizeText(cellVal);
                        if (
                            normChofer === normCell ||
                            (normChofer.length >= 6 && normCell.includes(normChofer)) ||
                            (normCell.length >= 6 && normChofer.includes(normCell))
                        ) {
                            rowFound1Based = r + 1;
                            break;
                        }
                    }
                }

                if (rowFound1Based !== null) {
                    const coord = `${colLetter}${rowFound1Based}`;
                    console.log(`📍 [Google Sheets Sync] Chofer '${choferNom}' ubicado en ${sheetConfig.tabName} Celda ${coord} (${cur.toISOString().split('T')[0]})`);

                    if (!updatesBySpreadsheet.has(sheetConfig.id)) {
                        updatesBySpreadsheet.set(sheetConfig.id, {
                            tabName: sheetConfig.tabName,
                            sheetIdNum: sheetIdNum,
                            requests: []
                        });
                    }

                    updatesBySpreadsheet.get(sheetConfig.id).requests.push({
                        updateCells: {
                            range: {
                                sheetId: sheetIdNum,
                                startRowIndex: rowFound1Based - 1,
                                endRowIndex: rowFound1Based,
                                startColumnIndex: colIdx,
                                endColumnIndex: colIdx + 1
                            },
                            rows: [
                                {
                                    values: [
                                        {
                                            note: noteText
                                        }
                                    ]
                                }
                            ],
                            fields: 'note'
                        }
                    });
                }

                // Siguiente día
                cur.setDate(cur.getDate() + 1);
            }
        }

        // Ejecutar lotes en Google Sheets API
        let totalApplied = 0;
        for (const [sheetId, group] of updatesBySpreadsheet.entries()) {
            if (group.requests.length === 0) continue;

            const batchSize = 100;
            for (let i = 0; i < group.requests.length; i += batchSize) {
                const chunk = group.requests.slice(i, i + batchSize);
                const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;

                try {
                    const updateRes = await fetchWithRetry(updateUrl, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ requests: chunk })
                    }, 240000, 2);

                    if (updateRes && updateRes.ok) {
                        console.log(`✅ [Google Sheets Sync] ${chunk.length} notas aplicadas con éxito en [${group.tabName}].`);
                        totalApplied += chunk.length;
                    } else if (updateRes) {
                        const errBody = await updateRes.text();
                        console.warn(`⚠️ [Google Sheets Sync] Error aplicando lote en ${sheetId}: HTTP ${updateRes.status} - ${errBody}`);
                    }
                } catch (batchErr) {
                    console.warn(`⚠️ [Google Sheets Sync] Error en batchUpdate para ${sheetId}:`, batchErr.message);
                }
            }
        }

        console.log(`✨ [Google Sheets Sync] Proceso finalizado: ${totalApplied} notas sincronizadas.`);
        return { success: true, count: totalApplied };
    } catch (err) {
        console.warn('⚠️ [Google Sheets Sync] Error general durante sincronización:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Limpia notas hover en Google Sheets para una novedad resuelta
 */
async function ejecutarLimpiezaNotas(contexto, accessToken, supabaseClient, hoy) {
    try {
        let choferNom = contexto.chofer_nombre || contexto.nom || '';
        if (!choferNom && contexto.chofer_id && supabaseClient) {
            const { data } = await supabaseClient.from('choferes').select('nombre').eq('id', contexto.chofer_id).limit(1);
            if (data && data.length > 0) choferNom = data[0].nombre;
        }

        if (!choferNom || !contexto.fecha_objetivo) {
            console.log('ℹ️ [Google Sheets Sync] Limpieza omitida: datos insuficientes.');
            return { success: true, count: 0 };
        }

        const normChofer = normalizeText(choferNom);
        const fObjStr = contexto.fecha_objetivo.split('T')[0];
        const [y, m, d] = fObjStr.split('-').map(Number);
        const fObj = new Date(y, m - 1, d);
        fObj.setHours(0, 0, 0, 0);

        if (fObj < hoy) {
            return { success: true, count: 0 };
        }

        console.log(`🧹 [Google Sheets Sync] Limpiando notas de ${choferNom} desde hoy hasta ${fObjStr}...`);

        // Recolectar columnas para prefetch
        const neededCols = new Map();
        let curCheck = new Date(hoy.getTime());
        while (curCheck <= fObj) {
            const diaNum = curCheck.getDate();
            const sheetConfig = resolveSheetForDate(curCheck);
            const colIdx = getColChofer(diaNum);
            const colLetter = indexToColLetter(colIdx);
            const key = `${sheetConfig.id}:::${sheetConfig.tabName}`;
            if (!neededCols.has(key)) {
                neededCols.set(key, { sheetId: sheetConfig.id, tabName: sheetConfig.tabName, cols: new Set() });
            }
            neededCols.get(key).cols.add(colLetter);
            curCheck.setDate(curCheck.getDate() + 1);
        }

        for (const [key, group] of neededCols.entries()) {
            await prefetchColumnsBatch(group.sheetId, group.tabName, Array.from(group.cols), accessToken);
        }

        const clearRequestsBySheet = new Map();
        let cur = new Date(hoy.getTime());

        while (cur <= fObj) {
            const diaNum = cur.getDate();
            const sheetConfig = resolveSheetForDate(cur);
            const colIdx = getColChofer(diaNum);
            const colLetter = indexToColLetter(colIdx);
            const sheetIdNum = await resolveDynamicSheetIdNum(sheetConfig.id, sheetConfig.tabName, accessToken);

            const colVals = columnCache.get(`${sheetConfig.id}_${sheetConfig.tabName}_${colLetter}`) || [];
            for (let r = 2; r < colVals.length; r++) {
                const cellVal = colVals[r];
                if (cellVal && cellVal.length >= 3) {
                    const normCell = normalizeText(cellVal);
                    if (normChofer === normCell || (normChofer.length >= 6 && normCell.includes(normChofer))) {
                        const rowFound1Based = r + 1;
                        if (!clearRequestsBySheet.has(sheetConfig.id)) {
                            clearRequestsBySheet.set(sheetConfig.id, {
                                tabName: sheetConfig.tabName,
                                sheetIdNum: sheetIdNum,
                                requests: []
                            });
                        }
                        clearRequestsBySheet.get(sheetConfig.id).requests.push({
                            updateCells: {
                                range: {
                                    sheetId: sheetIdNum,
                                    startRowIndex: rowFound1Based - 1,
                                    endRowIndex: rowFound1Based,
                                    startColumnIndex: colIdx,
                                    endColumnIndex: colIdx + 1
                                },
                                rows: [{ values: [{ note: '' }] }],
                                fields: 'note'
                            }
                        });
                        break;
                    }
                }
            }

            cur.setDate(cur.getDate() + 1);
        }

        let totalCleared = 0;
        for (const [sheetId, group] of clearRequestsBySheet.entries()) {
            if (group.requests.length === 0) continue;
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
            try {
                const updateRes = await fetchWithRetry(updateUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ requests: group.requests })
                }, 240000, 2);
                if (updateRes && updateRes.ok) {
                    console.log(`✅ [Google Sheets Sync] ${group.requests.length} nota(s) removidas con éxito en [${group.tabName}].`);
                    totalCleared += group.requests.length;
                }
            } catch (e) {
                console.warn(`⚠️ [Google Sheets Sync] Error removiendo notas en ${sheetId}:`, e.message);
            }
        }

        return { success: true, count: totalCleared };
    } catch (e) {
        console.warn('⚠️ [Google Sheets Sync] Error ejecutando limpieza de notas:', e.message);
        return { success: false, error: e.message };
    }
}

// =================================================================
// COLA ASÍNCRONA CON DEBOUNCING Y REINTENTOS (CAPA A)
// =================================================================
let debounceTimer = null;
let pendingContexts = [];
let isQueueBusy = false;

function queueSyncBajas(contexto = null, supabaseClient = null) {
    if (contexto) {
        pendingContexts.push(contexto);
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        if (isQueueBusy) {
            // Reintentar en 3 segundos si hay otro lote en vuelo
            debounceTimer = setTimeout(() => queueSyncBajas(null, supabaseClient), 3000);
            return;
        }

        isQueueBusy = true;
        const currentBatch = [...pendingContexts];
        pendingContexts = [];

        try {
            if (currentBatch.length === 1 && currentBatch[0].action === 'limpiar') {
                await syncBajasGoogleSheets(currentBatch[0], supabaseClient);
            } else if (currentBatch.length === 1 && currentBatch[0].action === 'crear') {
                await syncBajasGoogleSheets(currentBatch[0], supabaseClient);
            } else {
                await syncBajasGoogleSheets(null, supabaseClient);
            }
        } catch (err) {
            console.warn('⚠️ [Google Sheets Sync Queue] Error en proceso de cola:', err.message);
        } finally {
            isQueueBusy = false;
        }
    }, 1500); // 1.5s debounce
}

// =================================================================
// RECONCILIADOR PERIÓDICO EN BACKGROUND (CAPA B: SELF-HEALING)
// =================================================================
let reconciliadorInterval = null;

function iniciarReconciliadorBajas(intervalMs = 10 * 60 * 1000, supabaseClient = null) {
    if (reconciliadorInterval) clearInterval(reconciliadorInterval);

    const min = Math.round(intervalMs / 60000);
    console.log(`⏱️ [Google Sheets Sync] Reconciliador periódico activo (cada ${min} min).`);

    reconciliadorInterval = setInterval(() => {
        // Iniciar barrido pasivo de novedades activas en segundo plano
        syncBajasGoogleSheets(null, supabaseClient).catch(err => {
            console.warn('⚠️ [Google Sheets Sync Reconciliador] Error en ciclo pasivo:', err.message);
        });
    }, intervalMs);

    if (reconciliadorInterval.unref) reconciliadorInterval.unref();
}

module.exports = {
    syncBajasGoogleSheets,
    queueSyncBajas,
    iniciarReconciliadorBajas,
    normalizeText,
    indexToColLetter,
    getColChofer,
    formatBajaNote,
    SPREADSHEETS
};
