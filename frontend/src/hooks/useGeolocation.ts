'use client';

import { useState, useCallback } from 'react';

interface Coords {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  coords: Coords | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: 'Tu navegador no soporta geolocalización.',
      }));
      return;
    }

    setState({ coords: null, loading: true, error: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          loading: false,
          error: null,
        });
      },
      () => {
        setState({
          coords: null,
          loading: false,
          error: 'No se pudo obtener tu ubicación. Verifica los permisos del navegador.',
        });
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { ...state, request };
}
