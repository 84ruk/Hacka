import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Admin123!';

test.describe('Users and profile', () => {
  test('Login USER → /users shows 403 UX', async ({ page }) => {
    const email = `user-403-${Date.now()}@test.com`;
    const password = 'Password123!';

    await page.goto('/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).first().fill(password);
    await page.getByRole('button', { name: /registrarse/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/users');
    await expect(page.getByText(/sin permisos/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /ir al dashboard/i })).toBeVisible();
  });

  test('Login ADMIN → /users list and change status', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByLabel(/contraseña/i).fill(adminPassword);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /usuarios/i })).toBeVisible();
    await expect(page.getByText(/crear usuario/i)).toBeVisible();

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    const statusSelect = table.locator('tbody select').first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('INACTIVE');
    await expect(statusSelect).toHaveValue('INACTIVE');
  });

  test('/profile shows user data', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByLabel(/contraseña/i).fill(adminPassword);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();
    await expect(page.getByText('ADMIN')).toBeVisible();
  });
});
