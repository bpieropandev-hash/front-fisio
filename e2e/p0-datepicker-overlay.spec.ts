import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { abrirApp, ehLayoutMobile, estaNoTopo } from './support/helpers';

/**
 * P0-A (spec 12): o DatePicker não pode aparecer sobre modais e o painel precisa abrir no topo, no body,
 * dentro da viewport e em português.
 */

async function abrirAtendimento(page: Page, info: TestInfo): Promise<void> {
  const mobile = ehLayoutMobile(info);
  const alvo = mobile ? page.locator('.agenda-mobile__item').first() : page.locator('.fc-event').first();
  await alvo.waitFor({ state: 'visible' });
  // Com Filtros abertos no celular o .filters-grid intercepta o toque na lista (observado no call log do
  // Playwright; Agenda será recomposta na Fase 5). O clique é despachado ao elemento.
  if (mobile) await alvo.dispatchEvent('click');
  else await alvo.click();
  await expect(page.locator('.p-dialog')).toBeVisible();
}

async function abrirNovoAgendamento(page: Page, info: TestInfo): Promise<void> {
  const gatilho = ehLayoutMobile(info)
    ? page.getByRole('button', { name: 'Novo agendamento' })
    : page.getByRole('button', { name: /Novo Agendamento/ });
  await gatilho.first().click();
  await expect(page.locator('.p-dialog')).toBeVisible();
}

test.describe('P0-A DatePicker e overlays', () => {
  test('campos de data do filtro não ficam acima do modal de atendimento', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    // O nome acessível traz o glifo do ícone antes do texto (" Filtros").
    await page.getByRole('button', { name: /^[^\p{L}]*Filtros$/u }).first().click();
    const campos = page.locator('.filters-card p-datepicker');
    await expect(campos.first()).toBeVisible();

    await abrirAtendimento(page, info);

    const n = await campos.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const host = campos.nth(i);
      const z = await host.evaluate(el => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0);
      // Camadas do app ficam abaixo das do PrimeNG (modal 1100). Nada do app pode chegar perto.
      expect(z, `p-datepicker #${i} do filtro com z-index ${z}`).toBeLessThan(1000);

      const dentroDaViewport = await host.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
      });
      if (dentroDaViewport) {
        const { topo, emModal, cobertoPor } = await estaNoTopo(host.locator('input').first());
        expect(!topo && emModal, `campo #${i} deveria estar sob o modal, mas o topo é ${cobertoPor || 'ele mesmo'}`).toBe(true);
      }
    }
  });

  test('painel do DatePicker abre no topo, fora do diálogo e dentro da viewport', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);

    await page.locator('.p-dialog p-datepicker button').first().click();
    const painel = page.locator('.p-datepicker-panel').first();
    await expect(painel).toBeVisible();

    const geometria = await painel.evaluate(el => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const topo = document.elementFromPoint(x, y);
      return {
        noBody: !el.closest('p-datepicker') && !el.closest('.p-dialog'),
        // 2px de tolerância para arredondamento de subpixel nas bordas.
        dentro: r.left >= -2 && r.top >= -2 && r.right <= window.innerWidth + 2 && r.bottom <= window.innerHeight + 2,
        topoEhPainel: !!topo && el.contains(topo),
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        viewport: [window.innerWidth, window.innerHeight]
      };
    });
    expect(geometria.noBody, 'painel deve ser anexado ao body').toBe(true);
    expect(geometria.dentro, `painel fora da viewport: ${JSON.stringify(geometria)}`).toBe(true);
    expect(geometria.topoEhPainel, 'painel coberto por outro elemento').toBe(true);
  });

  test('lista do Select abre acima do diálogo (z-index global removido)', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);

    await page.locator('.p-dialog .p-select').nth(1).click(); // Serviço
    const overlay = page.locator('.p-select-overlay').first();
    await expect(overlay).toBeVisible();
    const item = overlay.locator('.p-select-option').first();
    await expect(item).toBeVisible();
    const { topo, cobertoPor } = await estaNoTopo(item);
    expect(topo, `opção coberta por ${cobertoPor}`).toBe(true);
  });

  test('calendário do DatePicker está em português', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);
    await page.locator('.p-dialog p-datepicker button').first().click();
    const painel = page.locator('.p-datepicker-panel').first();
    await expect(painel).toBeVisible();
    const texto = (await painel.innerText()).toLowerCase();
    expect(texto).toMatch(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/);
    expect(texto).not.toMatch(/\btoday\b|\bclear\b|\bsu\b/);
  });
});
