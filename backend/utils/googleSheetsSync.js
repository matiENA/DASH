/**
 * ================================================================================
 * GOOGLE SHEETS SYNC — SINCRONIZACIÓN NATIVA DE NOTAS HOVER (BAJAS DE DIAGRAMA)
 * ================================================================================
 * Implementación 100% nativa en Node.js (cross-platform: Linux Render / Windows Local)
 * Inyecta notas en hover en las celdas del encabezado 'Chofer' de la planilla mensual
 * de Movimientos para cada día comprendido entre hoy y la fecha objetivo.
 *
 * Reglas Operativas:
 * 1. Detección estricta: Solo inyecta si el chofer está efectivamente tipeado
 *    en la columna Chofer del día correspondiente (SIN fallback a tractor).
 * 2. Fórmula matemática de columnas: col_chofer = 27 + 13 * (dia - 1)
 *    (Día 1 = AB/27, Día 2 = AO/40, Día 30 = OO/404, Día 31 = PB/417).
 * 3. Inmunidad total: batchUpdate con fields='note', preservando al 100% valores,
 *    fórmulas y formatos.
 * 4. Resiliencia total: No lanza excepciones no controladas. Si no hay credenciales,
 *    registra una advertencia y omite sin romper el guardado de la novedad en DASH.
 * ================================================================================
 */

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

// IDs oficiales de Google Sheets (Movimientos)
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
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    if (year === 2026 && month === 11) {
        return SPREADSHEETS.NOVIEMBRE_2026;
    }
    if (year === 2026 && month === 10) {
        return SPREADSHEETS.OCTUBRE_2026;
    }
    // Si la fecha es noviembre o posterior, usar Noviembre
    if (year > 2026 || (year === 2026 && month >= 11)) {
        return SPREADSHEETS.NOVIEMBRE_2026;
    }
    return SPREADSHEETS.OCTUBRE_2026;
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
 * Sincroniza notas de bajas hacia Google Sheets Movimientos
 * Puede recibir un objeto de novedad individual o null (para sincronizar todas las activas)
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

        let novedades = [];

        if (contextoNovedad && (contextoNovedad.chofer_id || contextoNovedad.chofer_nombre || contextoNovedad.nom) && contextoNovedad.fecha_objetivo) {
            // Novedad individual disparada por evento
            novedades = [contextoNovedad];
        } else if (supabaseClient) {
            // Sincronización completa de todas las bajas activas desde la base de datos
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
            console.log('ℹ️ [Google Sheets Sync] No hay novedades de baja de diagrama pendientes de sincronizar.');
            return { success: true, count: 0 };
        }

        console.log(`🛰️ [Google Sheets Sync] Procesando ${novedades.length} novedad(es) de baja...`);

        // Cache local en memoria para columnas leídas durante esta ejecución
        const columnCache = new Map();

        async function fetchColumnValues(sheetId, tabName, colLetter) {
            const cacheKey = `${sheetId}_${tabName}_${colLetter}`;
            if (columnCache.has(cacheKey)) {
                return columnCache.get(cacheKey);
            }

            const range = `'${tabName}'!${colLetter}1:${colLetter}250`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;

            try {
                // Timeout defensivo de 8 segundos por columna
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    signal: AbortSignal.timeout(8000)
                });
                if (!res.ok) {
                    console.warn(`⚠️ [Google Sheets Sync] Error leyendo rango ${range}: HTTP ${res.status}`);
                    columnCache.set(cacheKey, []);
                    return [];
                }
                const data = await res.json();
                const values = (data.values || []).map(row => (row && row.length > 0 ? String(row[0]).trim() : ''));
                columnCache.set(cacheKey, values);
                return values;
            } catch (err) {
                console.warn(`⚠️ [Google Sheets Sync] Timeout o error leyendo ${range}:`, err.message);
                columnCache.set(cacheKey, []);
                return [];
            }
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Agrupar actualizaciones por spreadsheetId
        const updatesBySpreadsheet = new Map();

        for (const nov of novedades) {
            let choferNom = nov.chofer_nombre || nov.nom || nov.chofer || '';

            // Si no tenemos el nombre pero tenemos chofer_id y supabaseClient, buscarlo
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

                // Leer valores de la columna específica del día
                const colVals = await fetchColumnValues(sheetConfig.id, sheetConfig.tabName, colLetter);

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
                            sheetIdNum: sheetConfig.sheetIdNum,
                            requests: []
                        });
                    }

                    updatesBySpreadsheet.get(sheetConfig.id).requests.push({
                        updateCells: {
                            range: {
                                sheetId: sheetConfig.sheetIdNum,
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
                    const updateRes = await fetch(updateUrl, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ requests: chunk })
                    });

                    if (updateRes.ok) {
                        console.log(`✅ [Google Sheets Sync] ${chunk.length} notas aplicadas con éxito en [${group.tabName}].`);
                        totalApplied += chunk.length;
                    } else {
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

module.exports = {
    syncBajasGoogleSheets,
    normalizeText,
    indexToColLetter,
    getColChofer,
    formatBajaNote,
    SPREADSHEETS
};
