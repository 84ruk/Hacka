'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { login } from '@/lib/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await login(email, password);
      setUser(data.user);
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Introduce tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm onSubmit={handleSubmit} loading={loading} />
            <p className="mt-5 text-center text-sm text-slate-600">
              ¿Olvidaste tu contraseña?{' '}
              <Link
                href="/forgot-password"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Recuperar
              </Link>
            </p>
            <p className="mt-3 text-center text-sm text-slate-600">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Regístrate
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
