let autoScrollIntervals = [];
let cardSeleccionadaId = null;

function esModoCartelera() {
    return document.documentElement.classList.contains('modo-cartelera') || 
           document.documentElement.classList.contains('vista-solida');
}

function parsearFechaVencimiento(fechaStr) {
    if (!fechaStr) return null;
    let str = String(fechaStr).trim();
    if (!str || str === '-' || str === 'S/D') return null;

    let parts = str.split('/');
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    parts = str.split('-');
    if (parts.length === 3) {
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let day = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    return null;
}

function obtenerEstadoVencimiento(fechaStr) {
    const d = parsearFechaVencimiento(fechaStr);
    if (!d || isNaN(d.getTime())) return { estado: 'NONE', dias: 999, colorBg: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400', colorBorder: 'border-slate-300 dark:border-slate-700' };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diffTime = d.getTime() - hoy.getTime();
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dias < 0) {
        // ROJO: Vencido
        return { estado: 'VENCIDO', dias, colorBg: 'bg-red-500/90 text-white', colorBorder: 'border-red-600 shadow-sm shadow-red-500/40 font-black' };
    } else if (dias <= 7) {
        // AMARILLO: Vence en 1 semana
        return { estado: 'SEMANA', dias, colorBg: 'bg-amber-400 text-slate-950 font-black', colorBorder: 'border-amber-500 shadow-sm shadow-amber-500/40' };
    } else {
        // NORMAL / VIGENTE
        return { estado: 'VIGENTE', dias, colorBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold', colorBorder: 'border-emerald-500/30' };
    }
}

function obtenerVencimientosTarjeta(tractorPatente, choferNom) {
    let vencList = [];
    if (typeof RAM_Flota !== 'undefined' && RAM_Flota) {
        if (RAM_Flota.vencimientosObj && Array.isArray(RAM_Flota.vencimientosObj)) {
            vencList = RAM_Flota.vencimientosObj;
        } else if (Array.isArray(RAM_Flota) && RAM_Flota.vencimientosObj) {
            vencList = RAM_Flota.vencimientosObj;
        }
    }

    const normTractor = (tractorPatente || '').trim().toUpperCase();
    if (!normTractor) return [];

    // Buscar coincidencia por col_b (TRACTOR)
    const match = vencList.find(v => (v.col_b || '').trim().toUpperCase() === normTractor);
    if (!match) return [];

    // Mapeo solicitado:
    // col_g: MASS TR -> MAS T
    // col_h: VTV TR -> VTV T
    // col_j: MAS SEMI -> MAS S
    // col_k: VTV SEMI -> VTV S
    // col_l: Esp-Es
    // col_m: VI
    // col_n: VE
    const campos = [
        { label: 'MAS T', val: match.col_g },
        { label: 'VTV T', val: match.col_h },
        { label: 'MAS S', val: match.col_j },
        { label: 'VTV S', val: match.col_k },
        { label: 'Esp-Es', val: match.col_l },
        { label: 'VI', val: match.col_m },
        { label: 'VE', val: match.col_n }
    ];

    return campos.filter(c => c.val && String(c.val).trim() !== '-' && String(c.val).trim() !== 'S/D').map(c => {
        const est = obtenerEstadoVencimiento(c.val);
        return {
            label: c.label,
            fecha: c.val,
            ...est
        };
    }).sort((a, b) => a.dias - b.dias);
}

function gestionarNovedadVencimiento(choferNom, tractorPatente, tipoVencimiento, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if (typeof esModoCartelera === 'function' && esModoCartelera()) return;

    const normChofer = (choferNom || '').trim().toLowerCase();
    const normTractor = (tractorPatente || '').trim().toLowerCase();

    // Buscar si existe novedad activa (resuelto === false)
    const novExistente = (typeof RAM_Novedades !== 'undefined' ? RAM_Novedades : []).find(n => {
        if (n.resuelto) return false;
        const nNom = (n.nom || '').trim().toLowerCase();
        const nTractor = (n.tractor || '').trim().toLowerCase();
        return (normChofer && nNom === normChofer) || (normTractor && nTractor === normTractor);
    });

    if (novExistente) {
        if (typeof abrirEdicion === 'function') abrirEdicion(novExistente.id);
    } else {
        if (typeof abrirModalNueva === 'function') {
            abrirModalNueva();
            setTimeout(() => {
                const inputNom = document.getElementById('input-nom');
                const inputTractor = document.getElementById('input-tractor');
                const inputDetalle = document.getElementById('input-detalle');
                if (inputNom && choferNom) inputNom.value = choferNom;
                if (inputTractor && tractorPatente) inputTractor.value = tractorPatente;
                if (inputDetalle) inputDetalle.value = `VENCIMIENTO REGISTRADO: ${tipoVencimiento}`;
            }, 120);
        }
    }
}

let subVistaCertificaciones = 'cards'; // 'cards' (predeterminado) o 'lista'

function cambiarSubVistaCertificaciones(subVista, event) {
    if (event) event.stopPropagation();
    subVistaCertificaciones = subVista;
    renderizar();
}

function obtenerNombreChoferPorTractor(tractorPatente) {
    const tractor = (tractorPatente || '').trim().toUpperCase();
    if (!tractor) return '-';

    if (typeof RAM_Flota !== 'undefined' && RAM_Flota) {
        // 1. Buscar en RAM_Flota.flota (mapa nombre -> { tractor, ... })
        if (RAM_Flota.flota && typeof RAM_Flota.flota === 'object') {
            for (let nomKey in RAM_Flota.flota) {
                const item = RAM_Flota.flota[nomKey];
                if (item && item.tractor && item.tractor.trim().toUpperCase() === tractor) {
                    return nomKey.toUpperCase();
                }
            }
        }
        
        // 2. Buscar en RAM_Flota si es un array u objeto con items
        if (Array.isArray(RAM_Flota)) {
            const found = RAM_Flota.find(c => (c.tractor || c.TRACTOR || '').trim().toUpperCase() === tractor);
            if (found && (found.nom || found.nombre || found.chofer)) {
                return (found.nom || found.nombre || found.chofer).toUpperCase();
            }
        }
    }

    // 3. Buscar en RAM_Novedades (si hay alguna novedad de ese tractor con nombre de chofer)
    if (typeof RAM_Novedades !== 'undefined' && Array.isArray(RAM_Novedades)) {
        const foundNov = RAM_Novedades.find(n => (n.tractor || '').trim().toUpperCase() === tractor && n.nom);
        if (foundNov && foundNov.nom) {
            return foundNov.nom.toUpperCase();
        }
    }

    return '-';
}

function obtenerListaCertificacionesUnidad() {
    let vencList = [];
    if (typeof RAM_Flota !== 'undefined' && RAM_Flota) {
        if (RAM_Flota.vencimientosObj && Array.isArray(RAM_Flota.vencimientosObj)) {
            vencList = RAM_Flota.vencimientosObj;
        } else if (Array.isArray(RAM_Flota) && RAM_Flota.vencimientosObj) {
            vencList = RAM_Flota.vencimientosObj;
        }
    }

    if (!Array.isArray(vencList) || vencList.length === 0) return [];

    // Mapa para asegurar que cada tractor aparezca solo una vez con su vencimiento MÁS URGENTE
    let tractorMasUrgenteMap = {};

    vencList.forEach(item => {
        const tractor = (item.col_b || '').trim().toUpperCase();
        if (!tractor) return;

        const choferNom = obtenerNombreChoferPorTractor(tractor);

        const campos = [
            { label: 'MAS T', val: item.col_g },
            { label: 'VTV T', val: item.col_h },
            { label: 'MAS S', val: item.col_j },
            { label: 'VTV S', val: item.col_k },
            { label: 'Esp-Es', val: item.col_l },
            { label: 'VI', val: item.col_m },
            { label: 'VE', val: item.col_n }
        ];

        campos.forEach(c => {
            if (!c.val || String(c.val).trim() === '-' || String(c.val).trim() === 'S/D') return;

            const est = obtenerEstadoVencimiento(c.val);
            // OBVIAR LOS QUE ESTÁN EN REGLA (> 7 DÍAS). SOLO RENDERIZAR VENCIDOS Y A 1 SEMANA
            if (est.estado === 'VENCIDO' || est.estado === 'SEMANA') {
                const candidato = {
                    tractor,
                    label: c.label,
                    fecha: c.val,
                    chofer: choferNom,
                    estado: est.estado,
                    dias: est.dias
                };

                // Si el tractor no está registrado aún o el nuevo vencimiento es más urgente (menor número de días)
                if (!tractorMasUrgenteMap[tractor] || candidato.dias < tractorMasUrgenteMap[tractor].dias) {
                    tractorMasUrgenteMap[tractor] = candidato;
                }
            }
        });
    });

    const resultado = Object.values(tractorMasUrgenteMap);

    // Ordenar la lista final por urgencia (vencidos primero, luego más próximos)
    resultado.sort((a, b) => a.dias - b.dias);
    return resultado;
}

function obtenerPesosColumnasGuardados() {
    try {
        const str = localStorage.getItem('column_flex_weights');
        if (!str) return {};
        return JSON.parse(str);
    } catch(e) {
        return {};
    }
}

function guardarPesosColumnas(mapaPesos) {
    try {
        localStorage.setItem('column_flex_weights', JSON.stringify(mapaPesos));
    } catch(e) {}
}

let isResizingColumn = false;

function iniciarResizingColumna(e, catKeyLeft, catKeyRight) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (typeof esModoCartelera === 'function' && esModoCartelera()) return;

    const leftCol = document.querySelector(`[data-cat="${catKeyLeft}"]`);
    const rightCol = document.querySelector(`[data-cat="${catKeyRight}"]`);
    const container = document.getElementById('kanban-columns-wrapper');
    if (!leftCol || !rightCol || !container) return;

    isResizingColumn = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const containerWidth = container.getBoundingClientRect().width;
    const startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);

    const leftRect = leftCol.getBoundingClientRect();
    const rightRect = rightCol.getBoundingClientRect();

    const startLeftWidth = leftRect.width;
    const startRightWidth = rightRect.width;
    const combinedWidth = startLeftWidth + startRightWidth;

    const onMouseMove = (moveEvent) => {
        if (!isResizingColumn) return;
        const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : startX);
        const deltaX = currentX - startX;

        // Ancho mínimo por columna dentro del contenedor (130px)
        const minWidth = 130;
        let newLeftWidth = Math.max(minWidth, Math.min(combinedWidth - minWidth, startLeftWidth + deltaX));
        let newRightWidth = combinedWidth - newLeftWidth;

        // Convertir a flex-grow relativo
        const baseWidth = containerWidth / 5;
        const leftFlex = Math.max(0.3, newLeftWidth / baseWidth);
        const rightFlex = Math.max(0.3, newRightWidth / baseWidth);

        leftCol.style.flex = `${leftFlex} 1 0%`;
        rightCol.style.flex = `${rightFlex} 1 0%`;

        const pesos = obtenerPesosColumnasGuardados();
        pesos[catKeyLeft] = leftFlex;
        pesos[catKeyRight] = rightFlex;
        guardarPesosColumnas(pesos);

        // Recalcular autoScroll
        const carouselLeft = leftCol.querySelector('[id^="carrusel-cat-"]');
        const carouselRight = rightCol.querySelector('[id^="carrusel-cat-"]');
        if (carouselLeft && typeof inicializarAutoScroll === 'function') inicializarAutoScroll(carouselLeft.id);
        if (carouselRight && typeof inicializarAutoScroll === 'function') inicializarAutoScroll(carouselRight.id);
    };

    const onMouseUp = () => {
        isResizingColumn = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
}

function cambiarVista(vista) {
    vistaActual = vista;
    const tabIds = ['btn-todas', 'btn-archivo', 'btn-mis_novedades', 'btn-menciones'];
    const activeClass = 'flex-1 px-4 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-lg shadow-sm transition-all duration-200 text-center whitespace-nowrap';
    const inactiveClass = 'flex-1 px-4 py-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 text-center whitespace-nowrap';
    
    tabIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = (id === 'btn-' + vista) ? activeClass : inactiveClass;
    });
    renderizar();
}

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

let dropEjecutado = false;

function normalizarServicio(srv) {
    if (!srv) return 'S/A';
    let clean = String(srv).toUpperCase().trim();
    if (clean === 'LIV.' || clean === 'LIV') return 'LIVIANO';
    if (clean === 'MET') return 'METANOL';
    return clean;
}

function iniciarDragCard(e, cardId) {
    cardSeleccionadaId = cardId;
    dropEjecutado = false;
    if (e && e.dataTransfer) {
        e.dataTransfer.setData('text/plain', String(cardId));
        e.dataTransfer.effectAllowed = 'move';
    }
    setTimeout(() => {
        mostrarServiceOverlay(cardId);
    }, 20);
}

function finalizarDragCard(e) {
    setTimeout(() => {
        if (!dropEjecutado) {
            ocultarServiceOverlay();
        }
    }, 100);
}

function permitirDrop(e) {
    if (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }
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

function resolver(id, nuevoServicio = null) {
    if (typeof esModoCartelera === 'function' && esModoCartelera()) return;
    if (typeof vistaActual !== 'undefined' && vistaActual === 'archivo') return;
    
    let nov = (typeof RAM_Novedades !== 'undefined' ? RAM_Novedades : []).find(n => String(n.id) === String(id));
    if (!nov) return;
    
    nov.resuelto = true;
    nov.fecha_resolucion = new Date().toISOString();
    if (nuevoServicio) {
        nov.servicio = nuevoServicio;
    }
    
    if (typeof renderizar === 'function') renderizar();
    
    const payloadBody = {
        action: 'resolver',
        id_novedad: id,
        payload: {
            resuelto: true,
            fecha_resolucion: nov.fecha_resolucion,
            ...(nuevoServicio ? { servicio: nuevoServicio } : {})
        }
    };

    fetch(`${API_URL}/api/dash/novedades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody)
    }).catch(e => console.error("Error al resolver novedad:", e));
}

function ejecutarDropServicio(e, servicio) {
    if (e) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    dropEjecutado = true;
    const cardId = cardSeleccionadaId || (e && e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    ocultarServiceOverlay();
    if (cardId) {
        resolver(cardId, servicio);
    }
}

function cancelarDropZone(e) {
    if (e) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    ocultarServiceOverlay();
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
function restablecerAnchoSeccion(catKey, event) {
    if (event) event.stopPropagation();
    try {
        const str = localStorage.getItem('column_section_widths');
        if (str) {
            const widths = JSON.parse(str);
            delete widths[catKey];
            localStorage.setItem('column_section_widths', JSON.stringify(widths));
        }
    } catch(e) {}
    renderizar();
}

    const resueltasTodas = RAM_Novedades.filter(n => n.resuelto).sort((a, b) => b.id - a.id);
    const gridViewClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full h-full min-h-0 overflow-y-auto custom-scrollbar p-1 items-start content-start flex-1";

    if (vistaActual === 'archivo') {
        if (resueltasTodas.length === 0) {
            container.innerHTML = `<div class="col-span-full h-64 flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 opacity-80"><svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="font-extrabold tracking-widest uppercase text-xs">Sin historial de resueltos</span></div>`;
            return;
        }

        let htmlResueltos = `<div class="${gridViewClass}">`;
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
        let htmlMis = `<div class="${gridViewClass}">`;
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
        let htmlMenciones = `<div class="${gridViewClass}">`;
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

    const columnClass = "flex flex-col gap-3.5 overflow-y-auto custom-scrollbar pr-1.5 pb-2 h-full min-h-0 flex-1";
    const carouselClass = "flex gap-4 overflow-x-auto pb-2 pt-1 custom-scrollbar items-center w-full flex-1";

    // RENDERIZAR LIBRES PRIMERO (HORIZONTAL TOP)
    let carouselIdLibres = `carrusel-cat-libres`;
    idsCarruseles.push(carouselIdLibres);

    htmlFinal += `
    <section class="w-full mb-3 shrink-0">
        <div class="flex items-center gap-3 w-full">
            <div class="relative shrink-0 flex items-center justify-center h-[65px]">
                <button id="btn-quick-libre" onclick="toggleQuickAddLibre()" class="w-[65px] h-full rounded-xl border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all flex items-center justify-center group focus:outline-none shadow-sm cursor-pointer z-10 bg-white dark:bg-slate-900" title="Agregar Libre Rápido">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
                <div id="quick-add-libre-dropdown" class="hidden absolute top-[75px] left-0 w-72 md:w-80 bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                    <input type="text" id="quick-input-nom" placeholder="BUSCAR PARA LIBERAR..." class="w-full bg-transparent p-3 text-sm font-black text-slate-800 dark:text-slate-200 outline-none uppercase border-b border-slate-100 dark:border-slate-800 placeholder-slate-400" autocomplete="off" oninput="filtrarQuickChoferes()" onfocus="filtrarQuickChoferes()">
                    <div id="quick-dropdown-choferes" class="max-h-64 overflow-y-auto custom-scrollbar"></div>
                </div>
            </div>
            <div id="${carouselIdLibres}" class="${carouselClass}">`;
            
    categorias['LIBRES'].items.forEach(n => { htmlFinal += generarHtmlCard(n); });
    htmlFinal += `</div></div></section>`;

    // RENDERIZAR COLUMNAS KANBAN PROPORCIONALES (CONTENIDAS 100% EN PANTALLA)
    htmlFinal += `<div id="kanban-columns-wrapper" class="flex gap-2 md:gap-3 w-full h-full min-h-0 flex-1 overflow-hidden items-stretch">`;
    
    const visibleKeys = Object.keys(categorias).filter(k => k !== 'LIBRES' && (k === 'CERTIFICACION_UNIDAD' || categorias[k].items.length > 0));
    const pesosGuardados = obtenerPesosColumnasGuardados();

    visibleKeys.forEach((key, index) => {
        const cat = categorias[key];
        let carouselId = `carrusel-cat-${index}`;
        idsCarruseles.push(carouselId);

        const flexWeight = pesosGuardados[key] || 1;
        const styleAttr = `style="flex: ${flexWeight} 1 0%; min-width: 130px;"`;

        htmlFinal += `
        <section data-cat="${key}" ${styleAttr} class="resizable-column flex-1 border-2 border-dashed ${cat.borderColor} rounded-2xl p-3 bg-transparent flex flex-col h-full min-h-0 overflow-hidden transition-all duration-100 relative">
            <div class="w-full mb-2 shrink-0 flex items-center justify-center pb-1 border-b border-slate-200/40 dark:border-slate-800/40">
                <h2 class="text-[11px] font-black uppercase tracking-widest ${cat.colorText} text-center flex-1 select-none truncate">
                    ${cat.titulo}
                </h2>
            </div>`;

        const esCartelera = typeof esModoCartelera === 'function' && esModoCartelera();

        if (key === 'CERTIFICACION_UNIDAD' && subVistaCertificaciones === 'lista' && !esCartelera) {
            const listaVenc = (typeof obtenerListaCertificacionesUnidad === 'function') ? obtenerListaCertificacionesUnidad() : [];
            if (listaVenc.length === 0) {
                htmlFinal += `<div id="${carouselId}" class="${columnClass} justify-center items-center"><span class="text-slate-400 text-xs font-bold opacity-70">Sin vencimientos a 1 semana ni vencidos</span></div>`;
            } else {
                htmlFinal += `<div id="${carouselId}" class="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 pb-2 flex-1 min-h-0">`;
                listaVenc.forEach(v => {
                    const colorFecha = v.estado === 'VENCIDO' ? 'text-red-500 font-extrabold' : 'text-amber-400 font-extrabold';
                    htmlFinal += `
                    <div class="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:bg-slate-800/90 transition-colors gap-2 shrink-0">
                        <div class="flex items-center gap-2 truncate flex-1 min-w-0">
                            <span class="font-black text-indigo-400 cursor-pointer hover:underline text-[12px] shrink-0" onclick="copiarPatente('${v.tractor}', event)" title="Haz clic para copiar patente">${v.tractor}</span>
                            <span class="font-black text-slate-100 text-[11px] shrink-0">${v.label}</span>
                            <span class="${colorFecha} text-[11px] shrink-0">${v.fecha}</span>
                            <span class="text-slate-300 font-bold truncate text-[11px] flex-1 min-w-0">${v.chofer || '-'}</span>
                        </div>
                        <button onclick="gestionarNovedadVencimiento('${(v.chofer || '').replace(/'/g, "\\'")}', '${v.tractor}', '${v.label}', event)" class="btn-card-edit w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all duration-150 focus:outline-none flex items-center justify-center bg-slate-800 hover:text-indigo-400 text-slate-400 cursor-pointer active:scale-95 ml-1" title="Modificar o crear novedad para ${v.label}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    </div>`;
                });
                htmlFinal += `</div>`;
            }
        } else {
            htmlFinal += `<div id="${carouselId}" class="${columnClass}">`;
            if (cat.items.length === 0) {
                htmlFinal += `<div class="flex-1 flex justify-center items-center text-slate-400 text-xs font-bold opacity-70">Sin novedades cargadas</div>`;
            } else {
                cat.items.forEach(n => { htmlFinal += generarHtmlCard(n); });
            }
            htmlFinal += `</div>`;
        }

        // Puntos de conmutación (DOTS ⚪ ⚪) en el pie de CERTIFICACIONES DE UNIDAD (OCULTOS EN CARTELERA)
        if (key === 'CERTIFICACION_UNIDAD' && !esCartelera) {
            htmlFinal += `
            <div class="w-full shrink-0 flex items-center justify-center gap-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-auto">
                <button type="button" onclick="cambiarSubVistaCertificaciones('lista', event)" class="w-3 h-3 rounded-full transition-all cursor-pointer ${subVistaCertificaciones === 'lista' ? 'bg-white scale-125 shadow-md shadow-white/40' : 'bg-slate-600 hover:bg-slate-400'}" title="Ver Lista de Vencimientos (VTV/MASS)"></button>
                <button type="button" onclick="cambiarSubVistaCertificaciones('cards', event)" class="w-3 h-3 rounded-full transition-all cursor-pointer ${subVistaCertificaciones === 'cards' ? 'bg-white scale-125 shadow-md shadow-white/40' : 'bg-slate-600 hover:bg-slate-400'}" title="Ver Tarjetas de Novedades"></button>
            </div>`;
        }

        htmlFinal += `</section>`;

        // Si no es la última columna, insertar divisor redimensionable (splitter)
        if (index < visibleKeys.length - 1) {
            const nextKey = visibleKeys[index + 1];
            htmlFinal += `
            <div onmousedown="iniciarResizingColumna(event, '${key}', '${nextKey}')" ontouchstart="iniciarResizingColumna(event, '${key}', '${nextKey}')" class="col-splitter w-2.5 h-full cursor-col-resize shrink-0 flex items-center justify-center group z-20 hover:bg-indigo-500/20 active:bg-indigo-500/40 transition-colors rounded-full -mx-1" title="Arrastrar para ajustar proporción de columnas">
                <div class="w-0.5 h-8 bg-slate-400/40 group-hover:bg-indigo-400 rounded-full transition-colors"></div>
            </div>`;
        }
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
    
    try {
        const formatter = new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const partes = formatter.formatToParts(d);
        let dia = '', mes = '', hh = '', mm = '';
        partes.forEach(p => {
            if (p.type === 'day') dia = p.value;
            if (p.type === 'month') mes = p.value.replace('.', '');
            if (p.type === 'hour') hh = p.value;
            if (p.type === 'minute') mm = p.value;
        });
        return `${dia} ${mes} ${hh}:${mm}`;
    } catch(e) {
        const dia = d.getDate();
        const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const mes = meses[d.getMonth()];
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${dia} ${mes} ${hh}:${mm}`;
    }
}

function copiarPatente(texto, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if (!texto || texto === 'S/D' || texto === '-') return;

    navigator.clipboard.writeText(texto).then(() => {
        let el = event ? event.currentTarget : null;
        if (el) {
            let originalHtml = el.innerHTML;
            el.innerHTML = `<span class="text-emerald-700 dark:text-emerald-400 font-black animate-pulse">✓ COPIADO</span>`;
            setTimeout(() => {
                el.innerHTML = originalHtml;
            }, 1200);
        }
    }).catch(err => {
        console.error('Error al copiar patente:', err);
    });
}

function generarHtmlCard(n) {
    let timeFormatted = formatearTimestamp(n.timestamp, n.id);
    
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



    if (n.tipo_novedad === 'LIBRES') {
        let tieneDetalle = n.detalle && n.detalle.trim().length > 0;
        let cardHeight = tieneDetalle ? 'min-h-[90px] py-3' : 'min-h-[85px] py-2.5';
        return `
        <article id="card-${n.id}" draggable="true" ondragstart="iniciarDragCard(event, ${n.id})" ondragend="finalizarDragCard(event)" class="rounded-xl p-3 relative transition-all duration-300 w-[300px] shrink-0 flex flex-col justify-between shadow-sm hover:shadow-md bg-[#00FFFF] border-0 cursor-grab active:cursor-grabbing ${cardHeight}">
            <div class="card-inner-content flex flex-col w-full transition-opacity duration-200">
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

                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="bg-black text-white px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase">${srvFinal}</span>
                    ${uteBadge ? `<span class="border border-black rounded px-1.5 py-0.5 text-[10px] font-black text-black leading-none">${uteBadge}</span>` : ''}
                    <span onclick="copiarPatente('${(tractorFinal || '').replace(/'/g, "\\'")}', event)" class="text-[12px] font-extrabold text-black tracking-wide cursor-pointer hover:bg-black/10 px-1 py-0.5 rounded transition-all active:scale-95 flex items-center gap-1" title="Haz clic para copiar patente">
                        ${tractorFinal}
                        <svg class="w-3 h-3 opacity-60 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </span>
                    ${obtenerHtmlButtonTerminal(n)}
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

            ${obtenerHtmlButtonTerminal(n) ? obtenerHtmlDropdownTerminal(n) : ''}
        </article>`;
    }

    let cfg = { bg: 'bg-slate-50/50 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200/50 dark:border-slate-700/50' };
    if (n.tipo_novedad === 'BAJA_DIAGRAMA') cfg = { bg: 'bg-red-50/50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-500', border: 'border-red-200/50 dark:border-red-900/30' };
    if (n.tipo_novedad === 'CERTIFICACION_UNIDAD') cfg = { bg: 'bg-orange-50/50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-500', border: 'border-orange-200/50 dark:border-orange-900/30' };
    if (n.tipo_novedad === 'EXAMEN_CHOFER') cfg = { bg: 'bg-emerald-50/50 dark:emerald-950/20', text: 'text-emerald-600 dark:text-emerald-500', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
    if (n.tipo_novedad === 'REPARACION') cfg = { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-500', border: 'border-indigo-200/50 dark:border-indigo-900/30' };
    if (n.tipo_novedad === 'ESTADO_DEMORA') cfg = { bg: 'bg-[#D28976]/10 dark:bg-[#D28976]/20', text: 'text-[#D28976]', border: 'border-[#D28976]/30' };

    let cardClass = n.resuelto 
        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30 opacity-75 grayscale-[0.1]" 
        : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800/80 shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-colors";

    return `
    <article id="card-${n.id}" class="rounded-xl border p-4 relative transition-all duration-300 w-full flex flex-col shrink-0 ${cardClass}">
        <div class="flex flex-col w-full mb-2">
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

            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border border-slate-200 dark:border-slate-700/50">${srvFinal}</span>
                ${uteBadge ? `<span class="border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase">${uteBadge}</span>` : ''}
                <span onclick="copiarPatente('${(tractorFinal || '').replace(/'/g, "\\'")}', event)" class="text-[11px] font-bold ${n.resuelto ? 'text-emerald-600 dark:text-emerald-500' : 'text-indigo-500 dark:text-indigo-400'} tracking-wide cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-800 px-1 py-0.5 rounded transition-all active:scale-95 inline-flex items-center gap-1" title="Haz clic para copiar patente">
                    ${tractorFinal}
                    <svg class="w-3 h-3 opacity-60 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </span>
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
    
    let nov = (RAM_Novedades || []).find(n => String(n.id) === String(id));
    if (!nov) return;

    // srv permanece 100% INTACTO (no se modifica)
    const srvOriginal = nov.srv || 'S/A';

    // servicio se asigna ÚNICAMENTE si viene del drop zone
    const servicioDrop = nuevoServicio ? normalizarServicio(nuevoServicio) : (nov.servicio || '');

    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.add('fade-out');
        
        setTimeout(() => {
            let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
            if (idx > -1) {
                RAM_Novedades[idx].resuelto = true;
                RAM_Novedades[idx].srv = srvOriginal; // sin modificar
                if (nuevoServicio) {
                    RAM_Novedades[idx].servicio = servicioDrop; // asignación del drop
                }
                RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
            }
            renderizar();
        }, 150);
    } else {
        let idx = RAM_Novedades.findIndex(n => String(n.id) === String(id));
        if (idx > -1) {
            RAM_Novedades[idx].resuelto = true;
            RAM_Novedades[idx].srv = srvOriginal; // sin modificar
            if (nuevoServicio) {
                RAM_Novedades[idx].servicio = servicioDrop; // asignación del drop
            }
            RAM_Novedades[idx].fecha_resolucion = new Date().toISOString();
        }
        renderizar();
    }

    const payload = {
        nom: nov.nom || '',
        tractor: nov.tractor || '',
        srv: srvOriginal,          // srv intacto (sin modificar)
        servicio: servicioDrop,   // impreso en la propiedad servicio del JSON (Header SERVICIO)
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'resolver', id_novedad: String(id), payload: payload }) 
    }).catch(e => console.error("Error al persistir resolución:", e));
}

// =========================================================
// QUICK ADD LIBRE (Acceso Rápido en Vía Primaria)
// =========================================================
function toggleQuickAddLibre() {
    if (typeof esModoCartelera === 'function' && esModoCartelera()) return;
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
