import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('Register → dashboard', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;
    const password = 'Password123!';

    await page.goto('/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).first().fill(password);
    await page.getByRole('button', { name: /registrarse/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('Logout → redirect login', async ({ page }) => {
    const email = `e2e-logout-${Date.now()}@test.com`;
    const password = 'Password123!';

    await page.goto('/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).first().fill(password);
    await page.getByRole('button', { name: /registrarse/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });
});
