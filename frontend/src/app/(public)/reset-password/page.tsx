'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button, Input, Label, Alert } from '@/components/ui';

const schema = z.object({
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  });

  useEffect(() => {
    if (!token) setError('Falta el token de restablecimiento. Usa el enlace del email.');
  }, [token]);

  const onSubmit = handleSubmit(async (data) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, data.newPassword);
      setSuccess(true);
      toast.success('Ya puedes iniciar sesión con tu nueva contraseña.', {
        title: 'Contraseña actualizada',
        duration: 6000,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Token inválido o expirado');
    } finally {
      setLoading(false);
    }
  });

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Nueva contraseña</CardTitle>
            <CardDescription>
              Elige una contraseña nueva para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert variant="success" title="Contraseña actualizada">
                Ya puedes iniciar sesión con tu nueva contraseña.
                <Link
                  href="/login"
                  className="ml-1 font-medium underline"
                >
                  Ir a login
                </Link>
              </Alert>
            ) : !token ? (
              <Alert variant="error">
                Falta el token. Usa el enlace que te enviamos por email.
              </Alert>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                {error && <Alert variant="error">{error}</Alert>}
                <div>
                  <Label htmlFor="reset-newPassword">Nueva contraseña</Label>
                  <Input
                    id="reset-newPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.newPassword}
                    aria-describedby={errors.newPassword ? 'reset-pw-error' : undefined}
                    className="mt-1"
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p id="reset-pw-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={loading}
                  disabled={loading}
                >
                  Guardar contraseña
                </Button>
              </form>
            )}
            <p className="mt-5 text-center text-sm text-slate-600">
              <Link
                href="/login"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Cargando...
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
