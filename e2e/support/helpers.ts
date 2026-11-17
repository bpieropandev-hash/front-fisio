import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { prepararSessao } from './mock-api';

export type Tema = 'light' | 'dark';

export const temaDoProjeto = (info: TestInfo): Tema => (info.project.metadata['tema'] as Tema) ?? 'light';
export const larguraDoProjeto = (info: TestInfo): number => Number(info.project.metadata['largura']);
/** O app usa o layout de celular até 768px (spec 10; será revisto na fase 4). */
export const ehLayoutMobile = (info: TestInfo): boolean => larguraDoProjeto(info) <= 768;

export async function abrirApp(page: Page, rota: string, info: TestInfo): Promise<void> {
  await prepararSessao(page, temaDoProjeto(info));
  await page.goto(rota);
  await page.waitForLoadState('networkidle');
}

/** Sem rolagem horizontal da página inteira. */
export async function semOverflowHorizontal(page: Page): Promise<{ scrollWidth: number; innerWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
}

/**
 * O elemento no centro do locator é o próprio locator (ou descendente)? Detecta o que o cobre.
 * `emModal`: o que está no topo pertence à máscara/diálogo do PrimeNG (cobertura legítima).
 */
export async function estaNoTopo(alvo: Locator): Promise<{ topo: boolean; emModal: boolean; cobertoPor: string }> {
  return alvo.evaluate(el => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const topo = document.elementFromPoint(x, y);
    const ok = !!topo && (el === topo || el.contains(topo));
    const emModal = !!topo && !!topo.closest('.p-dialog-mask, .p-dialog');
    const rotulo = topo ? `${topo.tagName.toLowerCase()}.${String((topo as HTMLElement).className).slice(0, 40)}` : 'nada';
    return { topo: ok, emModal, cobertoPor: ok ? '' : rotulo };
  });
}

export async function caixa(alvo: Locator) {
  const box = await alvo.boundingBox();
  expect(box, 'elemento precisa estar visível').not.toBeNull();
  return box!;
}

export const sobrepoe = (a: { x: number; y: number; width: number; height: number },
                         b: { x: number; y: number; width: number; height: number }): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
