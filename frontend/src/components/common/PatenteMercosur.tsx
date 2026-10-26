import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface PatenteMercosurProps {
  patente?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Formatea una patente argentina según su formato oficial con espaciado:
 * - Mercosur (7 caracteres): XX 000 XX  (ej. AD 337 AV, AH 751 FC)
 * - Pre-Mercosur (6 caracteres): XXX 000  (ej. AAO 123, HQK 842)
 * - Otros: Devuelve la patente normalizada
 */
export function formatearPatente(patenteRaw?: string | null): string {
  if (!patenteRaw) return '';
  const clean = patenteRaw.trim().toUpperCase();
  if (clean === 'S/D' || clean === '-') return clean;

  const stripped = clean.replace(/[\s\-_.]/g, '');

  // Formato Mercosur: 2 letras, 3 dígitos, 2 letras -> XX 000 XX
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(stripped)) {
    return stripped.replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/, '$1 $2 $3');
  }

  // Formato Clásico Pre-Mercosur: 3 letras, 3 dígitos -> XXX 000
  if (/^[A-Z]{3}\d{3}$/.test(stripped)) {
    return stripped.replace(/^([A-Z]{3})(\d{3})$/, '$1 $2');
  }

  // Formato Motos / Histórico: 2 letras, 3 dígitos -> XX 000
  if (/^[A-Z]{2}\d{3}$/.test(stripped)) {
    return stripped.replace(/^([A-Z]{2})(\d{3})$/, '$1 $2');
  }

  return clean;
}

/**
 * Componente de Chapa Patente Mercosur Argentina
 * Réplica 1:1 del diseño oficial:
 * - Borde negro perimetral con esquinas redondeadas
 * - Banda superior azul Mercosur (#003399)
 * - Cuerpo blanco puro con tipografía negra condensada/mono
 * - Espaciado oficial XX 000 XX / XXX 000
 * - Copia rápida al portapapeles con feedback animado
 */
export const PatenteMercosur: React.FC<PatenteMercosurProps> = ({
  patente,
  className = '',
  onClick
}) => {
  const [copiado, setCopiado] = useState(false);

  const cleanPatente = (patente || '').trim().toUpperCase();

  if (!cleanPatente || cleanPatente === 'S/D' || cleanPatente === '-') {
    return (
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-1">
        S/D
      </span>
    );
  }

  const patenteVisible = formatearPatente(cleanPatente);

  const handleCopiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(patenteVisible);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1400);
    onClick?.(e);
  };

  return (
    <div
      onClick={handleCopiar}
      title="Haz clic para copiar patente"
      className={`inline-flex flex-col items-center justify-between bg-white border-[1.5px] border-black rounded-[4px] overflow-hidden shadow-xs cursor-pointer select-all transition-all duration-150 active:scale-95 hover:shadow-sm shrink-0 ${className}`}
      style={{
        minWidth: '68px',
        height: '24px',
        boxSizing: 'border-box'
      }}
    >
      {/* Franja Superior Azul Mercosur */}
      <div className="w-full h-[5px] bg-[#003399] shrink-0" />

      {/* Cuerpo de la Patente */}
      <div className="flex-1 w-full flex items-center justify-center px-1.5 pb-0.5 bg-white">
        {copiado ? (
          <span className="text-[9px] font-black text-emerald-700 tracking-tight leading-none animate-pulse flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span>COPIADO</span>
          </span>
        ) : (
          <span className="text-[11px] font-black text-black tracking-wide font-mono uppercase leading-none select-all whitespace-nowrap">
            {patenteVisible}
          </span>
        )}
      </div>
    </div>
  );
};
