'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { Navbar } from '@/components/Navbar';

/**
 * Envuelve la app con AuthProvider y ToastProvider.
 * Toasts globales (éxito/error) reutilizan el estilo de Alert y son accesibles.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-8">{children}</main>
      </ToastProvider>
    </AuthProvider>
  );
}
