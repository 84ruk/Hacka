'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/arcashield-api';
import { useNodos } from '../../hooks/useNodos';
import { useAlertas } from '../../hooks/useAlertas';
import { Header } from '../../components/arcashield/Header';
import { TarjetasResumen } from '../../components/arcashield/TarjetasResumen';
import { BannerIA } from '../../components/arcashield/BannerIA';
import { GuiaProtocolo } from '../../components/arcashield/GuiaProtocolo';
import { GraficaSedes } from '../../components/arcashield/GraficaSedes';
import { TablaNodes } from '../../components/arcashield/TablaNodes';
import { LogProtocolo } from '../../components/arcashield/LogProtocolo';
import { MapaRed } from '../../components/arcashield/MapaRed';
import { MapaMexico } from '../../components/arcashield/MapaMexico';
import { PanelAlertas } from '../../components/arcashield/PanelAlertas';
import { NodoModal } from '../../components/arcashield/NodoModal';
import { RecuperacionModal } from '../../components/arcashield/RecuperacionModal';
import { TimelineIncidente } from '../../components/arcashield/TimelineIncidente';
import { ResultadoContencionModal } from '../../components/arcashield/ResultadoContencionModal';
import { ResultadoEscaneoModal } from '../../components/arcashield/ResultadoEscaneoModal';
import { PacienteCeroCard } from '../../components/arcashield/PacienteCeroCard';
import { TerminalForenseTab } from '../../components/arcashield/TerminalForenseTab';
import { LogsTerminal } from '../../components/arcashield/LogsTerminal';
import { ReporteModal } from '../../components/arcashield/ReporteModal';

// Toast
interface ToastMsg { texto: string; tipo: 'ok' | 'error' }

function Toast({ msg }: { msg: ToastMsg }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white transition-all
        ${msg.tipo === 'ok' ? 'bg-green-700' : 'bg-red-700'}`}
    >
      {msg.texto}
    </div>
  );
}

export default function ArcaShieldPage() {
  const { nodos, resumen, recargar }           = useNodos(5000);
  const { alertas, recargar: recargarAlertas } = useAlertas(5000);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<number | null>(null);
  const [simulando, setSimulando]               = useState(false);
  const [toast, setToast]                       = useState<ToastMsg | null>(null);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const [recuperacionNodoId, setRecuperacionNodoId]   = useState<number | null>(null);
  const [mostrarTimeline, setMostrarTimeline]         = useState(false);
  const [modoAtaque, setModoAtaque]                   = useState(false);
  const [conteniendo, setConteniendo]                 = useState(false);
  const [vistaRed, setVistaRed]                       = useState<'mapa' | 'leaflet' | 'tabla' | 'terminal'>('mapa');
  const [mostrarLog, setMostrarLog]                   = useState(false);
  const [resultadoContencion, setResultadoContencion] = useState<{
    accionesEjecutadas: number; nodosAislados: number; sedesAisladas: number;
    propagacionDetenida: boolean; tiempoRespuesta: string; razonamiento: string[]; mensaje: string;
  } | null>(null);
  const [resultadoEscaneo, setResultadoEscaneo]       = useState<{
    nodosEscaneados: number; amenazasDetectadas: number; sospechososDetectados: number;
    nodosActualizados: number; reglaAplicada: string[]; duracion: string; mensaje: string;
    estadoActual?: { comprometidos: number; sospechosos: number; normales: number };
  } | null>(null);
  const [escaneando, setEscaneando]                   = useState(false);
  const [logsConfig, setLogsConfig]                   = useState<{ nodoId?: number; sede?: string; hostname: string } | null>(null);
  const [mostrarReporte, setMostrarReporte]           = useState(false);
  const [simKey, setSimKey]                           = useState(0);
  const intervaloAtaqueRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervaloAtaqueRef.current) clearInterval(intervaloAtaqueRef.current);
    };
  }, []);

  const mostrarToast = useCallback((texto: string, tipo: 'ok' | 'error' = 'ok') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Acciones
  const handleIniciarSimulacion = async () => {
    setSimulando(true);
    try {
      await api.iniciarSimulacion();
      await Promise.all([recargar(), recargarAlertas()]);
      setSimKey((k) => k + 1);
      mostrarToast('Simulacion iniciada — 200 nodos cargados');
    } catch {
      mostrarToast('Error al iniciar la simulacion', 'error');
    } finally {
      setSimulando(false);
    }
  };

  const handleIniciarLimpio = async () => {
    setSimulando(true);
    try {
      await api.iniciarLimpio();
      await Promise.all([recargar(), recargarAlertas()]);
      setSimKey((k) => k + 1);
      mostrarToast('Paciente cero activo — 3 nodos CDMX comprometidos. Propaga para expandir el ataque.');
    } catch {
      mostrarToast('Error al iniciar modo progresivo', 'error');
    } finally {
      setSimulando(false);
    }
  };

  const handleResetSimulacion = async () => {
    const confirmado = window.confirm(
      'Esto reseteara el estado de todos los nodos a normal y eliminara alertas y acciones del protocolo. Los nodos permanecen en la red. Continuar?'
    );
    if (!confirmado) return;

    await api.resetSimulacion();

    recargar();
    recargarAlertas();
    setSimKey((k) => k + 1);

    mostrarToast('Estado del ataque limpiado. Los 200 nodos estan en estado normal.');
  };

  const handleContenerNodo = async (id: number) => {
    try {
      const res = await api.contenerNodo(id) as { nodo?: { hostname: string } };
      await recargar();
      mostrarToast(`Nodo ${res?.nodo?.hostname ?? id} contenido exitosamente`);
    } catch {
      mostrarToast('Error al contener el nodo', 'error');
    } finally {
      setNodoSeleccionado(null);
    }
  };

  const handleRecuperarNodo = async (id: number) => {
    setRecuperacionNodoId(id);
    setMostrarRecuperacion(true);
    setNodoSeleccionado(null);
  };

  const handleContenerSede = async (sede: string) => {
    try {
      const res = await api.contenerSede(sede) as { nodosContenidos?: number };
      await Promise.all([recargar(), recargarAlertas()]);
      mostrarToast(`Sede ${sede} contenida — ${res?.nodosContenidos ?? 0} nodos aislados`);
    } catch {
      mostrarToast(`Error al contener la sede ${sede}`, 'error');
    }
  };

  const handleRecuperarSede = async (sede: string) => {
    try {
      const res = await api.recuperarSede(sede) as { nodosRecuperados?: number };
      await recargar();
      mostrarToast(`Sede ${sede} recuperada — ${res?.nodosRecuperados ?? 0} nodos reintegrados`);
    } catch {
      mostrarToast(`Error al recuperar la sede ${sede}`, 'error');
    }
  };

  const handleAtenderAlerta = async (id: number) => {
    try {
      await api.atenderAlerta(id);
      await recargarAlertas();
    } catch {
      mostrarToast('Error al atender la alerta', 'error');
    }
  };

  const handleContenerAutomatico = async () => {
    setConteniendo(true);
    try {
      const resultado = await api.contenerAutomatico() as {
        accionesEjecutadas: number; nodosAislados: number; sedesAisladas: number;
        propagacionDetenida: boolean; tiempoRespuesta: string; razonamiento: string[]; mensaje: string;
      };
      setResultadoContencion(resultado);
      if (resultado.accionesEjecutadas > 0) {
        await Promise.all([recargar(), recargarAlertas()]);
      }
    } catch {
      mostrarToast('Error al ejecutar contencion automatica', 'error');
    } finally {
      setConteniendo(false);
    }
  };

  const handleEscanear = async () => {
    setEscaneando(true);
    try {
      const resultado = await api.escanear() as {
        nodosEscaneados: number; amenazasDetectadas: number; sospechososDetectados: number;
        nodosActualizados: number; reglaAplicada: string[]; duracion: string; mensaje: string;
        estadoActual?: { comprometidos: number; sospechosos: number; normales: number };
      };
      // Siempre recargar para reflejar el estado actual
      await Promise.all([recargar(), recargarAlertas()]);
      setResultadoEscaneo(resultado);
      if (resultado.nodosActualizados > 0) {
        mostrarToast(
          `Escaneo: ${resultado.amenazasDetectadas} amenazas detectadas — ${resultado.nodosActualizados} nodos actualizados`
        );
      }
    } catch {
      mostrarToast('Error al escanear la red', 'error');
    } finally {
      setEscaneando(false);
    }
  };

  const handleVerLogsSede = useCallback((sede: string) => {
    setLogsConfig({ sede, hostname: sede });
  }, []);

  const toggleModoAtaque = useCallback(() => {
    if (modoAtaque) {
      if (intervaloAtaqueRef.current) {
        clearInterval(intervaloAtaqueRef.current);
        intervaloAtaqueRef.current = null;
      }
      setModoAtaque(false);
      mostrarToast('Simulacion de propagacion detenida');
    } else {
      setModoAtaque(true);
      mostrarToast('Simulacion de propagacion activada');
      intervaloAtaqueRef.current = setInterval(async () => {
        try {
          const resultado = await api.propagar() as { propagado: boolean; mensaje: string };
          if (resultado.propagado) {
            mostrarToast(resultado.mensaje);
            void recargar();
            void recargarAlertas();
          } else {
            if (intervaloAtaqueRef.current) clearInterval(intervaloAtaqueRef.current);
            intervaloAtaqueRef.current = null;
            setModoAtaque(false);
            mostrarToast('Sin mas nodos susceptibles de infeccion');
          }
        } catch {
          mostrarToast('Error al propagar', 'error');
        }
      }, 8000);
    }
  }, [modoAtaque, mostrarToast, recargar, recargarAlertas]);

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <Header
        onIniciarSimulacion={handleIniciarSimulacion}
        onIniciarLimpio={handleIniciarLimpio}
        onResetSimulacion={handleResetSimulacion}
        simulando={simulando}
        comprometidos={resumen?.comprometido ?? 0}
        contenidos={resumen?.contenido ?? 0}
        onAbrirTimeline={() => setMostrarTimeline(true)}
        modoAtaque={modoAtaque}
        onToggleModoAtaque={toggleModoAtaque}
        onContenerAutomatico={handleContenerAutomatico}
        conteniendo={conteniendo}
        onEscanear={handleEscanear}
        escaneando={escaneando}
      />

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <TarjetasResumen resumen={resumen} />

        <PacienteCeroCard key={simKey} refreshKey={alertas.length} />

        <BannerIA />

        <GuiaProtocolo resumen={resumen} />

        <GraficaSedes porSede={resumen?.porSede ?? []} nodos={nodos} />

        {/* Controles de vista */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setVistaRed('mapa')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${vistaRed === 'mapa' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Mapa de red
            </button>
            <button
              onClick={() => setVistaRed('leaflet')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${vistaRed === 'leaflet' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Mapa geografico
            </button>
            <button
              onClick={() => setVistaRed('tabla')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${vistaRed === 'tabla' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Tabla de nodos ({nodos.length})
            </button>
            <button
              onClick={() => setVistaRed('terminal')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${vistaRed === 'terminal' ? 'bg-green-900 text-green-300' : 'text-slate-400 hover:text-white'}`}
            >
              Terminal forense {(resumen?.comprometido ?? 0) + (resumen?.contenido ?? 0) > 0 && (
                <span className="ml-1 text-red-400 font-bold">
                  ({(resumen?.comprometido ?? 0) + (resumen?.contenido ?? 0)})
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(resumen?.contenido ?? 0) > 0 && (
              <button
                onClick={() => {
                  setRecuperacionNodoId(null);
                  setMostrarRecuperacion(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Recuperacion ({resumen!.contenido} nodos)
              </button>
            )}
            <button
              onClick={() => setMostrarReporte(true)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-600"
            >
              Reporte final
            </button>
          </div>
        </div>

        {vistaRed === 'terminal' ? (
          <TerminalForenseTab nodos={nodos} />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              {vistaRed === 'mapa' ? (
                <MapaRed
                  nodos={nodos}
                  onNodoClick={setNodoSeleccionado}
                  onContenerSede={handleContenerSede}
                  onRecuperarSede={handleRecuperarSede}
                />
              ) : vistaRed === 'leaflet' ? (
                <MapaMexico nodos={nodos} onContenerSede={handleContenerSede} onVerLogsSede={handleVerLogsSede} />
              ) : (
                <TablaNodes nodos={nodos} />
              )}
            </div>
            <div className="col-span-1 flex flex-col" style={{ minHeight: 500 }}>
              <PanelAlertas
                alertas={alertas}
                onAtender={handleAtenderAlerta}
              />
            </div>
          </div>
        )}

        {/* Log de acciones colapsable */}
        <div className="border-t border-slate-700">
          <button
            onClick={() => setMostrarLog((v) => !v)}
            className="text-slate-400 hover:text-white text-sm w-full text-left py-2 px-1 flex items-center gap-2 transition-colors"
          >
            <span className="text-slate-600">{mostrarLog ? '▲' : '▼'}</span>
            {mostrarLog ? 'Ocultar' : 'Ver'} log de acciones del protocolo
          </button>
          {mostrarLog && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Log de acciones del protocolo
                </h2>
              </div>
              <LogProtocolo />
            </div>
          )}
        </div>
      </div>

      {nodoSeleccionado !== null && (
        <NodoModal
          nodoId={nodoSeleccionado}
          onClose={() => setNodoSeleccionado(null)}
          onContener={handleContenerNodo}
          onIniciarRecuperacion={handleRecuperarNodo}
        />
      )}

      {mostrarRecuperacion && (
        <RecuperacionModal
          onClose={() => {
            setMostrarRecuperacion(false);
            setRecuperacionNodoId(null);
          }}
          onNodoRecuperado={recargar}
          nodoIdInicial={recuperacionNodoId ?? undefined}
        />
      )}

      {resultadoContencion !== null && (
        <ResultadoContencionModal
          resultado={resultadoContencion}
          onClose={() => setResultadoContencion(null)}
        />
      )}

      {resultadoEscaneo !== null && (
        <ResultadoEscaneoModal
          resultado={resultadoEscaneo}
          onClose={() => setResultadoEscaneo(null)}
        />
      )}

      {/* Panel lateral Timeline */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-[2000] transform transition-transform duration-300 ${
          mostrarTimeline ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <TimelineIncidente onClose={() => setMostrarTimeline(false)} />
      </div>
      {mostrarTimeline && (
        <div
          className="fixed inset-0 bg-black/40 z-[1999]"
          onClick={() => setMostrarTimeline(false)}
        />
      )}

      {mostrarReporte && (
        <ReporteModal onClose={() => setMostrarReporte(false)} />
      )}

      {logsConfig && (
        <LogsTerminal
          nodoId={logsConfig.nodoId}
          sede={logsConfig.sede}
          hostname={logsConfig.hostname}
          onClose={() => setLogsConfig(null)}
        />
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}
