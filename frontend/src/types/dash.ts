export type VistaTab = 'todas' | 'archivo' | 'mis_novedades' | 'menciones';

export type ClasificacionTipo =
  | 'LIBRES'
  | 'VUELVE'
  | 'BAJA_DIAGRAMA'
  | 'REPARACION'
  | 'CERTIFICACION_UNIDAD'
  | 'EXAMEN_CHOFER'
  | 'ESTADO_DEMORA';

export type ServicioDrop = 'CM' | 'EURO' | 'MET' | 'LIVIANO' | 'PP' | 'TDS';

export interface VencimientoDetalle {
  label: string;
  fecha: string;
  dias: number;
  estado: 'VENCIDO' | 'SEMANA' | 'VIGENTE' | 'NONE';
  colorBg: string;
  colorBorder: string;
}

export interface TerminalItem {
  id: string;
  codigo: string;
  nombre: string;
  color_bg?: string;
  color_text?: string;
  activo?: boolean;
}

export interface ServicioChoferItem {
  id: string;
  denominacion: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface Novedad {
  id: number | string;
  tipo_novedad: string;
  fecha_objetivo: string | null;
  detalle: string;
  resuelto: boolean;
  creador?: string;
  usuario?: string;
  creado_el?: string;
  timestamp?: string;
  fecha_resolucion?: string | null;
  terminal: string;
  terminal_id?: string | null;
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  nom: string;
  chofer_nombre?: string;
  chofer_id?: string | null;
  chofer_estado?: string;
  chofer_telefono?: string;
  foto?: string;
  tractor: string;
  semi?: string;
  cisternado?: string;
  n_ute?: string;
  srv?: string;
  servicio?: string;
  unidad_id?: string | null;
  vtv_tr?: string | null;
  mas_tr?: string | null;
  vtv_semi?: string | null;
  mas_semi?: string | null;
  esp_es?: string | null;
  vi?: string | null;
  ve?: string | null;
  menciones: string[];
}

export interface FlotaItem {
  nom: string;
  nombre?: string;
  chofer_id?: string;
  srv?: string;
  srv_chofer?: string;
  servicio?: string;
  tractor?: string;
  semi?: string;
  cisternado?: string;
  n_ute?: string;
  foto?: string;
  estado?: string;
  unidad_id?: string;
  mas_tr?: string | null;
  vtv_tr?: string | null;
  mas_semi?: string | null;
  vtv_semi?: string | null;
  esp_es?: string | null;
  vi?: string | null;
  ve?: string | null;
  dias?: Record<string, string>;
}

export interface RetornoItem {
  nom: string;
  nombre?: string;
  tractor?: string;
  retorna_cuando?: string; // 'HOY' o 'MANANA' / 'MAÑANA'
  codigo_ayer?: string;
  codigo_hoy?: string;
  codigo_manana?: string;
}

export interface Usuario {
  id: string;
  usuario: string;
  rol: string;
}

export interface SesionUsuario {
  id?: string;
  usuario: string;
  rol: string;
}
