import { chromium } from '@playwright/test';

export async function ensureLocalAuthUser(baseUrl: string, email: string, password: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByTestId('local-auth-submit').click();
    await Promise.race([
      page.waitForURL((url: URL) => !url.pathname.endsWith('/auth/login')),
      page.getByRole('heading', { name: /you're signed in/i }).waitFor(),
    ]);
  } finally {
    await browser.close();
  }
}
