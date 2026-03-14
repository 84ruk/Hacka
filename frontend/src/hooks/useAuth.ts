'use client';

/**
 * Re-exporta useAuth desde el contexto para una única fuente de verdad.
 * Debe usarse dentro de AuthProvider (proporcionado por AppShell en el layout).
 */
export { useAuth } from '@/context/AuthContext';
