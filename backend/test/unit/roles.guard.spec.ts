import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user: { role?: Role } | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acceso cuando no hay @Roles (requiredRoles vacío)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({ role: Role.USER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acceso cuando usuario tiene role ADMIN y se requiere ADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext({ role: Role.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acceso cuando usuario tiene SUPERADMIN y se requiere ADMIN o SUPERADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.SUPERADMIN]);
    const ctx = createMockContext({ role: Role.SUPERADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloquea con ForbiddenException cuando @Roles(ADMIN) y usuario es USER', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext({ role: Role.USER });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Insufficient permissions');
  });

  it('bloquea cuando user no tiene role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext({});

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
