let autoScrollIntervals = [];
let cardSeleccionadaId = null;

function obtenerListaFlotaArray() {
    if (!RAM_Flota) return [];
    if (Array.isArray(RAM_Flota)) return RAM_Flota;
    if (RAM_Flota.flota && typeof RAM_Flota.flota === 'object') {
        return Object.keys(RAM_Flota.flota).map(k => {
            const item = RAM_Flota.flota[k];
            return {
                nom: item.nom || item.nombre || k,
                tractor: item.tractor || '',
                srv: item.servicio || item.srv || 'S/A',
                n_ute: item.n_ute || ''
            };
        });
    }
    if (typeof RAM_Flota === 'object') {
        return Object.keys(RAM_Flota).map(k => {
            const item = RAM_Flota[k];
            return {
                nom: item.nom || item.nombre || k,
                tractor: item.tractor || '',
                srv: item.servicio || item.srv || 'S/A',
                n_ute: item.n_ute || ''
            };
        });
    }
    return [];
}

function normalizarServicio(srv) {
    if (!srv) return 'S/A';
    let clean = String(srv).toUpperCase().trim();
    if (clean === 'LIV.' || clean === 'LIV') return 'LIVIANO';
    if (clean === 'MET') return 'METANOL';
    return clean;
}

function iniciarDragCard(e, cardId) {
    cardSeleccionadaId = cardId;
    if (e && e.dataTransfer) {
        e.dataTransfer.setData('text/plain', String(cardId));
        e.dataTransfer.effectAllowed = 'move';
    }
    mostrarServiceOverlay(cardId);
}

function finalizarDragCard(e) {
    setTimeout(() => {
        ocultarServiceOverlay();
    }, 150);
}

function permitirDrop(e) {
    e.preventDefault();
    if (e && e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function destacarDropZone(element) {
    if (!element) return;
    element.classList.add('border-cyan-400', 'bg-cyan-500/25', 'scale-105', 'shadow-2xl', 'shadow-cyan-500/40');
    element.classList.remove('border-slate-500/70');
}

function desmarcarDropZone(element) {
    if (!element) return;
    element.classList.remove('border-cyan-400', 'bg-cyan-500/25', 'scale-105', 'shadow-2xl', 'shadow-cyan-500/40');
    element.classList.add('border-slate-500/70');
}

function ejecutarDropServicio(e, servicio) {
    e.preventDefault();
    const cardId = (e && e.dataTransfer ? e.dataTransfer.getData('text/plain') : null) || cardSeleccionadaId;
    ocultarServiceOverlay();
    if (cardId) {
        resolver(cardId, servicio);
    }
}

function mostrarServiceOverlay(cardId) {
    cardSeleccionadaId = cardId;
    const overlay = document.getElementById('service-drop-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }
}

function ocultarServiceOverlay() {
    const overlay = document.getElementById('service-drop-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
    document.querySelectorAll('.service-drop-zone').forEach(z => desmarcarDropZone(z));
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

    const sesion = (typeof obtenerUsuarioSesion === 'function') ? obtenerUsuarioSesion() : null;
    const usuarioActual = sesion && sesion.usuario ? sesion.usuario.toUpperCase() : '';
    
    const activas = RAM_Novedades.filter(n => !n.resuelto).sort((a, b) => b.id - a.id);
    const resueltasTodas = RAM_Novedades.filter(n => n.resuelto).sort((a, b) => b.id - a.id);

    if (vistaActual === 'archivo') {
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

    // VISTA: MIS NOVEDADES (creadas por el usuario actual)
    if (vistaActual === 'mis_novedades') {
        const misNovs = activas.filter(n => (n.usuario && n.usuario.toUpperCase() === usuarioActual) || (n.creador && n.creador.toUpperCase() === usuarioActual));
        if (misNovs.length === 0) {
            container.innerHTML = `<div class="col-span-full h-64 flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 opacity-80"><svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg><span class="font-extrabold tracking-widest uppercase text-xs">No has creado novedades activas</span></div>`;
            return;
        }
        const gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start content-start w-full mb-8";
        let htmlMis = `<div class="${gridClass}">`;
        misNovs.forEach(n => { htmlMis += generarHtmlCard(n); });
        htmlMis += `</div>`;
        container.innerHTML = htmlMis;
        return;
    }

    // VISTA: MENCIONES (donde me etiquetaron)
    if (vistaActual === 'menciones') {
        const mencionesNovs = activas.filter(n => Array.isArray(n.menciones) && n.menciones.some(m => m.toUpperCase() === usuarioActual));
        if (mencionesNovs.length === 0) {
            container.innerHTML = `<div class="col-span-full h-64 flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 opacity-80"><svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg><span class="font-extrabold tracking-widest uppercase text-xs">No tienes menciones pendientes</span></div>`;
            return;
        }
        const gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start content-start w-full mb-8";
        let htmlMenciones = `<div class="${gridClass}">`;
        mencionesNovs.forEach(n => { htmlMenciones += generarHtmlCard(n); });
        htmlMenciones += `</div>`;
        container.innerHTML = htmlMenciones;
        return;
    }

    const categorias = {
        'LIBRES': { titulo: 'LIBRES', colorText: 'text-cyan-600 dark:text-cyan-400', borderColor: 'border-cyan-400', items: [] },
        'BAJA_DIAGRAMA': { titulo: 'BAJA / TÉRMINO DE DIAGRAMA', colorText: 'text-red-500', borderColor: 'border-red-500', items: [] },
        'REPARACION': { titulo: 'REPARACIONES REQUERIDAS', colorText: 'text-indigo-500', borderColor: 'border-indigo-500', items: [] },
        'CERTIFICACION_UNIDAD': { titulo: 'CERTIFICACIONES DE UNIDAD', colorText: 'text-orange-400', borderColor: 'border-orange-300', items: [] },
        'EXAMEN_CHOFER': { titulo: 'EXÁMENES / VENCIMIENTOS', colorText: 'text-emerald-500', borderColor: 'border-emerald-500', items: [] },
        'ESTADO_DEMORA': { titulo: 'ESTADO / DEMORA', colorText: 'text-[#D28976]', borderColor: 'border-[#D28976]', items: [] }
    };

    activas.forEach(n => {
        if (categorias[n.tipo_novedad]) categorias[n.tipo_novedad].items.push(n);
        else categorias['REPARACION'].items.push(n);
    });

    let htmlFinal = '';
    let idsCarruseles = [];

    const columnClass = "flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4 h-full flex-1";
    const carouselClass = "flex gap-5 overflow-x-auto pb-4 pt-2 custom-scrollbar items-center w-full";

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
    htmlFinal += `<div class="flex gap-4 lg:gap-6 w-full h-full overflow-x-auto custom-scrollbar pb-2 items-stretch">`;
    
    Object.keys(categorias).forEach((key, index) => {
        if (key === 'LIBRES') return;
        
        const cat = categorias[key];
        if (cat.items.length === 0) return; // 🚫 Ocultar contenedores de clasificación vacíos
        
        let carouselId = `carrusel-cat-${index}`;
        idsCarruseles.push(carouselId);

        htmlFinal += `
        <section class="flex-1 min-w-[270px] border-2 border-dashed ${cat.borderColor} rounded-2xl p-4 bg-transparent flex flex-col h-full max-h-full overflow-hidden transition-all duration-300">
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
    let currentIndex = 0;
    const PAUSE_MS = 3000; // Pausa de 3 segundos por cada tarjeta

    track.addEventListener('mouseenter', () => isPaused = true);
    track.addEventListener('mouseleave', () => isPaused = false);
    track.addEventListener('touchstart', () => isPaused = true, {passive: true});
    track.addEventListener('touchend', () => {
        setTimeout(() => isPaused = false, 2000);
    }, {passive: true});

    const interval = setInterval(() => {
        if (isPaused) return;

        const cards = Array.from(track.querySelectorAll('article'));
        if (!cards || cards.length <= 1) return;

        let isHorizontal = track.classList.contains('overflow-x-auto');

        if (isHorizontal) {
            if (track.scrollWidth <= track.clientWidth) return;

            // Encontrar la tarjeta más cercana al scroll actual
            const currentScroll = track.scrollLeft;
            let closestIndex = 0;
            let minDiff = Infinity;
            cards.forEach((card, idx) => {
                const diff = Math.abs((card.offsetLeft - track.offsetLeft) - currentScroll);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = idx;
                }
            });

            currentIndex = closestIndex + 1;
            if (currentIndex >= cards.length) {
                currentIndex = 0;
            }

            const targetCard = cards[currentIndex];
            if (targetCard) {
                const targetLeft = targetCard.offsetLeft - track.offsetLeft;
                track.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
            }
        } else {
            if (track.scrollHeight <= track.clientHeight) return;

            const currentScroll = track.scrollTop;
            let closestIndex = 0;
            let minDiff = Infinity;
            cards.forEach((card, idx) => {
                const diff = Math.abs((card.offsetTop - track.offsetTop) - currentScroll);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = idx;
                }
            });

            currentIndex = closestIndex + 1;
            if (currentIndex >= cards.length) {
                currentIndex = 0;
            }

            const targetCard = cards[currentIndex];
            if (targetCard) {
                const targetTop = targetCard.offsetTop - track.offsetTop;
                track.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }
        }
    }, PAUSE_MS);

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
    
    // 👉 Búsqueda dinámica en RAM_Flota para auto-actualizar n_ute, tractor y srv si están disponibles en RAM
    let normNom = (n.nom || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    let infoFlota = null;
    
    if (typeof RAM_Flota !== 'undefined' && RAM_Flota) {
        if (RAM_Flota.flota && RAM_Flota.flota[normNom]) {
            infoFlota = RAM_Flota.flota[normNom];
        } else if (Array.isArray(RAM_Flota)) {
            infoFlota = RAM_Flota.find(c => String(c.nom || c.nombre || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ') === normNom);
        }
    }

    let tractorFinal = (infoFlota && infoFlota.tractor) ? infoFlota.tractor : (n.tractor || '');
    let srvFinal = (infoFlota && infoFlota.servicio) ? infoFlota.servicio : (n.srv || 'S/A');
    let uteRaw = (infoFlota && infoFlota.n_ute) ? infoFlota.n_ute : (n.n_ute || '');
    let uteBadge = (uteRaw && uteRaw !== 'S/D') ? uteRaw : '';

    // DISEÑO ÚNICO PARA "LIBRES" CON COLOR CYAN SÓLIDO (#00FFFF) SEGÚN FIGMA
    if (n.tipo_novedad === 'LIBRES') {
        let tieneDetalle = n.detalle && n.detalle.trim().length > 0;
        let cardHeight = tieneDetalle ? 'min-h-[90px] py-3' : 'min-h-[85px] py-2.5';
        return `
        <article id="card-${n.id}" draggable="true" ondragstart="iniciarDragCard(event, ${n.id})" ondragend="finalizarDragCard(event)" class="rounded-xl p-3 relative transition-all duration-300 w-[300px] shrink-0 flex flex-col justify-between shadow-sm hover:shadow-md bg-[#00FFFF] border-0 cursor-grab active:cursor-grabbing ${cardHeight}">
            <div class="card-inner-content flex flex-col w-full transition-opacity duration-200">
                <!-- ROW 1: NOMBRE Y BOTONES DE ACCIÓN (ESQUINA SUPERIOR DERECHA) -->
                <div class="flex items-start justify-between w-full -mt-0.5 mb-1">
                    <h3 class="font-extrabold text-black text-[14px] leading-tight uppercase truncate tracking-tight flex-1 pr-1">${n.nom}</h3>
                    <div class="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                        <button class="btn-card-edit w-7 h-7 rounded-lg shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center text-black/70 hover:text-black hover:bg-black/10 cursor-pointer active:scale-95" onclick="abrirEdicion(${n.id})" title="Editar detalle">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button ${n.resuelto ? 'disabled' : `onclick="resolver(${n.id})"`} class="btn-card-resolve w-7 h-7 rounded-lg shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center text-black/70 hover:text-black hover:bg-black/10 ${n.resuelto ? 'cursor-default' : 'cursor-pointer active:scale-95'}" title="${n.resuelto ? 'Ocupado' : 'Asignar / Ocupar'}">
                            <svg class="w-5 h-5 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- FILA ÚNICA DE DATOS: UTE, TRACTOR, TERMINAL BADGE, SERVICIO BADGE -->
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${uteBadge ? `<span class="border border-black rounded px-1.5 py-0.5 text-[10px] font-black text-black leading-none">${uteBadge}</span>` : ''}
                    <span class="text-[12px] font-extrabold text-black tracking-wide">${tractorFinal}</span>
                    ${obtenerHtmlButtonTerminal(n)}
                    ${obtenerHtmlButtonServicio(n)}
                </div>

                ${tieneDetalle ? `
                <div class="mt-2 bg-black/10 rounded-lg p-2.5 overflow-y-auto custom-scrollbar max-h-24">
                    <p class="text-black text-xs font-bold font-zilla leading-tight whitespace-pre-wrap break-words">${n.detalle}</p>
                </div>` : ''}

                <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-black uppercase mt-2">
                    <span class="flex items-center gap-1 shrink-0">
                        <span class="text-purple-700">👤</span>
                        <span>${n.creador || n.usuario || 'USER'}</span>
                    </span>
                    <div class="relative inline-block mention-input-wrapper">
                        <input type="text" class="bg-black/10 border-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-black w-14 outline-none focus:bg-black/20 focus:w-20 transition-all placeholder:text-black/40" placeholder="@" oninput="filtrarMenciones(this, ${n.id})" onfocus="filtrarMenciones(this, ${n.id})" data-card-id="${n.id}">
                        <div class="mention-dropdown hidden absolute z-50 bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-32 overflow-y-auto w-36" id="mention-drop-libre-${n.id}"></div>
                    </div>
                    ${(Array.isArray(n.menciones) && n.menciones.length > 0) ? n.menciones.map(m => `<span class="bg-black/20 text-black px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">@${m}<button onclick="quitarMencion(${n.id}, '${m.replace(/'/g, "\\'")}')" class="btn-mention-remove ml-1 px-1.5 py-0.5 rounded hover:bg-black/20 text-black/70 hover:text-red-700 transition-all cursor-pointer font-black text-xs inline-flex items-center justify-center leading-none" title="Quitar mención">✕</button></span>`).join('') : ''}
                    ${timeFormatted ? `<span class="text-black/60 font-bold tracking-wide ml-auto">${timeFormatted}</span>` : ''}
                </div>
            </div>

            <!-- DESPLEGABLES FUERA DE card-inner-content (MANTIENEN 100% OPACIDAD VIBRANTE) -->
            ${obtenerHtmlDropdownTerminal(n)}
            ${obtenerHtmlDropdownServicio(n)}
        </article>`;
    }

    let cfg = { bg: 'bg-slate-50/50 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200/50 dark:border-slate-700/50' };
    if (n.tipo_novedad === 'BAJA_DIAGRAMA') cfg = { bg: 'bg-red-50/50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-500', border: 'border-red-200/50 dark:border-red-900/30' };
    if (n.tipo_novedad === 'CERTIFICACION_UNIDAD') cfg = { bg: 'bg-orange-50/50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-500', border: 'border-orange-200/50 dark:border-orange-900/30' };
    if (n.tipo_novedad === 'EXAMEN_CHOFER') cfg = { bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-500', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
    if (n.tipo_novedad === 'REPARACION') cfg = { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-500', border: 'border-indigo-200/50 dark:border-indigo-900/30' };
    if (n.tipo_novedad === 'ESTADO_DEMORA') cfg = { bg: 'bg-[#D28976]/10 dark:bg-[#D28976]/20', text: 'text-[#D28976]', border: 'border-[#D28976]/30' };

    let cardClass = n.resuelto 
        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30 opacity-75 grayscale-[0.1]" 
        : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800/80 shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-colors";

    return `
    <article id="card-${n.id}" class="rounded-xl border p-4 relative transition-all duration-300 w-full flex flex-col shrink-0 ${cardClass}">
        <div class="flex flex-col w-full mb-2">
            <!-- ROW 1: NOMBRE Y BOTONES DE ACCIÓN (MÁS ARRIBA EN LA ESQUINA SUPERIOR DERECHA) -->
            <div class="flex items-start justify-between w-full -mt-1 mb-1">
                <h3 class="font-extrabold ${n.resuelto ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} text-sm sm:text-base leading-tight uppercase truncate flex-1 pr-2 tracking-tight">${n.nom}</h3>
                <div class="flex items-center gap-1.5 shrink-0 -mt-1 -mr-1">
                    <button ${n.resuelto ? 'disabled' : `onclick="resolver(${n.id})"`} class="btn-card-resolve w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center ${n.resuelto ? 'bg-emerald-500/20 text-emerald-500 cursor-default' : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 cursor-pointer active:scale-95'}" title="${n.resuelto ? 'Resuelto' : 'Marcar como resuelto'}">
                        <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <button class="btn-card-edit w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:text-indigo-500 dark:hover:text-indigo-400 text-slate-400 dark:text-slate-500 cursor-pointer active:scale-95" onclick="abrirEdicion(${n.id})" title="Editar detalle">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                </div>
            </div>

            <!-- FILA ÚNICA DE DATOS: SRV, UTE, TRACTOR, FECHA (SIN TERMINAL EN OTRAS CLASIFICACIONES) -->
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border border-slate-200 dark:border-slate-700/50">${srvFinal}</span>
                ${uteBadge ? `<span class="border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase">${uteBadge}</span>` : ''}
                <span class="text-[11px] font-bold ${n.resuelto ? 'text-emerald-600 dark:text-emerald-500' : 'text-indigo-500 dark:text-indigo-400'} tracking-wide">${tractorFinal}</span>
                ${n.fecha_objetivo ? `<span class="px-1.5 py-0.5 text-[9px] font-black ${cfg.text} whitespace-nowrap rounded border ${cfg.border}">${n.fecha_objetivo.split('-').reverse().join('/')}</span>` : ''}
            </div>
        </div>

        ${n.detalle && n.detalle.trim() ? `
        <div class="${cfg.bg} border ${cfg.border} rounded-lg p-3 mb-3">
            <p class="${cfg.text} text-xs font-semibold font-zilla leading-relaxed whitespace-pre-wrap break-words">${n.detalle}</p>
        </div>` : ''}

        <div class="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-auto">
            <span class="uppercase flex items-center gap-1 shrink-0" title="Creador">
                👤 ${n.creador || n.usuario || 'Anónimo'}
            </span>
            <div class="relative inline-block mention-input-wrapper">
                <input type="text" class="bg-transparent border border-dashed border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 w-16 outline-none focus:border-indigo-400 focus:w-24 transition-all placeholder:text-slate-400" placeholder="@" oninput="filtrarMenciones(this, ${n.id})" onfocus="filtrarMenciones(this, ${n.id})" data-card-id="${n.id}">
                <div class="mention-dropdown hidden absolute z-50 bottom-full left-0 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-h-32 overflow-y-auto w-36" id="mention-drop-${n.id}"></div>
            </div>
            ${(Array.isArray(n.menciones) && n.menciones.length > 0) ? n.menciones.map(m => `<span class="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">@${m}<button onclick="quitarMencion(${n.id}, '${m.replace(/'/g, "\\'")}')" class="btn-mention-remove ml-1 px-1.5 py-0.5 rounded hover:bg-rose-500/20 hover:text-rose-500 transition-all cursor-pointer font-black text-xs inline-flex items-center justify-center leading-none" title="Quitar mención">✕</button></span>`).join('') : ''}
            ${timeFormatted ? `<span class="shrink-0 flex items-center gap-1 tracking-wider ml-auto">
                🕒 ${timeFormatted}
            </span>` : ''}
        </div>
    </article>`;
}

function resolver(id, nuevoServicio = null) {
    if (vistaActual === 'archivo') return;
    
    let nov = (RAM_Novedades || []).find(n => String(n.id) === String(id));
    const srvFinal = nuevoServicio ? normalizarServicio(nuevoServicio) : (nov ? (nov.srv || 'S/A') : 'S/A');

    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.add('fade-out');
        
        setTimeout(() => {
            let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
            if (idx > -1) {
                RAM_Novedades[idx].resuelto = true;
                if (nuevoServicio) {
                    RAM_Novedades[idx].srv = srvFinal;
                    RAM_Novedades[idx].servicio = srvFinal;
                }
                RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
            }
            renderizar();
        }, 150);
    } else {
        let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
        if (idx > -1) {
            RAM_Novedades[idx].resuelto = true;
            if (nuevoServicio) {
                RAM_Novedades[idx].srv = srvFinal;
                RAM_Novedades[idx].servicio = srvFinal;
            }
            RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
        }
        renderizar();
    }

    const payload = {
        nom: nov ? nov.nom : '',
        tractor: nov ? nov.tractor : '',
        srv: srvFinal,
        servicio: srvFinal,
        n_ute: nov ? nov.n_ute : 'S/D',
        tipo_novedad: nov ? nov.tipo_novedad : 'LIBRES',
        terminal: nov ? nov.terminal : '',
        fecha_objetivo: nov ? nov.fecha_objetivo : '',
        detalle: nov ? nov.detalle : '',
        creador: nov ? (nov.creador || nov.usuario) : 'Anónimo',
        menciones: nov ? nov.menciones : []
    };

    fetch(`${API_URL}/api/novedades/actualizar`, { 
        method: 'POST', 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'resolver', id_novedad: id, payload: payload }) 
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
    const lista = obtenerListaFlotaArray();

    let filtrados = lista;
    if (val.length > 0) {
        filtrados = lista.filter(c => 
            (c.nom && c.nom.toLowerCase().includes(val)) || 
            (c.tractor && c.tractor.toLowerCase().includes(val))
        );
    }

    if (!Array.isArray(filtrados) || filtrados.length === 0) {
        drop.innerHTML = '<div class="p-3 text-xs text-center text-slate-400 font-bold uppercase">No hay resultados</div>';
        return;
    }

    let html = '';
    filtrados.slice(0, 30).forEach(c => {
        html += `
        <div onclick="submitQuickLibre('${(c.nom || '').replace(/'/g, "\\'")}', '${c.tractor || ''}', '${c.srv || 'S/A'}', '${c.n_ute || ''}')" class="p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer transition-colors flex justify-between items-center text-left">
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

// ==============================================================
// SISTEMA DE MENCIONES INLINE (@)
// ==============================================================
function filtrarMenciones(input, cardId) {
    const val = input.value.replace('@', '').trim().toLowerCase();
    // Find the dropdown - try both regular and libre card IDs
    let drop = document.getElementById(`mention-drop-${cardId}`) || document.getElementById(`mention-drop-libre-${cardId}`);
    if (!drop) {
        // Fallback: find nearest dropdown
        drop = input.parentElement.querySelector('.mention-dropdown');
    }
    if (!drop) return;

    const usuarios = (typeof RAM_Usuarios !== 'undefined' && Array.isArray(RAM_Usuarios)) ? RAM_Usuarios : [];
    if (usuarios.length === 0 || val.length === 0) {
        drop.classList.add('hidden');
        return;
    }

    // Get current mentions to exclude already-mentioned users
    const nov = (RAM_Novedades || []).find(n => String(n.id) === String(cardId));
    const yaEnMenciones = (nov && Array.isArray(nov.menciones)) ? nov.menciones : [];

    const filtrados = usuarios.filter(u => 
        u.toLowerCase().includes(val) && !yaEnMenciones.includes(u)
    ).slice(0, 6);

    if (filtrados.length === 0) {
        drop.classList.add('hidden');
        return;
    }

    drop.innerHTML = filtrados.map(u => 
        `<div onclick="agregarMencion(${cardId}, '${u.replace(/'/g, "\\'")}', this)" class="px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-colors uppercase">${u}</div>`
    ).join('');
    drop.classList.remove('hidden');
}

function agregarMencion(cardId, usuario, el) {
    // Hide dropdown and clear input
    const wrapper = el ? el.closest('.mention-input-wrapper') : null;
    if (wrapper) {
        const input = wrapper.querySelector('input');
        const drop = wrapper.querySelector('.mention-dropdown');
        if (input) input.value = '';
        if (drop) drop.classList.add('hidden');
    }

    // Send to server
    fetch(`${API_URL}/api/novedades/mencion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_novedad: String(cardId), usuario: usuario, accion: 'agregar' })
    }).catch(e => console.error('Error agregando mención:', e));
}

function quitarMencion(cardId, usuario) {
    fetch(`${API_URL}/api/novedades/mencion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_novedad: String(cardId), usuario: usuario, accion: 'quitar' })
    }).catch(e => console.error('Error quitando mención:', e));
}

// ==============================================================
// SISTEMA DE TERMINALES EN TARJETAS
// ==============================================================
const CONFIG_TERMINALES_FEED = {
    'DOCK SUD': { bg: '#DD7E6B', text: '#000000' },
    'TLC': { bg: '#920E61', text: '#FFFFFF' },
    'TPH': { bg: '#A4C2F4', text: '#000000' },
    'AÑELO': { bg: '#DECBC6', text: '#000000' }
};

function obtenerHtmlButtonTerminal(n) {
    const term = (n.terminal || '').toUpperCase().trim();
    const cfg = CONFIG_TERMINALES_FEED[term];

    if (!term || !cfg) {
        return `
        <button type="button" onclick="toggleDropdownTerminalCard(${n.id}, event)" class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-black/20 dark:hover:bg-white/20 transition-all flex items-center gap-1 cursor-pointer" title="Asignar Terminal">
            <span>+ TERMINAL</span>
        </button>`;
    }

    return `
    <button type="button" onclick="toggleDropdownTerminalCard(${n.id}, event)" class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs" style="background-color: ${cfg.bg}; color: ${cfg.text};" title="Cambiar Terminal">
        <span>${term}</span>
    </button>`;
}

function obtenerHtmlDropdownTerminal(n) {
    const term = (n.terminal || '').toUpperCase().trim();
    return `
    <div id="drop-terminal-card-${n.id}" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-1 items-end py-0.5 select-none pointer-events-auto opacity-100">
        ${Object.keys(CONFIG_TERMINALES_FEED).map(t => {
            const c = CONFIG_TERMINALES_FEED[t];
            return `<div onclick="cambiarTerminalCard(${n.id}, '${t}', event)" class="px-3 py-0.5 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center tracking-wide opacity-100" style="background-color: ${c.bg}; color: ${c.text}; min-width: 85px;">${t}</div>`;
        }).join('')}
        ${term ? `<div onclick="cambiarTerminalCard(${n.id}, '', event)" class="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase cursor-pointer bg-slate-900 text-white hover:bg-rose-600 transition-all shadow-md border border-white/20 opacity-100">✕ Quitar</div>` : ''}
    </div>`;
}

function toggleDropdownTerminalCard(cardId, event) {
    if (event) event.stopPropagation();
    const drop = document.getElementById(`drop-terminal-card-${cardId}`);
    const card = document.getElementById(`card-${cardId}`);

    // Reset all other open terminal drops and dimmed cards
    document.querySelectorAll('[id^="drop-terminal-card-"]').forEach(d => {
        if (d !== drop) d.classList.add('hidden');
    });
    document.querySelectorAll('.card-dimmed').forEach(c => {
        if (c !== card) {
            c.classList.remove('card-dimmed');
            const inner = c.querySelector('.card-inner-content');
            if (inner) inner.classList.remove('opacity-30');
        }
    });

    if (drop) {
        const isOpening = drop.classList.contains('hidden');
        drop.classList.toggle('hidden');
        if (card) {
            const inner = card.querySelector('.card-inner-content');
            if (isOpening) {
                card.classList.add('card-dimmed');
                if (inner) inner.classList.add('opacity-30');
            } else {
                card.classList.remove('card-dimmed');
                if (inner) inner.classList.remove('opacity-30');
            }
        }
    }
}

function cerrarTodosTerminalDropdowns() {
    document.querySelectorAll('[id^="drop-terminal-card-"], [id^="drop-servicio-card-"]').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.card-dimmed').forEach(c => {
        c.classList.remove('card-dimmed');
        const inner = c.querySelector('.card-inner-content');
        if (inner) inner.classList.remove('opacity-30');
    });
}

function cambiarTerminalCard(cardId, terminal, event) {
    if (event) event.stopPropagation();
    cerrarTodosTerminalDropdowns();

    const nov = (RAM_Novedades || []).find(x => String(x.id) === String(cardId));
    if (!nov) return;

    // Actualización optimista en RAM local y re-render inmediato
    nov.terminal = terminal;
    if (typeof renderizar === 'function') renderizar();

    const payload = {
        nom: nov.nom || '',
        tractor: nov.tractor || '',
        srv: nov.srv || 'S/A',
        servicio: nov.servicio || nov.srv || 'S/A',
        n_ute: nov.n_ute || 'S/D',
        tipo_novedad: nov.tipo_novedad || 'LIBRES',
        terminal: terminal,
        fecha_objetivo: nov.fecha_objetivo || '',
        detalle: nov.detalle || '',
        creador: nov.creador || nov.usuario || 'Anónimo',
        menciones: nov.menciones || []
    };

    fetch(`${API_URL}/api/novedades/actualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', id_novedad: String(cardId), payload: payload })
    }).catch(e => console.error('Error actualizando terminal:', e));
}

// ==============================================================
// SISTEMA DE SERVICIOS EN TARJETAS (JSON Y SHEETS)
// ==============================================================
const CONFIG_SERVICIOS_FEED = {
    'TDS': { bg: '#10B981', text: '#FFFFFF' },
    'CM': { bg: '#3B82F6', text: '#FFFFFF' },
    'PP': { bg: '#8B5CF6', text: '#FFFFFF' },
    'EURO': { bg: '#F59E0B', text: '#FFFFFF' },
    'MET': { bg: '#EC4899', text: '#FFFFFF' },
    'LIV.': { bg: '#06B6D4', text: '#FFFFFF' },
    'LIVIANO': { bg: '#06B6D4', text: '#FFFFFF' }
};

function obtenerHtmlButtonServicio(n) {
    const srvRaw = (n.srv || n.servicio || '').toUpperCase().trim();
    let srvDisplay = srvRaw;
    if (srvRaw === 'LIVIANO') srvDisplay = 'LIV.';
    const cfg = CONFIG_SERVICIOS_FEED[srvRaw] || CONFIG_SERVICIOS_FEED[srvDisplay];

    if (!srvRaw || srvRaw === 'S/A' || !cfg) {
        return `
        <button type="button" onclick="toggleDropdownServicioCard(${n.id}, event)" class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black text-white hover:bg-black/80 transition-all flex items-center gap-1 cursor-pointer" title="Asignar Servicio">
            <span>+ SERVICIO</span>
        </button>`;
    }

    return `
    <button type="button" onclick="toggleDropdownServicioCard(${n.id}, event)" class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs" style="background-color: ${cfg.bg}; color: ${cfg.text};" title="Cambiar Servicio">
        <span>${srvDisplay}</span>
    </button>`;
}

function obtenerHtmlDropdownServicio(n) {
    const srvRaw = (n.srv || n.servicio || '').toUpperCase().trim();
    const opciones = ['TDS', 'CM', 'PP', 'EURO', 'MET', 'LIV.'];
    return `
    <div id="drop-servicio-card-${n.id}" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-1 items-end py-0.5 select-none pointer-events-auto opacity-100">
        ${opciones.map(t => {
            const c = CONFIG_SERVICIOS_FEED[t];
            return `<div onclick="cambiarServicioCard(${n.id}, '${t}', event)" class="px-3 py-0.5 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center tracking-wide opacity-100" style="background-color: ${c.bg}; color: ${c.text}; min-width: 85px;">${t}</div>`;
        }).join('')}
        ${(srvRaw && srvRaw !== 'S/A') ? `<div onclick="cambiarServicioCard(${n.id}, 'S/A', event)" class="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase cursor-pointer bg-slate-900 text-white hover:bg-rose-600 transition-all shadow-md border border-white/20 opacity-100">✕ Quitar</div>` : ''}
    </div>`;
}

function toggleDropdownServicioCard(cardId, event) {
    if (event) event.stopPropagation();
    const drop = document.getElementById(`drop-servicio-card-${cardId}`);
    const card = document.getElementById(`card-${cardId}`);

    document.querySelectorAll('[id^="drop-terminal-card-"], [id^="drop-servicio-card-"]').forEach(d => {
        if (d !== drop) d.classList.add('hidden');
    });
    document.querySelectorAll('.card-dimmed').forEach(c => {
        if (c !== card) {
            c.classList.remove('card-dimmed');
            const inner = c.querySelector('.card-inner-content');
            if (inner) inner.classList.remove('opacity-30');
        }
    });

    if (drop) {
        const isOpening = drop.classList.contains('hidden');
        drop.classList.toggle('hidden');
        if (card) {
            const inner = card.querySelector('.card-inner-content');
            if (isOpening) {
                card.classList.add('card-dimmed');
                if (inner) inner.classList.add('opacity-30');
            } else {
                card.classList.remove('card-dimmed');
                if (inner) inner.classList.remove('opacity-30');
            }
        }
    }
}

function cambiarServicioCard(cardId, servicio, event) {
    if (event) event.stopPropagation();
    cerrarTodosTerminalDropdowns();

    const nov = (RAM_Novedades || []).find(x => String(x.id) === String(cardId));
    if (!nov) return;

    let srvClean = servicio.toUpperCase();
    if (srvClean === 'LIV.' || srvClean === 'LIV') srvClean = 'LIVIANO';

    // Actualización optimista en RAM local y re-render inmediato
    nov.srv = srvClean;
    nov.servicio = srvClean;
    if (typeof renderizar === 'function') renderizar();

    const payload = {
        nom: nov.nom || '',
        tractor: nov.tractor || '',
        srv: srvClean,
        servicio: srvClean,
        n_ute: nov.n_ute || 'S/D',
        tipo_novedad: nov.tipo_novedad || 'LIBRES',
        terminal: nov.terminal || '',
        fecha_objetivo: nov.fecha_objetivo || '',
        detalle: nov.detalle || '',
        creador: nov.creador || nov.usuario || 'Anónimo',
        menciones: nov.menciones || []
    };

    fetch(`${API_URL}/api/novedades/actualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', id_novedad: String(cardId), payload: payload })
    }).catch(e => console.error('Error actualizando servicio:', e));
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.mention-input-wrapper')) {
        document.querySelectorAll('.mention-dropdown').forEach(d => d.classList.add('hidden'));
    }
    if (!e.target.closest('[id^="drop-terminal-card-"]') && !e.target.closest('[id^="drop-servicio-card-"]') && !e.target.closest('button[onclick*="toggleDropdownTerminalCard"]') && !e.target.closest('button[onclick*="toggleDropdownServicioCard"]')) {
        cerrarTodosTerminalDropdowns();
    }
});
