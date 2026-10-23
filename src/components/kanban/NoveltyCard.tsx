import React, { useState, useRef, useEffect } from 'react';
import { Novedad, Usuario } from '../../types/dash';
import { useDashStore } from '../../store/useDashStore';

interface NoveltyCardProps {
  novedad: Novedad;
  usuarios: Usuario[];
  onResolver: (id: number | string, nuevoServicio?: string) => void;
  onEditar?: (novedad: Novedad) => void;
  onCambiarTerminal?: (id: number | string, terminal: string) => void;
  onCambiarServicio?: (id: number | string, servicio: string) => void;
  onAgregarMencion?: (id: number | string, usuario: string) => void;
  onQuitarMencion?: (id: number | string, usuario: string) => void;
}

const CONFIG_TERMINALES: Record<string, { bg: string; text: string }> = {
  'DOCK SUD': { bg: '#DD7E6B', text: '#000000' },
  'TLC': { bg: '#920E61', text: '#FFFFFF' },
  'TPH': { bg: '#A4C2F4', text: '#000000' },
  'AÑELO': { bg: '#DECBC6', text: '#000000' }
};

const CONFIG_SERVICIOS: Record<string, { bg: string; text: string }> = {
  'TDS': { bg: '#10B981', text: '#FFFFFF' },
  'CM': { bg: '#3B82F6', text: '#FFFFFF' },
  'PP': { bg: '#8B5CF6', text: '#FFFFFF' },
  'EURO': { bg: '#F59E0B', text: '#FFFFFF' },
  'MET': { bg: '#EC4899', text: '#FFFFFF' },
  'LIV.': { bg: '#06B6D4', text: '#FFFFFF' },
  'LIVIANO': { bg: '#06B6D4', text: '#FFFFFF' }
};

export const NoveltyCard: React.FC<NoveltyCardProps> = ({
  novedad,
  usuarios,
  onResolver,
  onEditar,
  onCambiarTerminal,
  onCambiarServicio,
  onAgregarMencion,
  onQuitarMencion
}) => {
  const { modoCartelera, setActiveDragCardId, terminales } = useDashStore();
  const [copiadoPatente, setCopiadoPatente] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  // Dropdowns contextuales
  const [dropTerminalAbierto, setDropTerminalAbierto] = useState(false);
  const [dropServicioAbierto, setDropServicioAbierto] = useState(false);
  const [dropMencionAbierto, setDropMencionAbierto] = useState(false);
  const [textoMencion, setTextoMencion] = useState('');

  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setDropTerminalAbierto(false);
        setDropServicioAbierto(false);
        setDropMencionAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCopiarPatente = (e: React.MouseEvent, texto?: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!texto || texto === 'S/D' || texto === '-') return;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoPatente(true);
      setTimeout(() => setCopiadoPatente(false), 1200);
    });
  };

  const handleResolverClick = () => {
    if (modoCartelera || novedad.resuelto) return;
    setFadingOut(true);
    setTimeout(() => {
      onResolver(novedad.id);
    }, 150);
  };

  const formatearFecha = (ts?: string, id?: string | number) => {
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
      return formatter.format(d);
    } catch {
      return '';
    }
  };

  const usuariosFiltrados = usuarios
    .map((u) => u.usuario.toUpperCase())
    .filter(
      (u) =>
        u.includes(textoMencion.toUpperCase()) &&
        !(novedad.menciones || []).includes(u)
    )
    .slice(0, 5);

  const esLibre = novedad.tipo_novedad === 'LIBRES';
  const termCfg = CONFIG_TERMINALES[(novedad.terminal || '').toUpperCase().trim()];
  const srvCfg = CONFIG_SERVICIOS[(novedad.srv || novedad.servicio || '').toUpperCase().trim()];

  // ==========================================
  // RENDER: TARJETA TIPO "LIBRES" (CYAN #00FFFF)
  // ==========================================
  if (esLibre) {
    const tieneDetalle = novedad.detalle && novedad.detalle.trim().length > 0;
    return (
      <article
        ref={cardRef}
        id={`card-${novedad.id}`}
        draggable={!modoCartelera}
        onDragStart={(e) => {
          if (modoCartelera) return;
          e.dataTransfer.setData('text/plain', String(novedad.id));
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => {
            setActiveDragCardId(novedad.id);
          }, 30);
        }}
        className={`rounded-xl p-3 relative transition-all duration-300 w-max min-w-[340px] max-w-[440px] shrink-0 flex flex-col justify-between shadow-sm hover:shadow-md bg-[#00FFFF] border-0 select-none ${
          modoCartelera ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        } ${tieneDetalle ? 'min-h-[90px] py-3' : 'min-h-[85px] py-2.5'} ${
          fadingOut ? 'fade-out' : ''
        }`}
      >
        <div className="card-inner-content flex flex-col w-full">
          {/* Header de tarjeta: Conductor + Botones */}
          <div className="flex items-start justify-between w-full -mt-0.5 mb-1">
            <h3 className="font-extrabold text-black text-[14px] leading-tight uppercase truncate tracking-tight flex-1 pr-1">
              {novedad.nom || 'SIN CONDUCTOR'}
            </h3>

            {!modoCartelera && (
              <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                {onEditar && (
                  <button
                    onClick={() => onEditar(novedad)}
                    className="btn-card-edit w-7 h-7 rounded-lg shrink-0 transition-all flex items-center justify-center text-black/70 hover:text-black hover:bg-black/10 cursor-pointer active:scale-95 text-xs font-bold"
                    title="Editar detalle"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={handleResolverClick}
                  disabled={novedad.resuelto}
                  className={`btn-card-resolve w-7 h-7 rounded-lg shrink-0 transition-all flex items-center justify-center text-black/70 hover:text-black hover:bg-black/10 text-xs font-bold ${
                    novedad.resuelto ? 'cursor-default' : 'cursor-pointer active:scale-95'
                  }`}
                  title={novedad.resuelto ? 'Ocupado' : 'Asignar / Ocupar'}
                >
                  ✓
                </button>
              </div>
            )}
          </div>

          {/* Badges operativos (Servicio, UTE, Tractor, Cisternado, Terminal) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap w-max text-xs">
            {/* Servicio */}
            <span className="bg-black text-white px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase shrink-0">
              {novedad.srv || novedad.servicio || 'S/A'}
            </span>

            {/* UTE */}
            {novedad.n_ute && novedad.n_ute !== 'S/D' && (
              <span className="border border-black rounded px-1.5 py-0.5 text-[10px] font-black text-black leading-none shrink-0">
                {novedad.n_ute}
              </span>
            )}

            {/* Tractor con Copia */}
            <span
              onClick={(e) => handleCopiarPatente(e, novedad.tractor)}
              className="text-[12px] font-extrabold text-black tracking-wide cursor-pointer hover:bg-black/10 px-1 py-0.5 rounded transition-all active:scale-95 flex items-center gap-1 shrink-0"
              title="Haz clic para copiar patente"
            >
              {copiadoPatente ? (
                <span className="font-black text-emerald-800 animate-pulse">✓ COPIADO</span>
              ) : (
                <>
                  <span>{novedad.tractor || 'S/D'}</span>
                  <span className="text-[10px] opacity-60">📋</span>
                </>
              )}
            </span>

            {/* Cisternado */}
            {novedad.cisternado && (
              <span className="text-[11px] font-black text-black tracking-tight select-all shrink-0">
                {novedad.cisternado}
              </span>
            )}

            {/* Selector Terminal */}
            <div className="relative">
              {termCfg ? (
                <button
                  type="button"
                  onClick={() => !modoCartelera && setDropTerminalAbierto(!dropTerminalAbierto)}
                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap"
                  style={{ backgroundColor: termCfg.bg, color: termCfg.text }}
                >
                  {novedad.terminal}
                </button>
              ) : (
                !modoCartelera && (
                  <button
                    type="button"
                    onClick={() => setDropTerminalAbierto(!dropTerminalAbierto)}
                    className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black/10 text-slate-800 hover:bg-black/20 transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    + TERMINAL
                  </button>
                )
              )}

              {dropTerminalAbierto && !modoCartelera && (
                <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 w-32 animate-in fade-in duration-100">
                  {Object.keys(CONFIG_TERMINALES).map((t) => {
                    const c = CONFIG_TERMINALES[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setDropTerminalAbierto(false);
                          onCambiarTerminal?.(novedad.id, t);
                        }}
                        className="px-2 py-1 rounded text-[9px] font-black uppercase text-left transition-transform active:scale-95 cursor-pointer"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {t}
                      </button>
                    );
                  })}
                  {novedad.terminal && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropTerminalAbierto(false);
                        onCambiarTerminal?.(novedad.id, '');
                      }}
                      className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-200 text-slate-700 hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      ✕ Quitar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detalle */}
          {tieneDetalle && (
            <div className="mt-2 bg-black/10 rounded-lg p-2.5 overflow-y-auto custom-scrollbar max-h-24">
              <p className="text-black text-xs font-bold font-zilla leading-tight whitespace-pre-line break-words">
                {novedad.detalle}
              </p>
            </div>
          )}

          {/* Footer: Creador, Menciones, Timestamp */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-black uppercase mt-2">
            <span className="flex items-center gap-1 shrink-0">
              <span>👤</span>
              <span>{novedad.creador || novedad.usuario || 'USER'}</span>
            </span>

            {/* Menciones inline */}
            {!modoCartelera && (
              <div className="relative inline-block mention-input-wrapper">
                <input
                  type="text"
                  value={textoMencion}
                  onChange={(e) => {
                    setTextoMencion(e.target.value);
                    setDropMencionAbierto(true);
                  }}
                  onFocus={() => setDropMencionAbierto(true)}
                  placeholder="@"
                  className="bg-black/10 border-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-black w-14 outline-none focus:bg-black/20 focus:w-20 transition-all placeholder:text-black/40"
                />

                {dropMencionAbierto && usuariosFiltrados.length > 0 && (
                  <div className="absolute z-50 bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-32 overflow-y-auto w-36 p-1">
                    {usuariosFiltrados.map((u) => (
                      <div
                        key={u}
                        onClick={() => {
                          onAgregarMencion?.(novedad.id, u);
                          setTextoMencion('');
                          setDropMencionAbierto(false);
                        }}
                        className="px-2 py-1 text-xs font-black text-slate-800 hover:bg-indigo-50 rounded cursor-pointer uppercase"
                      >
                        @{u}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Badges de menciones activas */}
            {(novedad.menciones || []).map((m) => (
              <span
                key={m}
                className="bg-black/20 text-black px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1"
              >
                @{m}
                {!modoCartelera && onQuitarMencion && (
                  <button
                    onClick={() => onQuitarMencion(novedad.id, m)}
                    className="btn-mention-remove ml-1 hover:text-red-700 transition-colors font-black text-xs cursor-pointer"
                    title="Quitar mención"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}

            <span className="text-black/60 font-bold tracking-wide ml-auto">
              {formatearFecha(novedad.timestamp || novedad.creado_el, novedad.id)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // ==========================================
  // RENDER: TARJETAS KANBAN ESTÁNDAR
  // ==========================================
  let cfg = {
    bg: 'bg-slate-50/50 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200/50 dark:border-slate-700/50'
  };
  if (novedad.tipo_novedad === 'BAJA_DIAGRAMA')
    cfg = { bg: 'bg-red-50/50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-500', border: 'border-red-200/50 dark:border-red-900/30' };
  if (novedad.tipo_novedad === 'CERTIFICACION_UNIDAD')
    cfg = { bg: 'bg-orange-50/50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-500', border: 'border-orange-200/50 dark:border-orange-900/30' };
  if (novedad.tipo_novedad === 'EXAMEN_CHOFER')
    cfg = { bg: 'bg-emerald-50/50 dark:emerald-950/20', text: 'text-emerald-600 dark:text-emerald-500', border: 'border-emerald-200/50 dark:border-emerald-900/30' };
  if (novedad.tipo_novedad === 'REPARACION')
    cfg = { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-500', border: 'border-indigo-200/50 dark:border-indigo-900/30' };
  if (novedad.tipo_novedad === 'ESTADO_DEMORA')
    cfg = { bg: 'bg-[#D28976]/10 dark:bg-[#D28976]/20', text: 'text-[#D28976]', border: 'border-[#D28976]/30' };

  return (
    <article
      ref={cardRef}
      id={`card-${novedad.id}`}
      className={`rounded-xl border p-4 relative transition-all duration-300 w-full flex flex-col shrink-0 select-none ${
        novedad.resuelto
          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30 opacity-75'
          : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800/80 shadow-none hover:border-slate-300 dark:hover:border-slate-700'
      } ${fadingOut ? 'fade-out' : ''}`}
    >
      <div className="flex flex-col w-full mb-2">
        {/* Header: Conductor y Acciones */}
        <div className="flex items-start justify-between w-full -mt-1 mb-1">
          <h3
            className={`font-extrabold ${
              novedad.resuelto
                ? 'text-emerald-900 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white'
            } text-sm sm:text-base leading-tight uppercase truncate flex-1 pr-2 tracking-tight`}
          >
            {novedad.nom || 'SIN CONDUCTOR'}
          </h3>

          {!modoCartelera && (
            <div className="flex items-center gap-1.5 shrink-0 -mt-1 -mr-1">
              <button
                onClick={handleResolverClick}
                disabled={novedad.resuelto}
                className={`btn-card-resolve w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all flex items-center justify-center ${
                  novedad.resuelto
                    ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 cursor-pointer active:scale-95'
                }`}
                title={novedad.resuelto ? 'Resuelto' : 'Marcar como resuelto'}
              >
                <span className="font-black text-xs">✓</span>
              </button>

              {onEditar && (
                <button
                  onClick={() => onEditar(novedad)}
                  className="btn-card-edit w-7 h-7 rounded-lg border border-transparent shrink-0 transition-all flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:text-indigo-500 dark:hover:text-indigo-400 text-slate-400 dark:text-slate-500 cursor-pointer active:scale-95 text-xs"
                  title="Editar detalle"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {/* Badges operativos (Servicio, UTE, Tractor, Fecha Objetivo) */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {/* Dropdown Servicio */}
          <div className="relative">
            {srvCfg ? (
              <button
                type="button"
                onClick={() => !modoCartelera && setDropServicioAbierto(!dropServicioAbierto)}
                className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
                style={{ backgroundColor: srvCfg.bg, color: srvCfg.text }}
                title="Cambiar Servicio"
              >
                {novedad.srv || novedad.servicio}
              </button>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border border-slate-200 dark:border-slate-700/50">
                {novedad.srv || 'S/A'}
              </span>
            )}

            {dropServicioAbierto && !modoCartelera && (
              <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 w-28 animate-in fade-in duration-100">
                {['TDS', 'CM', 'PP', 'EURO', 'MET', 'LIV.'].map((s) => {
                  const c = CONFIG_SERVICIOS[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setDropServicioAbierto(false);
                        onCambiarServicio?.(novedad.id, s);
                      }}
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-left cursor-pointer"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* UTE */}
          {novedad.n_ute && novedad.n_ute !== 'S/D' && (
            <span className="border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase">
              {novedad.n_ute}
            </span>
          )}

          {/* Tractor con Clic para Copiar */}
          <span
            onClick={(e) => handleCopiarPatente(e, novedad.tractor)}
            className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 tracking-wide cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-800 px-1 py-0.5 rounded transition-all active:scale-95 inline-flex items-center gap-1"
            title="Haz clic para copiar patente"
          >
            {copiadoPatente ? (
              <span className="text-emerald-500 font-black animate-pulse">✓ COPIADO</span>
            ) : (
              <>
                <span>{novedad.tractor || 'S/D'}</span>
                <span className="opacity-60 text-[9px]">📋</span>
              </>
            )}
          </span>

          {/* Fecha Objetivo */}
          {novedad.fecha_objetivo && (
            <span
              className={`px-1.5 py-0.5 text-[9px] font-black ${cfg.text} whitespace-nowrap rounded border ${cfg.border}`}
            >
              📅 {novedad.fecha_objetivo.split('-').reverse().join('/')}
            </span>
          )}

          {/* Selector Terminal */}
          <div className="relative">
            {termCfg ? (
              <button
                type="button"
                onClick={() => !modoCartelera && setDropTerminalAbierto(!dropTerminalAbierto)}
                className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
                style={{ backgroundColor: termCfg.bg, color: termCfg.text }}
              >
                {novedad.terminal}
              </button>
            ) : (
              !modoCartelera && (
                <button
                  type="button"
                  onClick={() => setDropTerminalAbierto(!dropTerminalAbierto)}
                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-all flex items-center gap-1 cursor-pointer"
                >
                  + TERM
                </button>
              )
            )}

            {dropTerminalAbierto && !modoCartelera && (
              <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 w-32 animate-in fade-in duration-100 max-h-48 overflow-y-auto custom-scrollbar">
                {(terminales && terminales.length > 0
                  ? terminales.map(t => t.codigo)
                  : Object.keys(CONFIG_TERMINALES)
                ).map((t) => {
                  const c = CONFIG_TERMINALES[t] || { bg: '#475569', text: '#FFFFFF' };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setDropTerminalAbierto(false);
                        onCambiarTerminal?.(novedad.id, t);
                      }}
                      className="px-2 py-1 rounded text-[9px] font-black uppercase text-left cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detalle */}
      {novedad.detalle && novedad.detalle.trim() && (
        <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-3 mb-3`}>
          <p
            className={`${cfg.text} text-xs font-semibold font-zilla leading-relaxed whitespace-pre-wrap break-words`}
          >
            {novedad.detalle}
          </p>
        </div>
      )}

      {/* Footer: Creador, Menciones, Timestamp */}
      <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-auto">
        <span className="uppercase flex items-center gap-1 shrink-0" title="Creador">
          👤 {novedad.creador || novedad.usuario || 'Anónimo'}
        </span>

        {/* Input Menciones Inline */}
        {!modoCartelera && (
          <div className="relative inline-block mention-input-wrapper">
            <input
              type="text"
              value={textoMencion}
              onChange={(e) => {
                setTextoMencion(e.target.value);
                setDropMencionAbierto(true);
              }}
              onFocus={() => setDropMencionAbierto(true)}
              placeholder="@"
              className="bg-transparent border border-dashed border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 w-16 outline-none focus:border-indigo-400 focus:w-24 transition-all placeholder:text-slate-400"
            />

            {dropMencionAbierto && usuariosFiltrados.length > 0 && (
              <div className="absolute z-50 bottom-full left-0 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-h-32 overflow-y-auto w-36 p-1">
                {usuariosFiltrados.map((u) => (
                  <div
                    key={u}
                    onClick={() => {
                      onAgregarMencion?.(novedad.id, u);
                      setTextoMencion('');
                      setDropMencionAbierto(false);
                    }}
                    className="px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded cursor-pointer uppercase"
                  >
                    @{u}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menciones Activas */}
        {(novedad.menciones || []).map((m) => (
          <span
            key={m}
            className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1"
          >
            @{m}
            {!modoCartelera && onQuitarMencion && (
              <button
                onClick={() => onQuitarMencion(novedad.id, m)}
                className="btn-mention-remove ml-1 hover:text-rose-500 transition-colors font-black text-xs cursor-pointer"
                title="Quitar mención"
              >
                ✕
              </button>
            )}
          </span>
        ))}

        <span className="shrink-0 flex items-center gap-1 tracking-wider ml-auto">
          🕒 {formatearFecha(novedad.timestamp || novedad.creado_el, novedad.id)}
        </span>
      </div>
    </article>
  );
};
