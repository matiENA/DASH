import { create } from 'zustand';
import { VistaTab, SesionUsuario, Novedad, TerminalItem } from '../types/dash';

interface DashState {
  // Navegación de Vistas
  vistaActual: VistaTab;
  setVistaActual: (vista: VistaTab) => void;

  // Modo Cartelera / TV
  modoCartelera: boolean;
  toggleModoCartelera: () => void;

  // Autenticación de Usuario
  sesion: SesionUsuario | null;
  setSesion: (sesion: SesionUsuario | null) => void;
  cerrarSesion: () => void;

  // Filtros
  busqueda: string;
  setBusqueda: (busqueda: string) => void;
  filtroTerminal: string;
  setFiltroTerminal: (terminal: string) => void;

  // Modales y Edición
  modalNuevaAbierto: boolean;
  setModalNuevaAbierto: (abierto: boolean) => void;
  novedadEnEdicion: Novedad | null;
  setNovedadEnEdicion: (novedad: Novedad | null) => void;

  // Anchos proporcionales de columnas (Splitters)
  columnWidths: Record<string, number>;
  setColumnWidth: (colKey: string, weight: number) => void;
  resetColumnWidth: (colKey: string) => void;

  // Catálogo de Terminales
  terminales: TerminalItem[];
  setTerminales: (terminales: TerminalItem[]) => void;

  // Drag and Drop (Service Drop Overlay)
  activeDragCardId: string | number | null;
  setActiveDragCardId: (id: string | number | null) => void;
  overlayServiceAbierto: boolean;
  setOverlayServiceAbierto: (abierto: boolean) => void;
}

const getStoredSession = (): SesionUsuario | null => {
  try {
    const data = localStorage.getItem('dash_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const getStoredColumnWidths = (): Record<string, number> => {
  try {
    const str = localStorage.getItem('column_section_widths');
    return str ? JSON.parse(str) : {};
  } catch {
    return {};
  }
};

export const useDashStore = create<DashState>((set) => ({
  vistaActual: 'todas',
  setVistaActual: (vista) => set({ vistaActual: vista }),

  modoCartelera: typeof window !== 'undefined' ? localStorage.getItem('modo_cartelera') === 'true' : false,
  toggleModoCartelera: () =>
    set((state) => {
      const nuevo = !state.modoCartelera;
      localStorage.setItem('modo_cartelera', nuevo ? 'true' : 'false');
      localStorage.setItem('vista_solida', nuevo ? 'true' : 'false');
      if (nuevo) {
        document.documentElement.classList.add('modo-cartelera', 'vista-solida');
      } else {
        document.documentElement.classList.remove('modo-cartelera', 'vista-solida');
      }
      return { modoCartelera: nuevo };
    }),

  sesion: getStoredSession(),
  setSesion: (sesion) => {
    if (sesion) {
      localStorage.setItem('dash_user', JSON.stringify(sesion));
    } else {
      localStorage.removeItem('dash_user');
    }
    set({ sesion });
  },
  cerrarSesion: () => {
    localStorage.removeItem('dash_user');
    set({ sesion: null });
  },

  busqueda: '',
  setBusqueda: (busqueda) => set({ busqueda }),
  filtroTerminal: '',
  setFiltroTerminal: (filtroTerminal) => set({ filtroTerminal }),

  modalNuevaAbierto: false,
  setModalNuevaAbierto: (modalNuevaAbierto) => set({ modalNuevaAbierto }),
  novedadEnEdicion: null,
  setNovedadEnEdicion: (novedadEnEdicion) => set({ novedadEnEdicion, modalNuevaAbierto: !!novedadEnEdicion }),

  columnWidths: getStoredColumnWidths(),
  setColumnWidth: (colKey, weight) =>
    set((state) => {
      const updated = { ...state.columnWidths, [colKey]: weight };
      localStorage.setItem('column_section_widths', JSON.stringify(updated));
      return { columnWidths: updated };
    }),
  resetColumnWidth: (colKey) =>
    set((state) => {
      const updated = { ...state.columnWidths };
      delete updated[colKey];
      localStorage.setItem('column_section_widths', JSON.stringify(updated));
      return { columnWidths: updated };
    }),

  terminales: [],
  setTerminales: (terminales) => set({ terminales }),

  activeDragCardId: null,
  setActiveDragCardId: (id) => set({ activeDragCardId: id, overlayServiceAbierto: !!id }),
  overlayServiceAbierto: false,
  setOverlayServiceAbierto: (overlayServiceAbierto) => set({ overlayServiceAbierto })
}));
