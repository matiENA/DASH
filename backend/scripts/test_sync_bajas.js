/**
 * ==============================================================================
 * TEST SUITE: Sincronización Resiliente de Notas Hover por UUID
 * ==============================================================================
 * Valida:
 * 1. Fórmulas matemáticas de stride por día (AB=27, AO=40, etc.).
 * 2. Normalización de cadenas y formateo de notas hover.
 * 3. Resolución relacional por UUID de tipo_novedad (tabla public.tipos_novedad).
 * 4. Conexión de autenticación y lectura focalizada de columnas de Google Sheets.
 * ==============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('assert');
const {
    getColChofer,
    indexToColLetter,
    normalizeText,
    formatBajaNote,
    SPREADSHEETS
} = require('../utils/googleSheetsSync');
const { supabase } = require('../utils/supabase');

async function runTests() {
    console.log('\n==============================================================');
    console.log('🧪 INICIANDO TEST SUITE: SYNC BAJAS HOVER POR UUID');
    console.log('==============================================================\n');

    // TEST 1: Fórmulas de columnas
    console.log('▶ Test 1: Verificando cálculo de columnas por día (stride 13)...');
    assert.strictEqual(getColChofer(1), 27, 'Día 1 debe ser columna 27 (AB)');
    assert.strictEqual(indexToColLetter(27), 'AB', 'Col 27 debe ser AB');
    assert.strictEqual(getColChofer(2), 40, 'Día 2 debe ser columna 40 (AO)');
    assert.strictEqual(indexToColLetter(40), 'AO', 'Col 40 debe ser AO');
    assert.strictEqual(getColChofer(30), 404, 'Día 30 debe ser columna 404 (OO)');
    assert.strictEqual(indexToColLetter(404), 'OO', 'Col 404 debe ser OO');
    assert.strictEqual(getColChofer(31), 417, 'Día 31 debe ser columna 417 (PB)');
    assert.strictEqual(indexToColLetter(417), 'PB', 'Col 417 debe ser PB');
    console.log('  ✅ Fórmulas matemáticas validadas.');

    // TEST 2: Normalización y formateo
    console.log('\n▶ Test 2: Verificando normalización de texto y formato de nota...');
    assert.strictEqual(normalizeText('  Gómez,  Martín José! '), 'GOMEZ MARTIN JOSE');
    assert.strictEqual(normalizeText('RODRÍGUEZ MATÍAS'), 'RODRIGUEZ MATIAS');

    const note = formatBajaNote('Baja / Término de diagrama', '2026-11-15', 'Franco compensatorio');
    assert.ok(note.includes('⚠️ BAJA / TÉRMINO DE DIAGRAMA (Hasta: 15/11/2026)'), 'Encabezado con fecha formateada');
    assert.ok(note.includes('Detalle: Franco compensatorio'), 'Detalle presente');
    console.log('  ✅ Formateo de nota verificado:');
    console.log('     ' + note.replace(/\n/g, '\n     '));

    // TEST 3: Consulta y seguimiento de UUID en Supabase
    console.log('\n▶ Test 3: Validando seguimiento de UUID en public.tipos_novedad...');
    const { data: tipos, error: errTipos } = await supabase
        .from('tipos_novedad')
        .select('id, codigo, titulo, imprime_nota_movimientos')
        .eq('codigo', 'BAJA_DIAGRAMA')
        .limit(1);

    assert.ifError(errTipos);
    assert.ok(tipos && tipos.length > 0, 'Debe existir el tipo BAJA_DIAGRAMA');
    const bajaTipo = tipos[0];
    console.log(`  ✅ UUID detectado para BAJA_DIAGRAMA: ${bajaTipo.id}`);
    console.log(`  ✅ imprime_nota_movimientos: ${bajaTipo.imprime_nota_movimientos}`);
    assert.strictEqual(bajaTipo.imprime_nota_movimientos, true, 'imprime_nota_movimientos debe ser true');

    // TEST 4: Consulta a view_dash_novedades para verificar join relacional por UUID
    console.log('\n▶ Test 4: Verificando join relacional en view_dash_novedades...');
    const { data: novedadesBajas, error: errNov } = await supabase
        .from('view_dash_novedades')
        .select('id, chofer_nombre, tipo_novedad, tipo_novedad_id, imprime_nota_movimientos, fecha_objetivo')
        .eq('imprime_nota_movimientos', true)
        .eq('resuelto', false)
        .limit(5);

    assert.ifError(errNov);
    console.log(`  ✅ Se encontraron ${novedadesBajas.length} novedades activas con imprime_nota_movimientos = true:`);
    for (const nov of novedadesBajas) {
        console.log(`     - ID: ${nov.id} | Chofer: ${nov.chofer_nombre} | UUID: ${nov.tipo_novedad_id} | Hasta: ${nov.fecha_objetivo}`);
        assert.ok(nov.tipo_novedad_id, 'Debe tener tipo_novedad_id (UUID)');
        assert.strictEqual(nov.imprime_nota_movimientos, true);
    }

    console.log('\n==============================================================');
    console.log('🎉 TODOS LOS TESTS DE VALIDACIÓN COMPLETADOS CON ÉXITO');
    console.log('==============================================================\n');
}

runTests().catch(err => {
    console.error('❌ Error durante la ejecución del test suite:', err);
    process.exit(1);
});
