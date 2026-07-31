let calendarDate = new Date();
let selectedDateISO = '';
let terminalSeleccionada = '';

const CONFIG_CLASIFICACIONES_MODAL = {
    'LIBRES': { titulo: 'Libres', bg: 'bg-[#00FFFF]', text: 'text-slate-950' },
    'CERTIFICACION_UNIDAD': { titulo: 'Certificación de unidad', bg: 'bg-[#FFAE42]', text: 'text-slate-950' },
    'REPARACION': { titulo: 'Reparaciones requeridas', bg: 'bg-[#6366F1]', text: 'text-white' },
    'BAJA_DIAGRAMA': { titulo: 'Baja / Término de diagrama', bg: 'bg-[#EF4444]', text: 'text-white' },
    'ESTADO_DEMORA': { titulo: 'Estado / Demora', bg: 'bg-[#D28976]', text: 'text-white' },
    'EXAMEN_CHOFER': { titulo: 'Exámenes / Vencimientos', bg: 'bg-[#10B981]', text: 'text-white' }
};

function seleccionarTerminal(val) {
    if (terminalSeleccionada === val) {
        terminalSeleccionada = '';
    } else {
        terminalSeleccionada = val;
    }
    const inp = document.getElementById('input-terminal');
    if (inp) inp.value = terminalSeleccionada;
    actualizarUITerminalRadio();
}

function actualizarUITerminalRadio() {
    const terminals = ['DOCK SUD', 'TPH', 'AÑELO', 'TLC'];
    terminals.forEach(t => {
        const rad = document.getElementById(`radio-terminal-${t}`);
        if (!rad) return;
        const inner = rad.querySelector('div');
        if (t === terminalSeleccionada) {
            rad.className = 'w-5 h-5 rounded-full border-2 border-slate-900 dark:border-slate-100 flex items-center justify-center transition-all bg-white dark:bg-slate-900';
            if (inner) inner.className = 'w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100';
        } else {
            rad.className = 'w-5 h-5 rounded-full border-2 border-slate-400 dark:border-slate-600 flex items-center justify-center transition-all bg-white dark:bg-slate-900 group-hover:border-slate-600';
            if (inner) inner.className = 'w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100 hidden';
        }
    });
}

function abrirModalNueva() {
    const sesion = obtenerUsuarioSesion();
    if (!sesion || !sesion.usuario) {
        toggleDropdownLogin(true);
        return;
    }

    const modal = document.getElementById('modal-nueva');
    if (modal) {
        const form = document.querySelector('#modal-paso-2 form');
        if (form) form.reset();

        const editId = document.getElementById('input-edit-id');
        if (editId) editId.value = '';

        const btn = document.getElementById('btn-submit');
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'PUBLICAR NOVEDAD';
        }

        // Resetear fecha y terminal seleccionada al abrir
        selectedDateISO = '';
        calendarDate = new Date();
        const inpFecha = document.getElementById('input-fecha');
        if (inpFecha) inpFecha.value = '';

        terminalSeleccionada = '';
        const inpTerm = document.getElementById('input-terminal');
        if (inpTerm) inpTerm.value = '';
        actualizarUITerminalRadio();

        // Mostrar paso 1 (selección de clasificación) y ocultar paso 2
        document.getElementById('modal-paso-1')?.classList.remove('hidden');
        document.getElementById('modal-paso-2')?.classList.add('hidden');
        document.getElementById('modal-paso-2')?.classList.remove('flex');

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            const content = document.getElementById('modal-content');
            if (content) content.classList.remove('translate-y-full');
        }, 10);
    }
}

function cerrarModalNueva() {
    const modal = document.getElementById('modal-nueva');
    if (modal) {
        modal.classList.add('opacity-0');
        const content = document.getElementById('modal-content');
        if (content) content.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 250);
    }
}

function seleccionarClasificacionPaso1(tipo) {
    const inpTipo = document.getElementById('input-tipo');
    if (inpTipo) inpTipo.value = tipo;

    const cfg = CONFIG_CLASIFICACIONES_MODAL[tipo] || { titulo: 'Reportar Novedad', bg: 'bg-[#6366F1]', text: 'text-white' };

    const header = document.getElementById('modal-paso-2-header');
    const titulo = document.getElementById('modal-paso-2-titulo');

    if (header) {
        header.className = `flex justify-between items-center p-4 transition-colors duration-300 shrink-0 ${cfg.bg} ${cfg.text}`;
    }

    if (titulo) {
        titulo.innerText = cfg.titulo;
    }

    adaptarFormulario(tipo);

    // Renderizar calendario desplegado
    renderizarCalendarioDeployed();

    // Transición de Paso 1 a Paso 2
    document.getElementById('modal-paso-1')?.classList.add('hidden');
    document.getElementById('modal-paso-2')?.classList.remove('hidden');
    document.getElementById('modal-paso-2')?.classList.add('flex');
}

function volverPaso1Modal() {
    const editIdInput = document.getElementById('input-edit-id');
    // Si estamos editando, cerrar al presionar volver
    if (editIdInput && editIdInput.value) {
        cerrarModalNueva();
        return;
    }
    document.getElementById('modal-paso-2')?.classList.add('hidden');
    document.getElementById('modal-paso-2')?.classList.remove('flex');
    document.getElementById('modal-paso-1')?.classList.remove('hidden');
}

function adaptarFormulario(tipo) {
    const fInput = document.getElementById('input-fecha');
    if (fInput) fInput.required = false;

    const divCert = document.getElementById('div-certificaciones');
    if (divCert) {
        if (tipo === 'CERTIFICACION_UNIDAD') divCert.classList.remove('hidden');
        else divCert.classList.add('hidden');
    }

    const divTerm = document.getElementById('div-terminal');
    if (divTerm) {
        if (tipo === 'LIBRES') {
            divTerm.classList.remove('hidden');
        } else {
            divTerm.classList.add('hidden');
            terminalSeleccionada = '';
            const inpTerm = document.getElementById('input-terminal');
            if (inpTerm) inpTerm.value = '';
            actualizarUITerminalRadio();
        }
    }

    const btn = document.getElementById('btn-submit');
    if (btn) {
        btn.disabled = !tipo;
    }
}

// 📅 LÓGICA DE CALENDARIO DESPLEGADO (DEPLOYED CALENDAR)
function renderizarCalendarioDeployed() {
    const grid = document.getElementById('cal-dias-grid');
    const mesAnoLabel = document.getElementById('cal-mes-ano');
    if (!grid || !mesAnoLabel) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    mesAnoLabel.innerText = `${nombresMeses[month]} ${year}`;

    // Primer día del mes (0=Dom, 1=Lun...) -> ajustar a 0=Lun ... 6=Dom
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="h-8"></div>`;
    }

    const todayObj = new Date();
    const todayISO = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= totalDays; day++) {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const currentISO = `${year}-${mm}-${dd}`;

        const isSelected = selectedDateISO === currentISO;
        const isToday = todayISO === currentISO;

        let btnClass = "h-8 w-8 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ";
        if (isSelected) {
            btnClass += "bg-indigo-600 dark:bg-indigo-500 text-white font-black shadow-md scale-105";
        } else if (isToday) {
            btnClass += "border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold";
        } else {
            btnClass += "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold";
        }

        html += `<button type="button" onclick="seleccionarFechaCalendario('${currentISO}')" class="${btnClass}">${day}</button>`;
    }

    grid.innerHTML = html;
}

function cambiarMesCalendario(offset) {
    calendarDate.setMonth(calendarDate.getMonth() + offset);
    renderizarCalendarioDeployed();
}

function seleccionarFechaCalendario(isoStr) {
    selectedDateISO = isoStr;
    const inp = document.getElementById('input-fecha');
    if (inp) inp.value = isoStr;
    renderizarCalendarioDeployed();
}

function enviarNovedad(e) {
    e.preventDefault();
    const sesion = obtenerUsuarioSesion();
    const creadorNom = sesion && sesion.usuario ? sesion.usuario : 'Anónimo';

    const btn = document.getElementById('btn-submit');
    if (btn) btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>`;
    
    let tipoSeleccionado = document.getElementById('input-tipo').value;
    let extraDetalle = "";
    
    if (tipoSeleccionado === 'CERTIFICACION_UNIDAD') {
        const checks = [];
        const chkVtv = document.getElementById('check-vtv');
        const chkMass = document.getElementById('check-mass');
        if (chkVtv && chkVtv.checked) checks.push('VTV');
        if (chkMass && chkMass.checked) checks.push('MASS');
        if (checks.length > 0) {
            extraDetalle = `[${checks.join(' / ')}]\n\n`;
        }
    }
    
    const payload = {
        nom: document.getElementById('input-nom').value.toUpperCase(),
        tractor: document.getElementById('input-tractor').value.toUpperCase(),
        srv: document.getElementById('input-srv').value,
        n_ute: document.getElementById('input-ute').value || 'S/D',
        tipo_novedad: tipoSeleccionado,
        terminal: document.getElementById('input-terminal')?.value || terminalSeleccionada || '',
        fecha_objetivo: document.getElementById('input-fecha').value,
        detalle: extraDetalle + document.getElementById('input-detalle').value,
        creador: creadorNom,
        menciones: []
    };

    const editIdInput = document.getElementById('input-edit-id');
    const editId = editIdInput ? editIdInput.value : '';
    const bodyData = editId ? { action: 'editar', id_novedad: editId, payload } : { action: 'nueva', payload };

    fetch(`${API_URL}/api/novedades/actualizar`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
    }).then(() => {
        cerrarModalNueva(); 
        e.target.reset();
        adaptarFormulario('');
        if (btn) btn.disabled = true;
    }).finally(() => { 
        if (btn) btn.innerHTML = "PUBLICAR NOVEDAD"; 
    });
}

function filtrarChoferes(origen = 'nom') {
    const inputNom = document.getElementById('input-nom');
    const inputTractor = document.getElementById('input-tractor');
    const dropNom = document.getElementById('dropdown-choferes');
    const dropTractor = document.getElementById('dropdown-tractores');
    
    const isTractor = origen === 'tractor';
    const input = isTractor ? inputTractor : inputNom;
    const drop = isTractor ? dropTractor : dropNom;
    const otherDrop = isTractor ? dropNom : dropTractor;
    
    if (otherDrop) otherDrop.classList.add('hidden');
    if (!drop || !input) return;

    const val = input.value.toLowerCase().trim();
    const lista = (typeof obtenerListaFlotaArray === 'function') ? obtenerListaFlotaArray() : (Array.isArray(RAM_Flota) ? RAM_Flota : []);

    let filtrados = lista;
    if (val.length > 0) {
        filtrados = lista.filter(c => 
            (c.nom && c.nom.toLowerCase().includes(val)) || 
            (c.tractor && c.tractor.toLowerCase().includes(val))
        );
    }

    if (!Array.isArray(filtrados) || filtrados.length === 0) {
        drop.classList.add('hidden');
        return;
    }

    let html = '';
    filtrados.slice(0, 30).forEach(c => {
        html += `
        <div onclick="seleccionarAutocompletado('${(c.nom || '').replace(/'/g, "\\'")}', '${c.tractor || ''}', '${c.srv || 'S/A'}', '${c.n_ute || ''}')" class="p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex justify-between items-center">
            <div class="flex flex-col truncate pr-2">
                <span class="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">${c.nom}</span>
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">UTE: ${c.n_ute || '-'}</span>
            </div>
            <div class="flex flex-col items-end shrink-0">
                <span class="font-black text-indigo-600 dark:text-indigo-400 text-xs tracking-wide">${c.tractor || 'S/D'}</span>
                <span class="text-[9px] font-black bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded mt-1 uppercase border border-slate-200 dark:border-slate-800">${c.srv || 'S/A'}</span>
            </div>
        </div>`;
    });
    drop.innerHTML = html;
    drop.classList.remove('hidden');
}

function seleccionarAutocompletado(nom, tractor, srv, ute) {
    document.getElementById('input-nom').value = nom;
    document.getElementById('input-tractor').value = tractor;
    document.getElementById('input-ute').value = ute;
    let srvSelect = document.getElementById('input-srv');
    srvSelect.value = srv || 'S/A';
    const dropNom = document.getElementById('dropdown-choferes');
    const dropTractor = document.getElementById('dropdown-tractores');
    if (dropNom) dropNom.classList.add('hidden');
    if (dropTractor) dropTractor.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    const dropNom = document.getElementById('dropdown-choferes');
    const dropTractor = document.getElementById('dropdown-tractores');
    const dropLogin = document.getElementById('dropdown-login');
    const authContainer = document.getElementById('auth-container');
    if (dropNom && !dropNom.contains(e.target) && e.target.id !== 'input-nom') dropNom.classList.add('hidden');
    if (dropTractor && !dropTractor.contains(e.target) && e.target.id !== 'input-tractor') dropTractor.classList.add('hidden');
    if (dropLogin && authContainer && !authContainer.contains(e.target)) dropLogin.classList.add('hidden');
});

function abrirEdicion(id) {
    const sesion = (typeof obtenerUsuarioSesion === 'function') ? obtenerUsuarioSesion() : null;
    if (!sesion || !sesion.usuario) {
        alert('Debe iniciar sesion para editar novedades.');
        if (typeof abrirModalAuth === 'function') abrirModalAuth();
        return;
    }
    const n = (RAM_Novedades || []).find(item => String(item.id) === String(id));
    if (!n) {
        alert('Novedad no encontrada.');
        return;
    }

    const modal = document.getElementById('modal-nueva');
    if (!modal) return;

    const editIdInput = document.getElementById('input-edit-id');
    if (editIdInput) editIdInput.value = n.id;

    document.getElementById('input-nom').value = n.nom || '';
    document.getElementById('input-tractor').value = n.tractor || '';
    document.getElementById('input-srv').value = n.srv || 'S/A';
    document.getElementById('input-ute').value = n.n_ute || '';

    const inputDetalle = document.getElementById('input-detalle');
    if (inputDetalle) inputDetalle.value = n.detalle || '';

    // Configurar terminal
    terminalSeleccionada = n.terminal || '';
    const inputTerminal = document.getElementById('input-terminal');
    if (inputTerminal) inputTerminal.value = terminalSeleccionada;
    actualizarUITerminalRadio();

    // Configurar fecha en calendario
    selectedDateISO = n.fecha_objetivo || '';
    if (selectedDateISO) {
        const parts = selectedDateISO.split('-');
        if (parts.length === 3) {
            calendarDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    } else {
        calendarDate = new Date();
    }

    const inputFecha = document.getElementById('input-fecha');
    if (inputFecha) inputFecha.value = selectedDateISO;

    const btn = document.getElementById('btn-submit');
    if (btn) {
        btn.disabled = false;
        btn.innerText = 'GUARDAR CAMBIOS';
    }

    // Ir directo a Paso 2
    seleccionarClasificacionPaso1(n.tipo_novedad || 'LIBRES');

    const tituloModal = document.getElementById('modal-paso-2-titulo');
    if (tituloModal) tituloModal.innerText = `EDITAR: ${n.nom || 'NOVEDAD'}`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        const content = document.getElementById('modal-content');
        if (content) content.classList.remove('translate-y-full');
    }, 10);
}
