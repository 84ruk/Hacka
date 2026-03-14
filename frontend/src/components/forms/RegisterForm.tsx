'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Alert } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type RegisterFormProps = {
  onSubmit: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export function RegisterForm({
  onSubmit,
  loading = false,
  error: externalError,
}: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit({
        email: data.email,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        setError('email', { message: 'Este email ya está registrado' });
      } else {
        setError('root', { message: e.message || 'Error al registrarse' });
      }
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
      {(externalError || errors.root) && (
        <Alert variant="error">
          {externalError ?? errors.root?.message}
        </Alert>
      )}
      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'reg-email-error' : undefined}
          className="mt-1"
          {...register('email')}
        />
        {errors.email && (
          <p id="reg-email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="reg-password">Contraseña</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'reg-password-error' : undefined}
          className="mt-1"
          {...register('password')}
        />
        {errors.password && (
          <p id="reg-password-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="reg-firstName">Nombre (opcional)</Label>
        <Input
          id="reg-firstName"
          type="text"
          autoComplete="given-name"
          className="mt-1"
          {...register('firstName')}
        />
      </div>
      <div>
        <Label htmlFor="reg-lastName">Apellido (opcional)</Label>
        <Input
          id="reg-lastName"
          type="text"
          autoComplete="family-name"
          className="mt-1"
          {...register('lastName')}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={loading}
        disabled={loading}
      >
        {loading ? 'Registrando...' : 'Registrarse'}
      </Button>
    </form>
  );
}
