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

    if (activas.length === 0) {
        container.innerHTML = `<div class="col-span-full h-64 flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 opacity-80"><svg class="w-14 h-14 mb-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="font-extrabold tracking-widest uppercase text-xs text-slate-600 dark:text-slate-400">Bandeja Limpia ✨</span></div>`;
        return;
    }

    const categorias = {
        'EN_SERVICIO': { titulo: '🟢 En Servicio / Operativo', colorText: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300', items: [] },
        'BAJA_DIAGRAMA': { titulo: '📅 Baja / Término de Diagrama', colorText: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300', items: [] },
        'CERTIFICACION_UNIDAD': { titulo: '🚚 Certificaciones de Unidad', colorText: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300', items: [] },
        'EXAMEN_CHOFER': { titulo: '🩺 Exámenes / Vencimientos', colorText: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300', items: [] },
        'REPARACION': { titulo: '🔧 Reparaciones Requeridas', colorText: 'text-slate-700 dark:text-slate-300', badgeBg: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300', items: [] }
    };

    activas.forEach(n => {
        if (categorias[n.tipo_novedad]) categorias[n.tipo_novedad].items.push(n);
        else categorias['REPARACION'].items.push(n);
    });

    let htmlFinal = '';
    let idsCarruseles = [];

    const carouselClass = "grid grid-flow-col auto-cols-[88%] sm:auto-cols-[55%] md:auto-cols-[42%] lg:auto-cols-[31%] gap-5 overflow-x-auto pb-4 pt-2 custom-scrollbar items-stretch w-full";

    Object.keys(categorias).forEach((key, index) => {
        const cat = categorias[key];
        if (cat.items.length > 0) {
            let carouselId = `carrusel-cat-${index}`;
            idsCarruseles.push(carouselId);

            htmlFinal += `
            <section class="w-full mb-8">
                <div class="w-full mb-3 shrink-0 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
                    <h2 class="text-xs font-black uppercase tracking-widest ${cat.colorText} flex items-center gap-2">
                        ${cat.titulo}
                    </h2>
                    <span class="${cat.badgeBg} px-2.5 py-0.5 rounded-full text-[10px] font-black">${cat.items.length}</span>
                </div>
                <div id="${carouselId}" class="${carouselClass}">`;
            
            cat.items.forEach(n => { htmlFinal += generarHtmlCard(n); });
            
            htmlFinal += `</div></section>`;
        }
    });

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

        if (track.scrollWidth > track.clientWidth) {
            track.scrollLeft += scrollSpeed;

            if (Math.ceil(track.scrollLeft + track.clientWidth) >= track.scrollWidth - 2) {
                isPaused = true;
                setTimeout(() => {
                    track.scrollTo({ left: 0, behavior: 'smooth' });
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
    let cfg = { icon: '📌', bg: 'bg-indigo-50/70 dark:bg-indigo-950/40', text: 'text-indigo-900 dark:text-indigo-200', border: 'border-indigo-100 dark:border-indigo-900/40' };
    if (n.tipo_novedad === 'EN_SERVICIO') cfg = { icon: '🟢', bg: 'bg-emerald-50/70 dark:bg-emerald-950/40', text: 'text-emerald-900 dark:text-emerald-200', border: 'border-emerald-200/60 dark:border-emerald-900/40' };
    if (n.tipo_novedad === 'BAJA_DIAGRAMA') cfg = { icon: '📅', bg: 'bg-amber-50/70 dark:bg-amber-950/40', text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-200/60 dark:border-amber-900/40' };
    if (n.tipo_novedad === 'CERTIFICACION_UNIDAD') cfg = { icon: '🚚', bg: 'bg-blue-50/70 dark:bg-blue-950/40', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-200/60 dark:border-blue-900/40' };
    if (n.tipo_novedad === 'EXAMEN_CHOFER') cfg = { icon: '🩺', bg: 'bg-rose-50/70 dark:bg-rose-950/40', text: 'text-rose-900 dark:text-rose-200', border: 'border-rose-200/60 dark:border-rose-900/40' };
    if (n.tipo_novedad === 'REPARACION') cfg = { icon: '🔧', bg: 'bg-slate-100/80 dark:bg-slate-800/60', text: 'text-slate-800 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-700/60' };

    let cardClass = n.resuelto 
        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 opacity-75 grayscale-[0.1]" 
        : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700";

    let timeFormatted = formatearTimestamp(n.timestamp, n.id);

    return `
    <article id="card-${n.id}" class="snap-start rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 w-full flex flex-col h-full ${cardClass}">
        <div class="flex justify-between items-start mb-3.5">
            <div class="flex flex-col min-w-0 pr-3">
                <h3 class="font-extrabold ${n.resuelto ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} text-base sm:text-lg leading-tight uppercase truncate w-full tracking-tight">${n.nom}</h3>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase border border-slate-200 dark:border-slate-700">${n.srv}</span>
                    <span class="text-xs font-extrabold ${n.resuelto ? 'text-emerald-700 dark:text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'} tracking-wide">${n.tractor}</span>
                </div>
            </div>
            <button ${n.resuelto ? 'disabled' : `onclick="resolver(${n.id})"`} class="w-8 h-8 rounded-xl border shrink-0 transition-all duration-150 shadow-sm focus:outline-none flex items-center justify-center ${n.resuelto ? 'bg-emerald-500 border-emerald-500 text-white cursor-default' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 cursor-pointer active:scale-90'}" title="${n.resuelto ? 'Resuelto' : 'Marcar como resuelto'}">
                <svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </button>
        </div>

        <div class="${cfg.bg} ${cfg.border} border rounded-xl p-3.5 mt-auto flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2 mb-2 gap-2">
                    <span class="${cfg.text} text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">${cfg.icon} ${String(n.tipo_novedad).replace(/_/g, ' ')}</span>
                    ${n.fecha_objetivo ? `<span class="bg-white/90 dark:bg-slate-950/70 px-2 py-0.5 rounded-md text-[9px] font-black ${cfg.text} shadow-2xs whitespace-nowrap border border-black/5 dark:border-white/5">${n.fecha_objetivo.split('-').reverse().join('/')}</span>` : ''}
                </div>
                <p class="${cfg.text} text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words mb-2">${n.detalle}</p>
            </div>
            <div class="flex justify-between items-center pt-1.5 border-t border-black/5 dark:border-white/5 mt-1 text-[9px] font-bold text-slate-400 dark:text-slate-500">
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
