import { expect, test } from '@playwright/test';
import { abrirApp, caixa, ehLayoutMobile, semOverflowHorizontal, sobrepoe } from './support/helpers';

/**
 * P0-B (spec 12): em Cobranças no layout de celular, "Estornar baixa" e "Recibo" não podem quebrar
 * o texto em linhas de uma letra nem esmagar o valor; alvos de toque >= 44px; sem scroll horizontal.
 */
test.describe('P0-B Cobranças no celular', () => {
  test.beforeEach(({}, info) => {
    test.skip(!ehLayoutMobile(info), 'layout de lista só existe até 768px');
  });

  test('ações de uma cobrança paga ficam legíveis e sem sobreposição', async ({ page }, info) => {
    await abrirApp(page, '/financeiro/cobrancas', info);

    const item = page.locator('.fin-mobile__item', { has: page.getByRole('button', { name: /Recibo/ }) }).first();
    await expect(item).toBeVisible();

    const recibo = item.getByRole('button', { name: /Recibo/ });
    const estorno = item.getByRole('button', { name: /Estornar baixa/ });
    const valor = item.locator('.fin-mobile__item-valor');

    const caixas = { recibo: await caixa(recibo), estorno: await caixa(estorno), valor: await caixa(valor) };

    for (const [nome, c] of Object.entries({ recibo: caixas.recibo, estorno: caixas.estorno })) {
      expect(c.width, `${nome}: largura ${c.width}px (texto na vertical?)`).toBeGreaterThanOrEqual(72);
      expect(c.height, `${nome}: altura ${c.height}px (rótulo quebrado em várias linhas?)`).toBeLessThanOrEqual(60);
      expect(c.height, `${nome}: alvo de toque < 44px`).toBeGreaterThanOrEqual(44);
    }

    expect(sobrepoe(caixas.recibo, caixas.estorno), 'Recibo e Estornar baixa se sobrepõem').toBe(false);
    expect(sobrepoe(caixas.recibo, caixas.valor), 'Recibo sobrepõe o valor').toBe(false);
    expect(sobrepoe(caixas.estorno, caixas.valor), 'Estornar baixa sobrepõe o valor').toBe(false);

    const { scrollWidth, innerWidth } = await semOverflowHorizontal(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
  });
});
