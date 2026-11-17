import { expect, test } from '@playwright/test';
import { semOverflowHorizontal, temaDoProjeto } from './support/helpers';

/** Telas públicas de autenticação (spec 12): login, esqueci e redefinir senha. Sem sessão e sem backend. */
const ROTAS = ['/login', '/esqueci-senha', '/redefinir-senha?token=teste'];

test.describe('Autenticação', () => {
  for (const rota of ROTAS) {
    test(`${rota}: layout sem overflow, alvos de 44px e foco visível`, async ({ page }, info) => {
      const tema = temaDoProjeto(info);
      await page.addInitScript((t: string) => localStorage.setItem('app-theme', t), tema);
      await page.route('http://localhost:8080/**', route => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      await page.goto(rota);
      await expect(page.locator('.login-form')).toBeVisible();

      const { scrollWidth, innerWidth } = await semOverflowHorizontal(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);

      const pequenos = await page.evaluate(() =>
        [...document.querySelectorAll('.login-form input, .login-form button')]
          .filter(e => e.getBoundingClientRect().height < 43.5)
          .map(e => `${e.tagName} ${Math.round(e.getBoundingClientRect().height)}px`));
      expect(pequenos).toEqual([]);

      // Tab chega no primeiro campo e o foco tem contorno visível (não pode ser outline: none)
      await page.keyboard.press('Tab');
      const foco = await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        return { tag: e.tagName, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth };
      });
      expect(foco, 'nenhum elemento recebeu foco com Tab').not.toBeNull();
      expect(foco!.outlineStyle).not.toBe('none');
    });
  }
});
