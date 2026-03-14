'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrSuperadmin } from '@/lib/roles';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Spinner } from '@/components/ui';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

/**
 * Guard CSR: si no hay sesión válida redirige a /login.
 * Si requireAdmin y el usuario no es ADMIN ni SUPERADMIN, muestra 403 UX y link a dashboard.
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && !isAdminOrSuperadmin(user.role)) {
      return;
    }
  }, [user, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-12">
        <Spinner className="size-8 text-[var(--primary)]" />
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdminOrSuperadmin(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-amber-800">
              Sin permisos
            </h2>
            <p className="mt-2 text-sm text-amber-700">
              No tienes permisos para acceder a esta página.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="primary" size="md">
                Ir al Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
