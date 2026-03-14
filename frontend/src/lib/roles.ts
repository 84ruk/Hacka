/**
 * Roles con permisos de administración (gestión de usuarios, etc.).
 * SUPERADMIN y ADMIN pueden acceder a /users y acciones de admin.
 */
export function isAdminOrSuperadmin(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}
