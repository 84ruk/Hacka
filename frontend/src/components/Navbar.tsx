'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrSuperadmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';

const navLinkClass = (active: boolean) =>
  `text-sm font-medium rounded-[var(--radius-sm)] px-3 py-2 transition-colors ${
    active
      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--card)] shadow-[var(--shadow)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`${navLinkClass(pathname === '/')} font-semibold`}
          >
            Inicio
          </Link>
          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className={navLinkClass(pathname === '/dashboard')}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className={navLinkClass(pathname === '/profile')}
              >
                Perfil
              </Link>
              {isAdminOrSuperadmin(user.role) && (
                <Link
                  href="/users"
                  className={navLinkClass(pathname === '/users')}
                >
                  Usuarios
                </Link>
              )}
            </>
          )}
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className={navLinkClass(pathname === '/login')}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className={navLinkClass(pathname === '/register')}
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
        {!loading && user && (
          <div className="flex items-center gap-3">
            <span
              className="hidden max-w-[140px] truncate text-sm text-slate-500 sm:inline"
              title={user.email}
            >
              {user.email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logout()}
            >
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
