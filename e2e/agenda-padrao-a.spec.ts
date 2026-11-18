import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { abrirApp, ehLayoutMobile, estaNoTopo, larguraDoProjeto, semOverflowHorizontal } from './support/helpers';

/**
 * Agenda no padrão A (dia em linha do tempo): bloco do atendimento, gaveta de detalhe, modal de novo
 * agendamento com datas digitadas, criação por horário vazio, navegação de dia, filtros e cancelamento.
 */

async function abrirNovoAgendamento(page: Page, info: TestInfo): Promise<void> {
  const gatilho = ehLayoutMobile(info)
    ? page.getByRole('button', { name: 'Novo agendamento' })
    : page.getByRole('button', { name: /Novo agendamento/ });
  await gatilho.first().click();
  await expect(page.getByRole('dialog', { name: 'Novo agendamento' })).toBeVisible();
}

const dentroDaViewport = (page: Page, alvo: ReturnType<Page['locator']>) =>
  alvo.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.top >= -1 && r.left >= -1 && r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1;
  });

test.describe('Agenda · linha do tempo', () => {
  test('mostra o atendimento de hoje como bloco acessível e abre o detalhe por cima', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const bloco = page.locator('.tl__bloco', { hasText: '14:00' });
    await expect(bloco).toBeVisible();
    await expect(bloco).toHaveAccessibleName(/14:00.*Pilates Mensal/);

    await bloco.click();
    const gaveta = page.getByRole('dialog').first();
    await expect(gaveta).toBeVisible();
    expect(await dentroDaViewport(page, gaveta), 'detalhe fora da viewport').toBe(true);
    // Desktop: gaveta colada à direita; celular: folha encostada embaixo.
    const caixa = (await gaveta.boundingBox())!;
    const vp = page.viewportSize()!;
    // Tolerância de 2px: alturas em dvh arredondam de forma diferente entre navegadores.
    if (ehLayoutMobile(info)) expect(Math.abs(caixa.y + caixa.height - vp.height)).toBeLessThanOrEqual(2);
    else expect(Math.abs(caixa.x + caixa.width - vp.width)).toBeLessThanOrEqual(2);
    const { topo, emModal } = await estaNoTopo(gaveta.locator('.p-dialog-title, .p-dialog-header').first());
    expect(topo || emModal).toBe(true);
  });

  test('"Novo agendamento" abre o modal inteiro dentro da tela, sem calendário em pop-up', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);
    const modal = page.getByRole('dialog', { name: 'Novo agendamento' });
    expect(await dentroDaViewport(page, modal), 'modal fora da viewport').toBe(true);
    if (ehLayoutMobile(info)) {
      const caixa = (await modal.boundingBox())!;
      expect(Math.abs(caixa.y + caixa.height - page.viewportSize()!.height)).toBeLessThanOrEqual(2);
    }
    await expect(page.locator('.p-datepicker-panel')).toHaveCount(0);
  });

  test('data digitada com máscara e validação de data inexistente', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);
    const campo = page.locator('#novo-data');
    await expect(campo).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    await campo.fill('');
    await campo.pressSequentially('17112026');
    await expect(campo).toHaveValue('17/11/2026');
    await expect(campo).not.toHaveAttribute('aria-invalid', 'true');
    await campo.fill('');
    await campo.pressSequentially('31022026');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  test('lista do Select abre acima do modal', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    await abrirNovoAgendamento(page, info);
    await page.locator('#novo-servico').click();
    const overlay = page.locator('.p-select-overlay').first();
    await expect(overlay).toBeVisible();
    const item = overlay.locator('.p-select-option').first();
    await expect(item).toBeVisible();
    const { topo, cobertoPor } = await estaNoTopo(item);
    expect(topo, `opção coberta por ${cobertoPor}`).toBe(true);
  });

  test('clicar num horário vazio abre a criação já com o horário', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const pista = page.locator('.tl__pista');
    await expect(pista).toBeVisible();
    const alturaHora = await page.locator('.tl__hora').first().evaluate(el => el.getBoundingClientRect().height);
    const caixa = (await pista.boundingBox())!;
    // A janela padrão começa às 07:00; clica em 10:00 (3 horas abaixo do topo) numa área sem bloco.
    await page.mouse.click(caixa.x + 12, caixa.y + 3 * alturaHora + 2);
    await expect(page.getByRole('dialog', { name: 'Novo agendamento' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Novo agendamento' })).toContainText('10:00');
  });

  test('navega entre dias e volta para hoje', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const titulo = page.locator('.ag__titulo h2');
    await expect(titulo).toContainText('Hoje');
    if (ehLayoutMobile(info)) {
      await page.getByRole('button', { name: 'Próxima semana' }).click();
      await page.locator('.ag__faixa-dia').first().click();
      await expect(titulo).not.toContainText('Hoje');
      await page.getByRole('button', { name: 'Hoje' }).click();
    } else {
      await page.getByRole('button', { name: 'Próximo dia' }).click();
      await expect(titulo).not.toContainText('Hoje');
      await page.getByRole('button', { name: 'Hoje', exact: true }).click();
    }
    await expect(titulo).toContainText('Hoje');
  });

  test('chips de status: um mostra só ele, outros somam, vazio volta a todos', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const chip = (nome: string) => (ehLayoutMobile(info)
      ? page.locator('.ag__chips--rolagem .ag__chip', { hasText: nome })
      : page.locator('.ag__lado .ag__chip', { hasText: nome }));
    const blocos = page.locator('.tl__bloco');
    // Hoje há um atendimento concluído (11:00) e um agendado (14:00); por padrão aparecem os dois.
    await expect(blocos).toHaveCount(2);
    await chip('Agendado').click();
    await expect(blocos).toHaveCount(1);
    await expect(blocos.first()).toContainText('14:00');
    await expect(chip('Concluído')).toHaveAttribute('aria-pressed', 'false');
    await chip('Concluído').click();
    await expect(blocos).toHaveCount(2);
    await chip('Agendado').click();
    await expect(blocos).toHaveCount(1);
    await expect(blocos.first()).toContainText('11:00');
    await chip('Concluído').click();
    await expect(blocos).toHaveCount(2);
    await expect(chip('Agendado')).toHaveAttribute('aria-pressed', 'true');
  });

  test('cancelar atendimento exige confirmação e "Voltar" não altera nada', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    let chamouAtualizacao = false;
    page.on('request', r => { if (r.method() === 'PUT') chamouAtualizacao = true; });
    await page.locator('.tl__bloco', { hasText: '14:00' }).click();
    // Os botões ficam ativos quando a ficha de evolução termina de carregar.
    const cancelar = page.getByRole('button', { name: /Cancelar atendimento/ }).first();
    await expect(cancelar).toBeEnabled();
    await cancelar.click();
    const confirmacao = page.getByRole('dialog', { name: 'Cancelar atendimento?' });
    await expect(confirmacao).toBeVisible();
    await confirmacao.getByRole('button', { name: 'Voltar' }).click();
    await expect(confirmacao).toBeHidden();
    expect(chamouAtualizacao).toBe(false);
  });

  test('sem rolagem lateral e com o fim da linha do tempo acima da barra de navegação', async ({ page }, info) => {
    await abrirApp(page, '/agenda', info);
    const { scrollWidth, innerWidth } = await semOverflowHorizontal(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
    test.skip(larguraDoProjeto(info) > 640, 'a barra inferior só existe até 640px');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const fim = (await page.locator('.tl').boundingBox())!;
    const nav = (await page.locator('app-bottom-nav .bottom-nav').boundingBox())!;
    expect(fim.y + fim.height, 'linha do tempo termina sob a barra inferior').toBeLessThanOrEqual(nav.y + 1);
  });
});
