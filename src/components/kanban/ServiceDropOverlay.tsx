import React, { useState } from 'react';
import { useDashStore } from '../../store/useDashStore';
import { ServicioDrop } from '../../types/dash';

interface ServiceDropOverlayProps {
  onAsignarServicioYResolver: (cardId: string | number, servicio: string) => void;
}

export const ServiceDropOverlay: React.FC<ServiceDropOverlayProps> = ({
  onAsignarServicioYResolver
}) => {
  const { overlayServiceAbierto, activeDragCardId, setActiveDragCardId } = useDashStore();
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);

  if (!overlayServiceAbierto || !activeDragCardId) return null;

  const servicios: { id: ServicioDrop; label: string; desc: string }[] = [
    { id: 'CM', label: 'CM', desc: 'Cargas Masivas' },
    { id: 'EURO', label: 'EURO', desc: 'Dock Sud / Euro' },
    { id: 'MET', label: 'MET', desc: 'Metanol' },
    { id: 'LIVIANO', label: 'LIVIANO', desc: 'UTE / Liviano' },
    { id: 'PP', label: 'PP', desc: 'Polipropileno' },
    { id: 'TDS', label: 'TDS', desc: 'Terminal Dock Sud' }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, servicio: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cardId = activeDragCardId;
    setActiveDragCardId(null);
    setHighlightedZone(null);
    if (cardId) {
      onAsignarServicioYResolver(cardId, servicio);
    }
  };

  const handleCancelar = () => {
    setActiveDragCardId(null);
    setHighlightedZone(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[90] flex flex-col justify-center items-center p-6 md:p-12 animate-in fade-in duration-200"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
          Asignar Servicio & Resolver
        </h3>
        <p className="text-xs font-bold text-cyan-400 mt-1 uppercase tracking-wider">
          Suelta la unidad sobre el servicio de destino (o haz clic sobre la opción)
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-6 my-auto"
      >
        {servicios.map((srv) => {
          const isHighlighted = highlightedZone === srv.id;
          return (
            <div
              key={srv.id}
              onDragOver={handleDragOver}
              onDragEnter={() => setHighlightedZone(srv.id)}
              onDragLeave={() => setHighlightedZone(null)}
              onDrop={(e) => handleDrop(e, srv.id)}
              onClick={() => {
                if (activeDragCardId) {
                  onAsignarServicioYResolver(activeDragCardId, srv.id);
                  setActiveDragCardId(null);
                }
              }}
              className={`service-drop-zone border-2 border-dashed rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 shadow-xl group select-none ${
                isHighlighted
                  ? 'border-cyan-400 bg-cyan-500/25 scale-105 shadow-2xl shadow-cyan-500/40'
                  : 'border-slate-500/70 hover:border-cyan-400 hover:bg-cyan-500/20 hover:scale-105'
              }`}
            >
              <span className="text-3xl md:text-5xl font-black tracking-widest text-white group-hover:text-cyan-300 transition-colors">
                {srv.label}
              </span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-200 uppercase tracking-widest mt-2">
                {srv.desc}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleCancelar}
        className="mt-6 px-6 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md active:scale-95"
      >
        Cancelar
      </button>
    </div>
  );
};
