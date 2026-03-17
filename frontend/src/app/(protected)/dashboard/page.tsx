'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrSuperadmin } from '@/lib/roles';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600">
            Hola, {user?.firstName || user?.email}. Has accedido al área protegida.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
            <CardDescription>Navega a tu perfil o gestiona usuarios (admin)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/reports/new"
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Crear reporte
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-slate-300 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Mis reportes
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-slate-300 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Ver perfil
            </Link>
            {user && isAdminOrSuperadmin(user.role) && (
              <>
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-slate-300 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  Panel de reportes
                </Link>
                <Link
                  href="/users"
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-slate-300 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  Gestionar usuarios
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
