import React, { useState } from 'react';
import { useDashStore } from '../../store/useDashStore';
import { api } from '../../services/api';

export const AuthDropdown: React.FC = () => {
  const { sesion, setSesion, cerrarSesion } = useDashStore();
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const userSesion = await api.login(usuario.trim().toUpperCase(), password.trim());
      setSesion(userSesion);
      setAbierto(false);
      setUsuario('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  if (sesion && sesion.usuario) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-xs">
        <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1.5">
          <span>👤</span> {sesion.usuario}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase">
          {sesion.rol}
        </span>
        <button
          onClick={cerrarSesion}
          className="text-[10px] font-extrabold text-slate-400 hover:text-rose-500 transition-colors uppercase ml-1 cursor-pointer"
          title="Cerrar Sesión"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
      >
        <span>🔑</span>
        <span>Entrar</span>
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                🔑 Iniciar Sesión
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">DASH Auth</span>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">
                Usuario
              </label>
              <input
                type="text"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Escriba su usuario..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none uppercase shadow-xs"
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                required
              />
            </div>

            {error && (
              <p className="text-[10px] font-bold text-rose-500 text-center mt-0.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-1 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs uppercase tracking-widest p-2.5 rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
