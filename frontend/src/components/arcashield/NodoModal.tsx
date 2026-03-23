'use client';
import { useEffect, useState } from 'react';
import { api, Nodo, AnalisisNodo } from '../../lib/arcashield-api';
import { LogsTerminal } from './LogsTerminal';

const COLOR_SCORE = (s: number) =>
  s >= 70 ? 'bg-red-500' : s > 0 ? 'bg-yellow-400' : 'bg-green-500';

const ESTADO_BADGE: Record<string, string> = {
  comprometido: 'bg-red-800 text-red-100',
  sospechoso:   'bg-yellow-800 text-yellow-100',
  contenido:    'bg-slate-700 text-slate-200',
  recuperando:  'bg-blue-900 text-blue-100',
  recuperado:   'bg-blue-800 text-blue-100',
  normal:       'bg-green-900 text-green-200',
};

const formatFecha = (fecha?: string | null) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

interface NodoModalProps {
  nodoId: number;
  onClose: () => void;
  onContener: (id: number) => Promise<void>;
  onIniciarRecuperacion: (id: number) => void;
}

export function NodoModal({ nodoId, onClose, onContener, onIniciarRecuperacion }: NodoModalProps) {
  const [nodo, setNodo]             = useState<Nodo | null>(null);
  const [analisis, setAnalisis]     = useState<AnalisisNodo | null>(null);
  const [accionando, setAccionando] = useState<'contener' | 'proteger' | 'backup' | null>(null);
  const [mostrarLogs, setMostrarLogs] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getNodo(nodoId),
      api.analizarNodo(nodoId),
    ])
      .then(([n, a]) => { setNodo(n); setAnalisis(a); })
      .catch(console.error);
  }, [nodoId]);

  const handleContener = async () => {
    setAccionando('contener');
    await onContener(nodoId);
    setAccionando(null);
  };

  const handleRecuperar = () => {
    onIniciarRecuperacion(nodoId);
  };

  const handleProteger = async () => {
    if (!nodo) return;
    setAccionando('proteger');
    try {
      const res = await api.protegerNodo(nodoId) as { nodo?: Nodo };
      if (res?.nodo) setNodo(res.nodo);
      else setNodo(await api.getNodo(nodoId));
    } catch (e) {
      console.error('Error aplicando proteccion:', e);
    } finally {
      setAccionando(null);
    }
  };

  const handleBackup = async () => {
    if (!nodo) return;
    setAccionando('backup');
    try {
      const res = await api.generarBackup(nodoId) as { nodo?: Nodo };
      if (res?.nodo) setNodo(res.nodo);
      else setNodo(await api.getNodo(nodoId));
    } catch (e) {
      console.error('Error generando backup:', e);
    } finally {
      setAccionando(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-bold text-white font-mono">
                {nodo?.hostname ?? '...'}
              </h2>
              <p className="text-xs text-slate-400">{nodo?.ip} · {nodo?.sede}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">x</button>
        </div>

        {mostrarLogs && nodo && (
        <LogsTerminal
          nodoId={nodo.id}
          hostname={nodo.hostname}
          onClose={() => setMostrarLogs(false)}
        />
      )}

      {!nodo ? (
          <div className="p-8 text-center text-slate-400">Cargando análisis...</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Estado + tipo */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${ESTADO_BADGE[nodo.estado] ?? 'bg-slate-700 text-slate-200'}`}>
                {nodo.estado.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 capitalize">{nodo.tipo.replace('_', ' ')}</span>
              {nodo.aislado && (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Aislado</span>
              )}
            </div>

            {/* Score de riesgo */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Score de riesgo</span>
                <span className="text-sm font-bold text-white">
                  {analisis?.analisis.score ?? nodo.scoreRiesgo} / 100
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${COLOR_SCORE(analisis?.analisis.score ?? nodo.scoreRiesgo)}`}
                  style={{ width: `${Math.min(100, analisis?.analisis.score ?? nodo.scoreRiesgo)}%` }}
                />
              </div>
              {analisis && (
                <p className="text-xs text-slate-500 mt-1">
                  Clasificación IA: <span className="text-slate-300 font-medium">{analisis.analisis.nivel}</span>
                </p>
              )}
            </div>

            {/* Factores detectados */}
            {analisis && analisis.analisis.factoresDetectados.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Factores de riesgo detectados</h3>
                <div className="space-y-1.5">
                  {analisis.analisis.factoresDetectados.map((f) => (
                    <div key={f.tipo} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-300">{f.descripcion}</span>
                      <span className="text-xs font-bold text-red-400 ml-2">+{f.peso} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertas del nodo */}
            {nodo.alertas && nodo.alertas.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Alertas ({nodo.alertas.length})
                </h3>
                <div className="space-y-1.5">
                  {nodo.alertas.map((a) => (
                    <div key={a.id} className="bg-slate-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-400 uppercase">{a.severidad}</span>
                        <span className="text-xs text-slate-300">{a.descripcion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendaciones IA */}
            {analisis && analisis.analisis.recomendaciones.length > 0 && (
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Recomendaciones IA</h3>
                <ul className="space-y-1">
                  {analisis.analisis.recomendaciones.map((r, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Logs forenses */}
            {(['comprometido', 'contenido', 'recuperando'] as const).includes(nodo.estado) && (
              <button
                onClick={() => setMostrarLogs(true)}
                className="w-full bg-black hover:bg-slate-950 border border-slate-700 hover:border-green-800 text-green-400 py-2 rounded-lg text-sm font-mono transition-colors"
              >
                Ver logs forenses
              </button>
            )}

            {/* Resiliencia del nodo */}
            {(['contenido', 'recuperando'] as const).includes(nodo.estado) && (
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Resiliencia del nodo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Proteccion</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {nodo.ultimaProteccion ? 'Aplicada' : 'Pendiente'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{formatFecha(nodo.ultimaProteccion)}</p>
                    <button
                      onClick={handleProteger}
                      disabled={accionando !== null}
                      className="mt-2 w-full text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 transition-colors"
                    >
                      {accionando === 'proteger' ? 'Aplicando...' : 'Aplicar proteccion'}
                    </button>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Backup</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {nodo.ultimoBackup
                        ? nodo.backupVerificado ? 'Verificado' : 'Generado'
                        : 'Sin backup'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{formatFecha(nodo.ultimoBackup)}</p>
                    <button
                      onClick={handleBackup}
                      disabled={accionando !== null}
                      className="mt-2 w-full text-xs px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-50 text-blue-100 transition-colors"
                    >
                      {accionando === 'backup' ? 'Generando...' : 'Generar backup'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2 border-t border-slate-700">
              {nodo.estado === 'comprometido' && (
                <button
                  onClick={handleContener}
                  disabled={accionando !== null}
                  className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm transition-colors"
                >
                  {accionando === 'contener' ? 'Conteniendo...' : 'Contener nodo'}
                </button>
              )}
              {(['contenido', 'recuperando'] as const).includes(nodo.estado) && (
                <button
                  onClick={handleRecuperar}
                  disabled={accionando !== null}
                  className="flex-1 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm transition-colors"
                >
                  Iniciar recuperacion
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
