'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrSuperadmin } from '@/lib/roles';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UsersTable, type UserRow } from '@/components/users/UsersTable';
import { PageContainer } from '@/components/layout/PageContainer';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button, Input, Label, Alert, Spinner, Skeleton } from '@/components/ui';

type UsersResponse = { data: UserRow[]; total: number };

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    if (authLoading || !user || !isAdminOrSuperadmin(user.role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api<UsersResponse>('/users');
    if ('error' in result) {
      if (result.error.status === 403) {
        setError('No tienes permisos');
      } else {
        setError(result.error.message);
      }
      setUsers([]);
    } else {
      setUsers(result.data.data);
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (id: string, status: string) => {
    const result = await api<unknown>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if ('error' in result) throw result.error;
    await fetchUsers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    const result = await api<UserRow>('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: createEmail.trim(),
        password: createPassword,
      }),
    });
    if ('error' in result) {
      if (result.error.status === 409) {
        setCreateError('Este email ya existe');
      } else {
        setCreateError(result.error.message);
      }
      setCreateLoading(false);
      return;
    }
    setCreateEmail('');
    setCreatePassword('');
    setCreateLoading(false);
    toast.success('Usuario creado correctamente.', { title: 'Usuario creado' });
    await fetchUsers();
  };

  return (
    <ProtectedRoute requireAdmin>
      <PageContainer>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Usuarios
            </h1>
            <p className="mt-1 text-slate-600">Gestiona los usuarios (solo admin)</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Crear usuario</CardTitle>
              <CardDescription>Añade un nuevo usuario con email y contraseña</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="mt-1"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="min-w-[180px] flex-1">
                  <Label htmlFor="create-password">Contraseña</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="mt-1"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={createLoading}
                  disabled={createLoading}
                >
                  {createLoading ? 'Creando...' : 'Crear'}
                </Button>
              </form>
              {createError && (
                <Alert variant="error" className="mt-4">
                  {createError}
                </Alert>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Spinner className="size-8" />
                  <p className="text-sm text-slate-500">Cargando usuarios...</p>
                  <div className="w-full space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <UsersTable
              users={users}
              onStatusChange={handleStatusChange}
              error={error}
            />
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
