'use client';

import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const roleVariant = 'default';
  const statusVariant =
    user.status === 'ACTIVE'
      ? 'success'
      : user.status === 'SUSPENDED'
        ? 'destructive'
        : 'warning';

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mi perfil
          </h1>
          <p className="mt-1 text-slate-600">Datos de tu cuenta</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Nombre</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{user.firstName || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Apellido</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{user.lastName || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Rol</dt>
                <dd className="mt-1">
                  <Badge variant={roleVariant}>{user.role}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Estado</dt>
                <dd className="mt-1">
                  <Badge variant={statusVariant}>{user.status}</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
