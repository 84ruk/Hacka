const BASE_URL = 'http://localhost:3000';

export interface Nodo {
  id: number;
  hostname: string;
  ip: string;
  sede: string;
  tipo: string;
  estado: 'normal' | 'sospechoso' | 'comprometido' | 'contenido' | 'recuperando' | 'recuperado';
  aislado: boolean;
  scoreRiesgo: number;
  ultimaActividad: string | null;
  ultimaProteccion?: string | null;
  ultimoBackup?: string | null;
  backupVerificado?: boolean;
  creadoEn: string;
  alertas?: AlertaNodo[];
}

export interface AlertaNodo {
  id: number;
  tipo: string;
  severidad: string;
  descripcion: string;
  atendida: boolean;
  creadoEn: string;
}

export interface ResumenNodos {
  total: number;
  normal: number;
  sospechoso: number;
  comprometido: number;
  contenido: number;
  recuperando?: number;
  recuperado: number;
  aislado: number;
  archivosProtegidos: number;
  porSede: { sede: string; comprometidos: number; total: number }[];
}

export interface Alerta {
  id: number;
  tipo: string;
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  descripcion: string;
  atendida: boolean;
  creadoEn: string;
  nodo: {
    id: number;
    hostname: string;
    sede: string;
    estado: string;
    scoreRiesgo: number;
  } | null;
}

export interface Recomendacion {
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  accion: string;
  razon?: string;
  fase: string;
}

export interface AnalisisNodo {
  nodo: { id: number; hostname: string; sede: string; estadoActual: string };
  analisis: {
    score: number;
    nivel: string;
    factoresDetectados: { tipo: string; peso: number; descripcion: string }[];
    recomendaciones: string[];
  };
}

const json = <T>(r: Response): Promise<T> => r.json();

export const api = {
  iniciarSimulacion: () =>
    fetch(`${BASE_URL}/simulacion/iniciar`, { method: 'POST' }).then(json<unknown>),
  iniciarLimpio: () =>
    fetch(`${BASE_URL}/simulacion/iniciar-limpio`, { method: 'POST' }).then(json<unknown>),
  resetSimulacion: () =>
    fetch(`${BASE_URL}/simulacion/reset`, { method: 'DELETE' }).then(json<unknown>),
  propagar: () =>
    fetch(`${BASE_URL}/simulacion/propagar`, { method: 'POST' }).then(json<unknown>),

  getNodos: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(`${BASE_URL}/nodos${q}`).then(json<Nodo[]>);
  },
  getResumenNodos: () =>
    fetch(`${BASE_URL}/nodos/resumen`).then(json<ResumenNodos>),
  getNodo: (id: number) =>
    fetch(`${BASE_URL}/nodos/${id}`).then(json<Nodo>),
  contenerNodo: (id: number) =>
    fetch(`${BASE_URL}/nodos/${id}/contener`, { method: 'PATCH' }).then(json<unknown>),
  contenerSede: (sede: string) =>
    fetch(`${BASE_URL}/nodos/sede/${encodeURIComponent(sede)}/contener`, { method: 'PATCH' }).then(json<unknown>),
  recuperarNodo: (id: number) =>
    fetch(`${BASE_URL}/nodos/${id}/recuperar`, { method: 'PATCH' }).then(json<unknown>),
  recuperarSede: (sede: string) =>
    fetch(`${BASE_URL}/nodos/sede/${encodeURIComponent(sede)}/recuperar`, { method: 'PATCH' }).then(json<unknown>),
  protegerNodo: (id: number) =>
    fetch(`${BASE_URL}/nodos/${id}/proteger`, { method: 'PATCH' }).then(json<unknown>),
  generarBackup: (id: number) =>
    fetch(`${BASE_URL}/nodos/${id}/backup`, { method: 'PATCH' }).then(json<unknown>),

  getAlertas: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/alertas${q ? '?' + q : ''}`).then(json<Alerta[]>);
  },
  atenderAlerta: (id: number) =>
    fetch(`${BASE_URL}/alertas/${id}/atender`, { method: 'PATCH' }).then(json<unknown>),

  getRecomendaciones: () =>
    fetch(`${BASE_URL}/analisis/recomendaciones`).then(json<{ recomendaciones: Recomendacion[] }>),
  analizarNodo: (id: number) =>
    fetch(`${BASE_URL}/analisis/nodo/${id}`, { method: 'POST' }).then(json<AnalisisNodo>),
  contenerAutomatico: () =>
    fetch(`${BASE_URL}/analisis/contener-automatico`, { method: 'POST' }).then(json<unknown>),
  escanear: () =>
    fetch(`${BASE_URL}/analisis/escanear`, { method: 'POST' }).then(json<unknown>),
  getPacienteCero: () =>
    fetch(`${BASE_URL}/analisis/paciente-cero`).then(json<unknown>),

  getNodosContenidos: () =>
    fetch(`${BASE_URL}/recuperacion/nodos-contenidos`).then(json<unknown>),
  getChecklist: (nodoId: number) =>
    fetch(`${BASE_URL}/recuperacion/checklist/${nodoId}`).then(json<unknown>),
  completarPaso: (nodoId: number, orden: number) =>
    fetch(`${BASE_URL}/recuperacion/checklist/${nodoId}/paso/${orden}`, { method: 'PATCH' }).then(json<unknown>),
  getMetricas: () =>
    fetch(`${BASE_URL}/recuperacion/metricas`).then(json<unknown>),
  getReporte: () =>
    fetch(`${BASE_URL}/recuperacion/reporte`).then(json<unknown>),

  getTimeline: (limite = 50) =>
    fetch(`${BASE_URL}/timeline?limite=${limite}`).then(json<unknown>),

  getLogsTodos: () =>
    fetch(`${BASE_URL}/logs/todos`).then(json<unknown>),
  getLogsNodo: (nodoId: number) =>
    fetch(`${BASE_URL}/logs/nodo/${nodoId}`).then(json<unknown>),
  getLogsSede: (sede: string) =>
    fetch(`${BASE_URL}/logs/sede/${encodeURIComponent(sede)}`).then(json<unknown>),
  getLogsResumen: () =>
    fetch(`${BASE_URL}/logs/resumen`).then(json<unknown>),
  getLogsC2: () =>
    fetch(`${BASE_URL}/logs/c2`).then(json<unknown>),

  getAcciones: () =>
    fetch(`${BASE_URL}/recuperacion/reporte`)
      .then(json<{ accionesEjecutadas?: unknown[] }>)
      .then((data) => data.accionesEjecutadas ?? []),
};
