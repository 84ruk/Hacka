import dynamic from 'next/dynamic';
import { Nodo } from '../../lib/arcashield-api';

const MapaLeafletInner = dynamic(
  () => import('./MapaLeafletInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Cargando mapa...
      </div>
    ),
  },
);

interface MapaMexicoProps {
  nodos: Nodo[];
  onContenerSede: (sede: string) => Promise<void>;
  onVerLogsSede: (sede: string) => void;
}

export function MapaMexico({ nodos, onContenerSede, onVerLogsSede }: MapaMexicoProps) {
  if (nodos.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col items-center justify-center p-8 text-center" style={{ height: 500 }}>
        <p className="text-slate-400 text-sm">Sin datos — Inicia la simulacion</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden" style={{ height: 500 }}>
      <MapaLeafletInner nodos={nodos} onContenerSede={onContenerSede} onVerLogsSede={onVerLogsSede} />
    </div>
  );
}
