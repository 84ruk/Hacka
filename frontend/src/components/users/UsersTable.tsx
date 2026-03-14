'use client';

import { useState } from 'react';
import type { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Alert, Badge } from '@/components/ui';
import { Spinner } from '@/components/ui/Spinner';

export type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type UsersTableProps = {
  users: UserRow[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  error?: string | null;
};

const statusVariant = (status: string) =>
  status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'destructive' : 'warning';

export function UsersTable({
  users,
  onStatusChange,
  error: externalError,
}: UsersTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    setError(null);
    setUpdatingId(id);
    try {
      await onStatusChange(id, status);
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e.message || 'Error al actualizar');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      {(externalError || error) && (
        <div className="border-b border-[var(--card-border)] bg-red-50 px-4 py-3">
          <Alert variant="error" className="mb-0 border-0 bg-transparent p-0">
            {externalError ?? error}
          </Alert>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Nombre
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Rol
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Estado
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No hay usuarios. Crea uno desde el formulario de arriba.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.status}
                      disabled={updatingId === u.id}
                      aria-label={`Cambiar estado de ${u.email}`}
                      className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none disabled:opacity-50"
                      onChange={(e) => handleStatusChange(u.id, e.target.value)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                    {updatingId === u.id && (
                      <Spinner className="ml-2 inline-block size-4" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
