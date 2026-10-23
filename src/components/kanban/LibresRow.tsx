import React from 'react';
import { Novedad, FlotaItem, Usuario } from '../../types/dash';
import { QuickAddLibre } from './QuickAddLibre';
import { NoveltyCard } from './NoveltyCard';

interface LibresRowProps {
  novedadesLibres: Novedad[];
  flota: FlotaItem[];
  usuarios: Usuario[];
  onResolver: (id: number | string, nuevoServicio?: string) => void;
  onEditar?: (novedad: Novedad) => void;
  onCambiarTerminal?: (id: number | string, terminal: string) => void;
  onCambiarServicio?: (id: number | string, servicio: string) => void;
  onAgregarMencion?: (id: number | string, usuario: string) => void;
  onQuitarMencion?: (id: number | string, usuario: string) => void;
  onRecargar: () => void;
}

export const LibresRow: React.FC<LibresRowProps> = ({
  novedadesLibres,
  flota,
  usuarios,
  onResolver,
  onEditar,
  onCambiarTerminal,
  onCambiarServicio,
  onAgregarMencion,
  onQuitarMencion,
  onRecargar
}) => {
  return (
    <section className="w-full mb-3 shrink-0">
      <div className="flex items-center gap-3 w-full">
        {/* Botón Quick Add Libre */}
        <QuickAddLibre flota={flota} onNovedadPublicada={onRecargar} />

        {/* Carrusel Horizontal de Tarjetas Libres */}
        <div
          id="carrusel-cat-libres"
          className="flex gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar items-center w-full flex-1 min-h-[90px]"
        >
          {novedadesLibres.length === 0 ? (
            <div className="px-4 py-3 rounded-xl border border-dashed border-cyan-400/50 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider select-none">
              Sin unidades libres actualmente
            </div>
          ) : (
            novedadesLibres.map((nov) => (
              <NoveltyCard
                key={nov.id}
                novedad={nov}
                usuarios={usuarios}
                onResolver={onResolver}
                onEditar={onEditar}
                onCambiarTerminal={onCambiarTerminal}
                onCambiarServicio={onCambiarServicio}
                onAgregarMencion={onAgregarMencion}
                onQuitarMencion={onQuitarMencion}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};
