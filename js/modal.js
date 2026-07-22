function abrirModalNueva() {
    const sesion = obtenerUsuarioSesion();
    if (!sesion || !sesion.usuario) {
        toggleDropdownLogin(true);
        return;
    }

    const modal = document.getElementById('modal-nueva');
    if (modal) {
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

function adaptarFormulario(tipo) {
    const fInput = document.getElementById('input-fecha');
    if (fInput) fInput.required = false;
}

function enviarNovedad(e) {
    e.preventDefault();
    const sesion = obtenerUsuarioSesion();
    const creadorNom = sesion && sesion.usuario ? sesion.usuario : 'Anónimo';

    const btn = document.getElementById('btn-submit');
    if (btn) btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>`;
    
    const payload = {
        nom: document.getElementById('input-nom').value.toUpperCase(),
        tractor: document.getElementById('input-tractor').value.toUpperCase(),
        srv: document.getElementById('input-srv').value,
        n_ute: document.getElementById('input-ute').value || 'S/D',
        tipo_novedad: document.getElementById('input-tipo').value,
        fecha_objetivo: document.getElementById('input-fecha').value,
        detalle: document.getElementById('input-detalle').value,
        creador: creadorNom
    };

    fetch(`${API_URL}/api/novedades/actualizar`, {
        method: 'POST', 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'nueva', payload })
    }).then(() => {
        cerrarModalNueva(); 
        e.target.reset();
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
    if (!drop) return;

    const val = input.value.toLowerCase().trim();

    let filtrados = RAM_Flota;
    if (val.length > 0) {
        filtrados = RAM_Flota.filter(c => 
            c.nom.toLowerCase().includes(val) || 
            (c.tractor && c.tractor.toLowerCase().includes(val))
        );
    }

    if (filtrados.length === 0) {
        drop.classList.add('hidden');
        return;
    }

    let html = '';
    filtrados.forEach(c => {
        html += `
        <div onclick="seleccionarAutocompletado('${c.nom.replace(/'/g, "\\'")}', '${c.tractor || ''}', '${c.srv || 'S/A'}', '${c.n_ute || ''}')" class="p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex justify-between items-center">
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
    let opciones = Array.from(srvSelect.options).map(o => o.value);
    srvSelect.value = opciones.includes(srv) ? srv : 'S/A';
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
