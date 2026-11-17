import { expect, test } from '@playwright/test';
import { abrirApp, ehLayoutMobile } from './support/helpers';

test.describe('Agenda mobile: último atendimento clicável', () => {
  test.beforeEach(({}, info) => {
    test.skip(!ehLayoutMobile(info), 'FAB e lista só existem no layout de celular');
  });

  test('ao rolar até o fim, o FAB não cobre o último card', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await expect(page.locator('.agenda-mobile__item').first()).toBeVisible();
    // A lista simulada tem 1 item e a página não rola: clona cards para reproduzir o dia cheio.
    await page.evaluate(() => {
      const lista = document.querySelector('.agenda-mobile__lista')!;
      const modelo = lista.querySelector('.agenda-mobile__item')!;
      for (let i = 0; i < 12; i++) lista.appendChild(modelo.cloneNode(true));
    });
    const ultimo = page.locator('.agenda-mobile__item').last();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const fab = page.locator('.agenda-mobile__fab');
    await expect(fab).toBeVisible();
    const c = (await ultimo.boundingBox())!;
    const f = (await fab.boundingBox())!;
    const sobrepoe = c.x < f.x + f.width && c.x + c.width > f.x && c.y < f.y + f.height && c.y + c.height > f.y;
    expect(sobrepoe, 'FAB sobrepõe o último atendimento').toBe(false);
  });
});

test.describe('Dashboard: ocultar valores', () => {
  test('botão de olho mascara faturamento e persiste após recarregar', async ({ page }, info) => {
    await abrirApp(page, '/dashboard', info);
    const toggle = page.getByRole('button', { name: /ocultar valores|mostrar valores/i }).first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Mostrar valores' }).first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main')).toContainText('••••');
    await expect(page.locator('main')).not.toContainText('R$');
    await page.reload();
    await expect(page.locator('main')).toContainText('••••');
  });
});
