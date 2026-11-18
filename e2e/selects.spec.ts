import { expect, test, type Page } from '@playwright/test';
import { abrirApp, ehLayoutMobile } from './support/helpers';

/** Regressão: rótulo de select quebrado letra por letra e painéis de select com dois scrolls. */

async function containersComScroll(page: Page, seletorOverlay: string): Promise<string[]> {
  return page.locator(seletorOverlay).first().evaluate(overlay => {
    const lista: string[] = [];
    [overlay, ...Array.from(overlay.querySelectorAll('*'))].forEach(e => {
      const el = e as HTMLElement;
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) lista.push(el.className.toString().slice(0, 40));
    });
    return lista;
  });
}

test.describe('Selects', () => {
  test('diálogo de nova assinatura: o select de serviço mostra o texto em uma linha legível', async ({ page }, info) => {
    await abrirApp(page, '/financeiro/assinaturas?nova=true', info);
    const select = page.locator('.p-dialog .p-select', { hasText: 'Selecione o serviço' }).first();
    await expect(select).toBeVisible();
    const rotulo = select.locator('.p-select-label');
    const caixa = (await rotulo.boundingBox())!;
    expect(caixa.width, 'rótulo estreito demais (texto quebrado letra por letra)').toBeGreaterThan(90);
    expect(caixa.height, 'rótulo alto demais').toBeLessThan(90);
    expect((await select.boundingBox())!.height).toBeLessThan(90);
  });

  test('painel do select de horário tem um único scroll', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const gatilho = ehLayoutMobile(info)
      ? page.getByRole('button', { name: 'Novo agendamento' })
      : page.getByRole('button', { name: /Novo agendamento/ });
    await gatilho.first().click();
    await page.getByRole('combobox', { name: 'Horário' }).click();
    await expect(page.locator('.p-select-overlay').first()).toBeVisible();
    const scrolls = await containersComScroll(page, '.p-select-overlay');
    expect(scrolls, `containers de scroll no painel: ${scrolls.join(', ')}`).toHaveLength(1);
  });
});
