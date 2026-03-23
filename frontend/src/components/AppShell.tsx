'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { Navbar } from '@/components/Navbar';

/**
 * Envuelve la app con AuthProvider y ToastProvider.
 * Toasts globales (éxito/error) reutilizan el estilo de Alert y son accesibles.
 * La ruta /arcashield usa layout de pantalla completa (sin navbar ni container).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/arcashield')) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <Navbar />
        <main className="container mx-auto max-w-4xl px-4 py-8">{children}</main>
      </ToastProvider>
    </AuthProvider>
  );
}
