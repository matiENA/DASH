import React, { useState, useEffect } from 'react';
import { useDashStore } from '../../store/useDashStore';
import { VistaTab } from '../../types/dash';
import { AuthDropdown } from './AuthDropdown';

export const Header: React.FC = () => {
  const { vistaActual, setVistaActual, modoCartelera, toggleModoCartelera } = useDashStore();
  const [horaArgentina, setHoraArgentina] = useState('--:--');
  const [esOscuro, setEsOscuro] = useState(() =>
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
      : true
  );

  useEffect(() => {
    const actualizarReloj = () => {
      try {
        const ahora = new Date();
        const formatter = new Intl.DateTimeFormat('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        setHoraArgentina(formatter.format(ahora));
      } catch {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setHoraArgentina(`${hh}:${mm}`);
      }
    };

    actualizarReloj();
    const interval = setInterval(actualizarReloj, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    const nuevo = !esOscuro;
    setEsOscuro(nuevo);
    if (nuevo) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const tabs: { id: VistaTab; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'archivo', label: 'Archivo' },
    { id: 'mis_novedades', label: 'Mis Novedades' },
    { id: 'menciones', label: '@' }
  ];

  return (
    <header className="glass-header bg-white/85 dark:bg-slate-900/85 px-4 sm:px-8 py-2.5 shadow-sm z-40 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300 sticky top-0">
      <div className="relative flex flex-wrap md:flex-nowrap justify-between items-center w-full gap-4 mx-auto">
        {/* Izquierda: Selector de Vista (Oculto en Modo Cartelera) */}
        {!modoCartelera ? (
          <div className="flex bg-slate-200/60 dark:bg-slate-900/90 p-1 rounded-xl shadow-inner w-full md:w-auto border border-slate-300/40 dark:border-slate-800/80 shrink-0 justify-center gap-0.5 z-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVistaActual(tab.id)}
                className={`flex-1 px-4 py-1.5 font-extrabold text-xs rounded-lg transition-all duration-200 text-center whitespace-nowrap cursor-pointer ${
                  vistaActual === tab.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="w-20 hidden md:block"></div>
        )}

        {/* Centro: Reloj Digital Argentina (24H - Roboto Mono) */}
        <div
          onClick={() => {
            if (modoCartelera) toggleModoCartelera();
          }}
          className={`font-mono font-extrabold tracking-wider shrink-0 select-none drop-shadow-sm flex items-center justify-center transition-all ${
            modoCartelera
              ? 'text-3xl sm:text-4xl text-slate-900 dark:text-white mx-auto cursor-pointer py-1'
              : 'md:absolute md:left-1/2 md:-translate-x-1/2 text-2xl sm:text-3xl text-slate-900 dark:text-white px-4 py-1 cursor-default'
          }`}
          style={{ fontFamily: "'Roboto Mono', monospace" }}
          title={modoCartelera ? 'Modo Cartelera activo: Haz clic para salir' : 'Reloj Argentina 24h'}
        >
          {horaArgentina}
        </div>

        {/* Derecha: Acciones, Switch Cartelera, Modo Oscuro, Auth */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto z-10">
          {/* Botón Modo Cartelera */}
          <button
            onClick={toggleModoCartelera}
            className={`px-3 py-2 rounded-xl transition-all border active:scale-95 shadow-sm text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
              modoCartelera
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Alternar Modo Cartelera (Deshabilita toda edición para TV)"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                modoCartelera
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : 'bg-slate-400'
              }`}
            ></span>
            <span className="hidden sm:inline">Cartelera</span>
          </button>

          {/* Botón Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700/80 transition-all focus:outline-none border border-slate-200/60 dark:border-slate-700/60 active:scale-95 shadow-sm cursor-pointer"
            title="Alternar Modo Oscuro"
          >
            {esOscuro ? (
              <span className="text-base leading-none">☀️</span>
            ) : (
              <span className="text-base leading-none">🌙</span>
            )}
          </button>

          {/* Autenticación (Oculta en Modo Cartelera) */}
          {!modoCartelera && <AuthDropdown />}
        </div>
      </div>
    </header>
  );
};
