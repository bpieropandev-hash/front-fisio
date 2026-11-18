import { expect, test, type Page } from '@playwright/test';
import { abrirApp, ehLayoutMobile, semOverflowHorizontal } from './support/helpers';

/**
 * Fila de evoluções do dia: o aviso da agenda abre a fila com os atendimentos de hoje que já começaram
 * e continuam AGENDADOS; concluir salva a ficha e marca o atendimento como CONCLUIDO.
 */

/** Fixa "agora" às 18h do dia local para o atendimento das 14h do mock estar sempre pendente. */
async function fixarAgora(page: Page): Promise<void> {
  const d = new Date(); d.setHours(18, 0, 0, 0);
  await page.clock.setFixedTime(d);
}

test.describe('Agenda · fila de evoluções', () => {
  test('aviso abre a fila; concluir sem evolução é bloqueado; evoluir salva a ficha e conclui o atendimento', async ({ page }, info) => {
    await fixarAgora(page);
    await abrirApp(page, '/agenda', info);

    const chamadas: { metodo: string; url: string; corpo: unknown }[] = [];
    await page.route('**/api/v1/agendamentos/1**', async route => {
      const req = route.request();
      if (req.method() === 'GET' && req.url().includes('evolucao-estruturada')) return route.fallback();
      if (req.method() === 'GET') return route.fallback();
      chamadas.push({ metodo: req.method(), url: req.url(), corpo: req.postDataJSON() });
      const corpo = req.url().includes('evolucao-estruturada')
        ? { versao: 2, procedimentos: ['ALONGAMENTO'], equipamentos: [], pressaoSistolica: null, pressaoDiastolica: null, dor: null, observacoes: '', resumo: 'Alongamento', autor: 'Dra. Teste', atualizadoEm: '2026-11-18T18:00:00' }
        : { id: 1, status: 'CONCLUIDO' };
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) });
    });

    const aviso = page.getByRole('status', { name: 'Evoluções pendentes' });
    await expect(aviso).toContainText('sem evolução');
    await aviso.getByRole('button', { name: /Evoluir agora/ }).click();

    const fila = page.getByRole('dialog', { name: 'Evoluções de hoje' });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('0 de 1 atendimentos evoluídos');
    const vp = page.viewportSize()!;
    const caixa = (await fila.boundingBox())!;
    expect(caixa.x).toBeGreaterThanOrEqual(-1);
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(vp.width + 1);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(vp.height + 1);
    if (ehLayoutMobile(info)) await expect(fila.locator('.fila__chip')).toBeVisible();
    else await expect(fila.locator('.fila__item')).toBeVisible();

    // sem evolução: bloqueia e nada é gravado
    await fila.getByRole('button', { name: /Concluir e próxima/ }).click();
    await expect(page.getByText('Evolução é obrigatória para concluir o atendimento')).toBeVisible();
    expect(chamadas).toHaveLength(0);

    // evolui: marca um procedimento e conclui (salva a ficha e depois o status)
    await fila.getByText('Alongamento', { exact: true }).click();
    await fila.getByRole('button', { name: /Concluir e próxima/ }).click();
    await expect(fila).toContainText('Tudo em dia');
    await expect(fila).toContainText('1 de 1 atendimentos evoluídos');
    expect(chamadas.map(c => `${c.metodo} ${new URL(c.url).pathname.replace('/api/v1/agendamentos/', '')}`)).toEqual(['PUT 1/evolucao-estruturada', 'PUT 1']);
    expect(chamadas[1].corpo).toMatchObject({ status: 'CONCLUIDO' });

    await fila.getByRole('button', { name: 'Voltar à agenda' }).click();
    await expect(fila).toBeHidden();
    const { scrollWidth, innerWidth } = await semOverflowHorizontal(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
  });

  test('sem pendências o aviso não aparece', async ({ page }, info) => {
    const d = new Date(); d.setHours(5, 0, 0, 0);
    await page.clock.setFixedTime(d); // antes do atendimento das 14h
    await abrirApp(page, '/agenda', info);
    await expect(page.getByRole('status', { name: 'Evoluções pendentes' })).toHaveCount(0);
  });
});
