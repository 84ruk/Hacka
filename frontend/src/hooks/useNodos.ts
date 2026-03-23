'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, Nodo, ResumenNodos } from '../lib/arcashield-api';

export function useNodos(intervalo = 5000) {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [resumen, setResumen] = useState<ResumenNodos | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [todosNodos, resumenData] = await Promise.all([
        api.getNodos(),
        api.getResumenNodos(),
      ]);
      setNodos(todosNodos);
      setResumen(resumenData);
    } catch (e) {
      console.error('Error cargando nodos:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, intervalo);
    return () => clearInterval(timer);
  }, [cargar, intervalo]);

  return { nodos, resumen, cargando, recargar: cargar };
}
