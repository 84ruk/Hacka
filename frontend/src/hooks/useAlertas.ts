'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, Alerta } from '../lib/arcashield-api';

export function useAlertas(intervalo = 5000) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await api.getAlertas({ atendida: 'false', limite: '500' });
      setAlertas(data);
    } catch (e) {
      console.error('Error cargando alertas:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, intervalo);
    return () => clearInterval(timer);
  }, [cargar, intervalo]);

  return { alertas, cargando, recargar: cargar };
}
