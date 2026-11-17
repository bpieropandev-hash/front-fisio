import { expect, test } from '@playwright/test';
import { abrirApp, larguraDoProjeto, semOverflowHorizontal } from './support/helpers';

/**
 * Shell (spec 12): ≤640 bottom-nav; 641–1100 rail de ícones; >1100 sidebar completa.
 * Smoke de todas as rotas autenticadas: sem rolagem horizontal e sem erro de JavaScript.
 */
const ROTAS = [
  '/dashboard', '/agenda', '/pacientes', '/servicos',
  '/financeiro/assinaturas', '/financeiro/cobrancas', '/relatorios', '/perfil'
];

test.describe('Shell responsivo', () => {
  test('navegação correta para a largura', async ({ page }, info) => {
    const w = larguraDoProjeto(info);
    await abrirApp(page, '/dashboard', info);

    const sidebar = page.locator('app-sidebar .sidebar');
    const bottomNav = page.locator('app-bottom-nav .bottom-nav');

    if (w <= 640) {
      await expect(bottomNav).toBeVisible();
      await expect(sidebar).toHaveCount(0);
    } else {
      await expect(bottomNav).toHaveCount(0);
      await expect(sidebar).toBeVisible();
      const largura = (await sidebar.boundingBox())!.width;
      if (w <= 1100) {
        await expect(sidebar).toHaveClass(/sidebar--compacto/);
        expect(largura).toBeLessThanOrEqual(72);
        await expect(sidebar.locator('.sidebar__rotulo').first()).toBeHidden();
      } else {
        await expect(sidebar).not.toHaveClass(/sidebar--compacto/);
        expect(largura).toBeGreaterThanOrEqual(220);
        await expect(sidebar.getByRole('link', { name: 'Agenda' })).toBeVisible();
      }
      // item atual marcado para tecnologia assistiva
      await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1);
    }
  });

  test('sidebar navega entre telas', async ({ page }, info) => {
    test.skip(larguraDoProjeto(info) <= 640, 'bottom-nav tem teste próprio');
    await abrirApp(page, '/dashboard', info);
    await page.locator('app-sidebar a[href="/pacientes"]').click();
    await expect(page).toHaveURL(/\/pacientes$/);
    await expect(page.locator('app-sidebar a[aria-current="page"]')).toHaveAttribute('href', '/pacientes');
  });
});

test.describe('Smoke das rotas', () => {
  for (const rota of ROTAS) {
    test(`${rota}: sem overflow horizontal e sem erro de página`, async ({ page }, info) => {
      const erros: string[] = [];
      page.on('pageerror', e => erros.push(e.message));
      await abrirApp(page, rota, info);
      await page.waitForTimeout(400);

      const { scrollWidth, innerWidth } = await semOverflowHorizontal(page);
      expect(scrollWidth, `scrollWidth ${scrollWidth} > viewport ${innerWidth}`).toBeLessThanOrEqual(innerWidth + 1);
      expect(erros, erros.join('\n')).toEqual([]);
    });
  }
});
