import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { abrirApp, ehLayoutMobile, estaNoTopo } from './support/helpers';

/**
 * P0-A (spec 12): campos de data não podem ficar acima de modais; datas são digitadas com máscara (sem pop-up).
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

test.describe('P0-A Campos de data e overlays', () => {
  test('campos de data do filtro não ficam acima do modal de atendimento', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    // O nome acessível traz o glifo do ícone antes do texto (" Filtros").
    await page.getByRole('button', { name: /^[^\p{L}]*Filtros$/u }).first().click();
    const campos = page.locator('.filters-card app-date-field');
    await expect(campos.first()).toBeVisible();

    await abrirAtendimento(page, info);

    const n = await campos.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const host = campos.nth(i);
      const z = await host.evaluate(el => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0);
      // Camadas do app ficam abaixo das do PrimeNG (modal 1100). Nada do app pode chegar perto.
      expect(z, `app-date-field #${i} do filtro com z-index ${z}`).toBeLessThan(1000);

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

  test('data do agendamento é digitada com máscara, sem calendário em pop-up', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);

    const campo = page.locator('.p-dialog app-date-field input').first();
    await expect(campo).toBeVisible();
    await expect(campo).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    await campo.fill('');
    await campo.pressSequentially('17112026');
    await expect(campo).toHaveValue('17/11/2026');
    await expect(campo).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.p-datepicker-panel')).toHaveCount(0);

    await campo.fill('');
    await campo.pressSequentially('31022026');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
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
});
