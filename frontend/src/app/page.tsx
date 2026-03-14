import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export default function HomePage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Bienvenido
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Usa el menú para iniciar sesión, registrarte o acceder al dashboard y perfil.
          </p>
        </div>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Acceso</CardTitle>
            <CardDescription>Elige una opción para continuar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-base font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-transparent px-6 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Registrarse
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
