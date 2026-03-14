'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPassword } from '@/lib/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button, Input, Label, Alert } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Email no válido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Error al enviar el enlace');
    } finally {
      setLoading(false);
    }
  });

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>
              Introduce tu email y te enviaremos un enlace para restablecer la contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert variant="success" title="Enlace enviado">
                Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
              </Alert>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                {error && <Alert variant="error">{error}</Alert>}
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                    className="mt-1"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p id="forgot-email-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.email.message}
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
                  Enviar enlace
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
