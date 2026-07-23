let autoScrollIntervals = [];

function cambiarVista(vista) {
    vistaActual = vista;
    const btnP = document.getElementById('btn-pendientes');
    const btnR = document.getElementById('btn-resueltos');
    
    if(vista === 'pendientes') {
        btnP.className = 'flex-1 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5';
        btnR.className = 'flex-1 py-2 text-slate-500 dark:text-slate-400 font-bold text-xs hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5';
    } else {
        btnR.className = 'flex-1 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5';
        btnP.className = 'flex-1 py-2 text-slate-500 dark:text-slate-400 font-bold text-xs hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5';
    }
    renderizar();
}

function esMenorA24Horas(isoStr) {
    if (!isoStr) return false;
    return (new Date() - new Date(isoStr)) < (24 * 60 * 60 * 1000);
}

function renderizar() {
    const container = document.getElementById('feed-container');
    if (!container) return;
    
    autoScrollIntervals.forEach(clearInterval);
    autoScrollIntervals = [];

    const activas = RAM_Novedades.filter(n => !n.resuelto);
    const resueltasTodas = RAM_Novedades.filter(n => n.resuelto);

    if (vistaActual === 'resueltos') {
        if (resueltasTodas.length === 0) {
            container.innerHTML = `<div class="col-span-full h-64 flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 opacity-80"><svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="font-extrabold tracking-widest uppercase text-xs">Sin historial de resueltos</span></div>`;
            return;
        }

        const gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start content-start w-full mb-8";
        let htmlResueltos = `<div class="${gridClass}">`;
        resueltasTodas.forEach(n => { htmlResueltos += generarHtmlCard(n); });
        htmlResueltos += `</div>`;
        
        container.innerHTML = htmlResueltos;
        return;
    }

    if (activas.length === 0 && resueltasTodas.length === 0) { // Sólo si no hay NINGUNA novedad, aunque siembre habrá LIBRES porque forzaremos el render
        // Se maneja abajo
    }

    const categorias = {
        'LIBRES': { titulo: 'LIBRES', colorText: 'text-cyan-600 dark:text-cyan-400', borderColor: 'border-cyan-400', items: [] },
        'BAJA_DIAGRAMA': { titulo: 'BAJA / TÉRMINO DE DIAGRAMA', colorText: 'text-red-500', borderColor: 'border-red-500', items: [] },
        'REPARACION': { titulo: 'REPARACIONES REQUERIDAS', colorText: 'text-indigo-500', borderColor: 'border-indigo-500', items: [] },
        'CERTIFICACION_UNIDAD': { titulo: 'CERTIFICACIONES DE UNIDAD', colorText: 'text-orange-400', borderColor: 'border-orange-300', items: [] },
        'EXAMEN_CHOFER': { titulo: 'EXÁMENES / VENCIMIENTOS', colorText: 'text-emerald-500', borderColor: 'border-emerald-500', items: [] }
    };

    activas.forEach(n => {
        if (categorias[n.tipo_novedad]) categorias[n.tipo_novedad].items.push(n);
        else categorias['REPARACION'].items.push(n);
    });

    let htmlFinal = '';
    let idsCarruseles = [];

    const columnClass = "flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4 h-full flex-1";
    const carouselClass = "flex gap-5 overflow-x-auto pb-4 pt-2 custom-scrollbar items-center w-full snap-x";

    // RENDERIZAR LIBRES PRIMERO (HORIZONTAL TOP)
    let carouselIdLibres = `carrusel-cat-libres`;
    idsCarruseles.push(carouselIdLibres);
    htmlFinal += `
    <section class="w-full mb-8">
        <div class="flex items-center gap-4 w-full">
            <div class="relative shrink-0 flex items-center justify-center h-[70px]">
                <button id="btn-quick-libre" onclick="toggleQuickAddLibre()" class="w-[70px] h-full rounded-xl border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all flex items-center justify-center group focus:outline-none shadow-sm cursor-pointer z-10 bg-white dark:bg-slate-900" title="Agregar Libre Rápido">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
                <div id="quick-add-libre-dropdown" class="hidden absolute top-[80px] left-0 w-72 md:w-80 bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                    <input type="text" id="quick-input-nom" placeholder="BUSCAR PARA LIBERAR..." class="w-full bg-transparent p-3 text-sm font-black text-slate-800 dark:text-slate-200 outline-none uppercase border-b border-slate-100 dark:border-slate-800 placeholder-slate-400" autocomplete="off" oninput="filtrarQuickChoferes()" onfocus="filtrarQuickChoferes()">
                    <div id="quick-dropdown-choferes" class="max-h-64 overflow-y-auto custom-scrollbar"></div>
                </div>
            </div>
            <div id="${carouselIdLibres}" class="${carouselClass}">`;
            
    categorias['LIBRES'].items.forEach(n => { htmlFinal += generarHtmlCard(n); });
    htmlFinal += `</div></div></section>`;

    // RENDERIZAR COLUMNAS KANBAN
    htmlFinal += `<div class="flex gap-6 w-full h-full overflow-x-auto custom-scrollbar pb-2 justify-start xl:justify-center">`;
    
    Object.keys(categorias).forEach((key, index) => {
        if (key === 'LIBRES') return;
        
        const cat = categorias[key];
        let carouselId = `carrusel-cat-${index}`;
        idsCarruseles.push(carouselId);

        htmlFinal += `
        <section class="w-80 shrink-0 border-2 border-dashed ${cat.borderColor} rounded-2xl p-4 bg-transparent snap-start flex flex-col h-full max-h-full overflow-hidden">
            <div class="w-full mb-4 shrink-0 flex items-center justify-center pb-2">
                <h2 class="text-[11px] font-black uppercase tracking-widest ${cat.colorText} text-center">
                    ${cat.titulo}
                </h2>
            </div>
            <div id="${carouselId}" class="${columnClass}">`;

        cat.items.forEach(n => { htmlFinal += generarHtmlCard(n); });
        
        htmlFinal += `</div></section>`;
    });

    htmlFinal += `</div>`;

    container.innerHTML = htmlFinal;

    setTimeout(() => {
        idsCarruseles.forEach(id => inicializarAutoScroll(id));
    }, 80);
}

function inicializarAutoScroll(containerId) {
    const track = document.getElementById(containerId);
    if (!track) return;

    let isPaused = false;
    let scrollSpeed = 1.8;

    track.addEventListener('mouseenter', () => isPaused = true);
    track.addEventListener('mouseleave', () => isPaused = false);
    track.addEventListener('touchstart', () => isPaused = true, {passive: true});
    track.addEventListener('touchend', () => {
        setTimeout(() => isPaused = false, 1200);
    }, {passive: true});

    const interval = setInterval(() => {
        if (isPaused) return;

        if (track.scrollHeight > track.clientHeight) {
            track.scrollTop += scrollSpeed;
            
            if (Math.ceil(track.scrollTop + track.clientHeight) >= track.scrollHeight - 2) {
                isPaused = true;
                setTimeout(() => {
                    track.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => isPaused = false, 1000);
                }, 1200);
            }
        }
    }, 25);

    autoScrollIntervals.push(interval);
}

function formatearTimestamp(ts, id) {
    let d = ts ? new Date(ts) : null;
    if (!d || isNaN(d.getTime())) {
        if (id && !isNaN(Number(id)) && Number(id) > 1000000000000) {
            d = new Date(Number(id));
        } else {
            return '';
        }
    }
    const dia = d.getDate();
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const mes = meses[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dia} ${mes} ${hh}:${mm}`;
}

function generarHtmlCard(n) {
    let timeFormatted = formatearTimestamp(n.timestamp, n.id);

    // DISEÑO ÚNICO PARA "LIBRES" CON COLOR CYAN SÓLIDO (#00FFFF) SEGÚN FIGMA
    if (n.tipo_novedad === 'LIBRES') {
        return `
        <article id="card-${n.id}" class="snap-start rounded-xl p-3 relative overflow-hidden transition-all duration-300 w-[300px] shrink-0 flex items-center justify-between shadow-sm hover:shadow-md bg-[#00FFFF] border-0 h-[70px]">
            <div class="flex flex-col min-w-0 pr-3 h-full justify-center">
                <h3 class="font-extrabold text-black text-[14px] leading-tight uppercase truncate tracking-tight">${n.nom}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="bg-black text-white px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase">${n.srv}</span>
                    <span class="text-[12px] font-extrabold text-black tracking-wide">${n.tractor}</span>
                </div>
            </div>
            <button ${n.resuelto ? 'disabled' : `onclick="resolver(${n.id})"`} class="shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center p-2 opacity-60 hover:opacity-100 ${n.resuelto ? 'cursor-default' : 'cursor-pointer active:scale-90'}" title="${n.resuelto ? 'Ocupado' : 'Asignar / Ocupar'}">
                <svg class="w-6 h-6 stroke-[1]" fill="none" stroke="black" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </article>`;
    }

    let cfg = { bg: 'bg-slate-50/50 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200/50 dark:border-slate-700/50' };
    if (n.tipo_novedad === 'BAJA_DIAGRAMA') cfg = { bg: 'bg-red-50/50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-500', border: 'border-red-200/50 dark:border-red-900/30' };
    if (n.tipo_novedad === 'CERTIFICACION_UNIDAD') cfg = { bg: 'bg-orange-50/50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-500', border: 'border-orange-200/50 dark:border-orange-900/30' };
    if (n.tipo_novedad === 'EXAMEN_CHOFER') cfg = { bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-500', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
    if (n.tipo_novedad === 'REPARACION') cfg = { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-500', border: 'border-indigo-200/50 dark:border-indigo-900/30' };

    let cardClass = n.resuelto 
        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30 opacity-75 grayscale-[0.1]" 
        : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800/80 shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-colors";

    return `
    <article id="card-${n.id}" class="rounded-xl border p-4 relative transition-all duration-300 w-full flex flex-col shrink-0 ${cardClass}">
        <div class="flex justify-between items-start mb-3">
            <div class="flex flex-col min-w-0 pr-3">
                <h3 class="font-extrabold ${n.resuelto ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} text-sm sm:text-base leading-tight uppercase truncate w-full tracking-tight">${n.nom}</h3>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border border-slate-200 dark:border-slate-700/50">${n.srv}</span>
                    <span class="text-[11px] font-bold ${n.resuelto ? 'text-emerald-600 dark:text-emerald-500' : 'text-indigo-500 dark:text-indigo-400'} tracking-wide">${n.tractor}</span>
                </div>
            </div>
            <button ${n.resuelto ? 'disabled' : `onclick="resolver(${n.id})"`} class="w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center ${n.resuelto ? 'bg-emerald-500/20 text-emerald-500 cursor-default' : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 cursor-pointer active:scale-95'}" title="${n.resuelto ? 'Resuelto' : 'Marcar como resuelto'}">
                <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </button>
        </div>

        <div class="${cfg.bg} border ${cfg.border} rounded-lg p-3 mt-auto flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center pb-2 mb-2 gap-2 border-b border-black/5 dark:border-white/5">
                    <span class="${cfg.text} text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0"><span class="w-2 h-2 rounded-sm ${cfg.bg.split(' ')[1]} border ${cfg.border.split(' ')[1]} block"></span> ${String(n.tipo_novedad).replace(/_/g, ' ')}</span>
                    ${n.fecha_objetivo ? `<span class="px-1.5 py-0.5 text-[9px] font-black ${cfg.text} whitespace-nowrap">${n.fecha_objetivo.split('-').reverse().join('/')}</span>` : ''}
                </div>
                <p class="${cfg.text} text-xs font-semibold font-zilla leading-relaxed whitespace-pre-wrap break-words mb-3">${n.detalle}</p>
            </div>
            <div class="flex justify-between items-center text-[9px] font-bold text-slate-400 dark:text-slate-500">
                <span class="truncate pr-2 uppercase flex items-center gap-1" title="Creador">
                    👤 ${n.creador || n.usuario || 'Anónimo'}
                </span>
                ${timeFormatted ? `<span class="shrink-0 flex items-center gap-1 tracking-wider">
                    🕒 ${timeFormatted}
                </span>` : ''}
            </div>
        </div>
    </article>`;
}

function resolver(id) {
    if (vistaActual === 'resueltos') return;
    
    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.add('fade-out');
        
        setTimeout(() => {
            let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
            if (idx > -1) {
                RAM_Novedades[idx].resuelto = true;
                RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
            }
            renderizar();
        }, 150);
    } else {
        let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
        if (idx > -1) {
            RAM_Novedades[idx].resuelto = true;
            RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
        }
        renderizar();
    }

    fetch(`${API_URL}/api/novedades/actualizar`, { 
        method: 'POST', 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'resolver', id_novedad: id }) 
    }).catch(e => console.error("Error al persistir resolución:", e));
}

// =========================================================
// QUICK ADD LIBRE (Acceso Rápido en Vía Primaria)
// =========================================================
function toggleQuickAddLibre() {
    const sesion = obtenerUsuarioSesion();
    if (!sesion || !sesion.usuario) {
        toggleDropdownLogin(true);
        return;
    }
    const drop = document.getElementById('quick-add-libre-dropdown');
    if (!drop) return;
    
    if (drop.classList.contains('hidden')) {
        drop.classList.remove('hidden');
        document.getElementById('quick-input-nom').focus();
        filtrarQuickChoferes();
    } else {
        drop.classList.add('hidden');
    }
}

function filtrarQuickChoferes() {
    const input = document.getElementById('quick-input-nom');
    const drop = document.getElementById('quick-dropdown-choferes');
    if (!drop || !input) return;

    const val = input.value.toLowerCase().trim();
    let filtrados = RAM_Flota;
    if (val.length > 0) {
        filtrados = RAM_Flota.filter(c => 
            c.nom.toLowerCase().includes(val) || 
            (c.tractor && c.tractor.toLowerCase().includes(val))
        );
    }

    if (filtrados.length === 0) {
        drop.innerHTML = '<div class="p-3 text-xs text-center text-slate-400 font-bold uppercase">No hay resultados</div>';
        return;
    }

    let html = '';
    filtrados.forEach(c => {
        html += `
        <div onclick="submitQuickLibre('${c.nom.replace(/'/g, "\\'")}', '${c.tractor || ''}', '${c.srv || 'S/A'}', '${c.n_ute || ''}')" class="p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer transition-colors flex justify-between items-center text-left">
            <div class="flex flex-col truncate pr-2">
                <span class="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">${c.nom}</span>
            </div>
            <div class="flex flex-col items-end shrink-0">
                <span class="font-black text-cyan-600 dark:text-cyan-400 text-xs tracking-wide">${c.tractor || 'S/D'}</span>
            </div>
        </div>`;
    });
    drop.innerHTML = html;
}

function submitQuickLibre(nom, tractor, srv, n_ute) {
    const sesion = obtenerUsuarioSesion();
    const creadorNom = sesion && sesion.usuario ? sesion.usuario : 'Anónimo';

    const payload = {
        nom: nom,
        tractor: tractor || '',
        srv: srv || 'S/A',
        n_ute: n_ute || 'S/D',
        tipo_novedad: 'LIBRES',
        fecha_objetivo: '',
        detalle: '',
        creador: creadorNom
    };

    // UI Feedback: hide drop, maybe show spinner on button?
    const drop = document.getElementById('quick-add-libre-dropdown');
    if (drop) drop.classList.add('hidden');
    const input = document.getElementById('quick-input-nom');
    if (input) input.value = '';

    fetch(`${API_URL}/api/novedades/actualizar`, {
        method: 'POST', 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'nueva', payload })
    }).catch(e => console.error("Error guardando Libre rápido:", e));
}

document.addEventListener('click', (e) => {
    const quickDrop = document.getElementById('quick-add-libre-dropdown');
    const quickBtn = document.getElementById('btn-quick-libre');
    if (quickDrop && quickBtn) {
        if (!quickDrop.contains(e.target) && !quickBtn.contains(e.target)) {
            quickDrop.classList.add('hidden');
        }
    }
});
