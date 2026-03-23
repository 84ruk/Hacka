'use client';
import { useMemo, useState } from 'react';
import { Nodo } from '../../lib/arcashield-api';

const COLOR_ESTADO: Record<string, string> = {
  normal:       'text-green-400',
  sospechoso:   'text-yellow-400',
  comprometido: 'text-red-500',
  contenido:    'text-slate-400',
  recuperando:  'text-blue-300',
  recuperado:   'text-blue-400',
};

type ColOrden = 'hostname' | 'sede' | 'estado' | 'scoreRiesgo';

interface TablaNodesProps {
  nodos: Nodo[];
}

const POR_PAGINA = 20;

function formatFecha(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function TablaNodes({ nodos }: TablaNodesProps) {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSede,   setFiltroSede]   = useState('');
  const [busqueda,     setBusqueda]     = useState('');
  const [orden,        setOrden]        = useState<ColOrden>('hostname');
  const [ascendente,   setAscendente]   = useState(true);
  const [pagina,       setPagina]       = useState(1);

  const sedes = useMemo(
    () => [...new Set(nodos.map((n) => n.sede))].sort(),
    [nodos],
  );

  const filtrados = useMemo(() => {
    let lista = nodos;
    if (filtroEstado) lista = lista.filter((n) => n.estado === filtroEstado);
    if (filtroSede)   lista = lista.filter((n) => n.sede === filtroSede);
    if (busqueda)     lista = lista.filter((n) => n.hostname.toLowerCase().includes(busqueda.toLowerCase()));

    lista = [...lista].sort((a, b) => {
      const va = a[orden];
      const vb = b[orden];
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return ascendente ? cmp : -cmp;
    });

    return lista;
  }, [nodos, filtroEstado, filtroSede, busqueda, orden, ascendente]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginaActual = Math.min(pagina, totalPaginas || 1);
  const slice = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const toggleOrden = (col: ColOrden) => {
    if (orden === col) setAscendente((a) => !a);
    else { setOrden(col); setAscendente(true); }
    setPagina(1);
  };

  const Th = ({ col, label }: { col: ColOrden; label: string }) => (
    <th
      className="px-3 py-2 text-left text-xs text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
      onClick={() => toggleOrden(col)}
    >
      {label}
      {orden === col && <span className="ml-1">{ascendente ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col gap-3 p-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar hostname..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 w-48"
        />
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-400"
        >
          <option value="">Todos los estados</option>
          <option value="normal">Normal</option>
          <option value="sospechoso">Sospechoso</option>
          <option value="comprometido">Comprometido</option>
          <option value="contenido">Contenido</option>
          <option value="recuperando">Recuperando</option>
          <option value="recuperado">Recuperado</option>
        </select>
        <select
          value={filtroSede}
          onChange={(e) => { setFiltroSede(e.target.value); setPagina(1); }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-400"
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500 self-center">
          {filtrados.length} nodos
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800">
            <tr>
              <Th col="hostname" label="Hostname" />
              <th className="px-3 py-2 text-left text-xs text-slate-400 uppercase tracking-wider">IP</th>
              <Th col="sede"  label="Sede" />
              <th className="px-3 py-2 text-left text-xs text-slate-400 uppercase tracking-wider">Tipo</th>
              <Th col="estado" label="Estado" />
              <Th col="scoreRiesgo" label="Score" />
              <th className="px-3 py-2 text-left text-xs text-slate-400 uppercase tracking-wider">Aislado</th>
              <th className="px-3 py-2 text-left text-xs text-slate-400 uppercase tracking-wider">Ultima actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {slice.map((n) => (
              <tr key={n.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-slate-300">{n.hostname}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{n.ip}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{n.sede}</td>
                <td className="px-3 py-2 text-xs text-slate-400 capitalize">{n.tipo.replace('_', ' ')}</td>
                <td className={`px-3 py-2 text-xs font-semibold uppercase ${COLOR_ESTADO[n.estado] ?? 'text-slate-400'}`}>
                  {n.estado}
                </td>
                <td className="px-3 py-2 text-xs text-slate-300">{n.scoreRiesgo}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{n.aislado ? 'Si' : 'No'}</td>
                <td className="px-3 py-2 text-xs text-slate-500 font-mono">{formatFecha(n.ultimaActividad)}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500 text-sm">
                  Sin nodos que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Pagina {paginaActual} de {totalPaginas || 1} — mostrando {slice.length} de {filtrados.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual >= totalPaginas}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
