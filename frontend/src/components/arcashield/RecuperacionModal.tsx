'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/arcashield-api';

interface NodoContenido {
  id: number;
  hostname: string;
  ip: string;
  sede: string;
  tipo: string;
  scoreRiesgo: number;
  tiempoContenido: string;
  estado: string;
}

interface PasoChecklist {
  orden: number;
  descripcion: string;
  fase: string;
  completado: boolean;
  completadoEn: string | null;
  estado: 'pendiente' | 'actual' | 'completado';
}

interface ChecklistResponse {
  nodo: { id: number; hostname: string; sede: string; estado: string };
  pasos: PasoChecklist[];
  progreso: { completados: number; total: number };
}

interface RecuperacionModalProps {
  onClose: () => void;
  onNodoRecuperado: () => void;
  nodoIdInicial?: number;
}

export function RecuperacionModal({ onClose, onNodoRecuperado, nodoIdInicial }: RecuperacionModalProps) {
  const [nodos, setNodos] = useState<NodoContenido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<number | null>(nodoIdInicial ?? null);
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [cargandoChecklist, setCargandoChecklist] = useState(false);
  const [completando, setCompletando] = useState<number | null>(null);

  const progresoPct = useMemo(() => {
    if (!checklist) return 0;
    return Math.round((checklist.progreso.completados / checklist.progreso.total) * 100);
  }, [checklist]);

  const cargarNodos = useCallback(async () => {
    try {
      const data = await api.getNodosContenidos();
      setNodos((data as NodoContenido[]) ?? []);
    } catch (e) {
      console.error('Error cargando nodos contenidos:', e);
    }
  }, []);

  const cargarChecklist = useCallback(async (id: number) => {
    setCargandoChecklist(true);
    try {
      const data = await api.getChecklist(id);
      setChecklist(data as ChecklistResponse);
    } catch (e) {
      console.error('Error cargando checklist:', e);
    } finally {
      setCargandoChecklist(false);
    }
  }, []);

  useEffect(() => {
    cargarNodos().finally(() => setCargando(false));
  }, [cargarNodos]);

  useEffect(() => {
    if (nodoIdInicial) {
      setNodoSeleccionado(nodoIdInicial);
      cargarChecklist(nodoIdInicial);
    }
  }, [nodoIdInicial, cargarChecklist]);

  const handleSeleccionar = (id: number) => {
    setNodoSeleccionado(id);
    cargarChecklist(id);
  };

  const handleCompletarPaso = async (nodoId: number, orden: number) => {
    setCompletando(orden);
    try {
      const res = await api.completarPaso(nodoId, orden) as { nodoRecuperado?: boolean };
      await cargarChecklist(nodoId);

      if (res?.nodoRecuperado) {
        await cargarNodos();
        setNodoSeleccionado(null);
        setChecklist(null);
        onNodoRecuperado();
      }
    } catch (e) {
      console.error('Error completando paso:', e);
    } finally {
      setCompletando(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-white">Recuperacion de nodos</h2>
            <p className="text-xs text-slate-400">Checklist forense de 6 pasos</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-slate-400">Cargando nodos...</div>
        ) : nodoSeleccionado === null ? (
          nodos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay nodos contenidos para recuperar
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {nodos.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-white">{n.hostname}</span>
                    <span className="text-slate-400 text-sm ml-2">
                      {n.sede} · {n.ip}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 uppercase">{n.estado.toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => handleSeleccionar(n.id)}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                  >
                    Abrir checklist
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">
                  {checklist?.nodo.hostname ?? 'Nodo'} · {checklist?.nodo.sede}
                </h3>
                <p className="text-xs text-slate-400">
                  Estado: {(checklist?.nodo.estado ?? '—').toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => {
                  setNodoSeleccionado(null);
                  setChecklist(null);
                }}
                className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Volver a la lista
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Progreso</span>
                <span>
                  {checklist?.progreso.completados ?? 0}/{checklist?.progreso.total ?? 6}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${progresoPct}%` }}
                />
              </div>
            </div>

            {cargandoChecklist ? (
              <div className="p-6 text-center text-slate-400">Cargando checklist...</div>
            ) : (
              <div className="space-y-2">
                {(checklist?.pasos ?? []).map((paso) => (
                  <div
                    key={paso.orden}
                    className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm w-6 text-center">
                        {paso.estado === 'completado' ? '✅' : paso.estado === 'actual' ? '🔄' : '•'}
                      </span>
                      <div>
                        <p className="text-sm text-slate-200">
                          {paso.orden}. {paso.descripcion}
                        </p>
                        <p className="text-xs text-slate-500">
                          {paso.fase.toUpperCase()} {paso.completadoEn ? `· ${new Date(paso.completadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                    </div>
                    {paso.estado === 'actual' ? (
                      <button
                        onClick={() => handleCompletarPaso(nodoSeleccionado, paso.orden)}
                        disabled={completando !== null}
                        className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                      >
                        {completando === paso.orden ? 'Procesando...' : 'Completar paso'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {paso.estado === 'completado' ? 'Completado' : 'Pendiente'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
