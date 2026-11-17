import { expect, test } from '@playwright/test';
import { abrirApp, larguraDoProjeto } from './support/helpers';

/** Verificações básicas de acessibilidade (spec 12, fase 8). Não substitui axe nem teste com leitor de tela. */
const ROTAS = ['/dashboard', '/agenda', '/pacientes', '/servicos', '/financeiro/assinaturas', '/financeiro/cobrancas', '/relatorios', '/perfil'];

test.describe('Acessibilidade básica', () => {
  for (const rota of ROTAS) {
    test(`${rota}: controles com nome acessível`, async ({ page }, info) => {
      await abrirApp(page, rota, info);
      await page.waitForTimeout(400);
      const semNome = await page.evaluate(() => {
        const visivel = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        const nome = (e: Element): string => {
          const el = e as HTMLElement;
          const lb = el.getAttribute('aria-labelledby');
          const porId = lb ? lb.split(' ').map(i => document.getElementById(i)?.textContent ?? '').join(' ') : '';
          const rotulo = (el as HTMLInputElement).labels ? [...(el as HTMLInputElement).labels!].map(l => l.textContent).join(' ') : '';
          return (el.getAttribute('aria-label') || porId || rotulo || el.getAttribute('title') || el.getAttribute('placeholder') || el.textContent || (el.querySelector('img')?.getAttribute('alt') ?? '')).trim();
        };
        return [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')]
          .filter(e => visivel(e) && !nome(e))
          .map(e => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).slice(0, 40)}`);
      });
      expect(semNome, `sem nome acessível: ${semNome.join(' | ')}`).toEqual([]);
    });

    test(`${rota}: alvos de toque >= 44px no celular/tablet`, async ({ page }, info) => {
      test.skip(larguraDoProjeto(info) > 768, 'regra de toque vale para celular e tablet');
      await abrirApp(page, rota, info);
      await page.waitForTimeout(400);
      const pequenos = await page.evaluate(() => {
        const alvo = 'button, a.p-button, .p-button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=color]), .p-select';
        return [...document.querySelectorAll(alvo)]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
          // dentro de .p-button só o elemento externo conta; FullCalendar e ícones decorativos ficam fora
          .filter(e => !e.closest('.fc') && !e.parentElement?.closest('.p-button'))
          .filter(e => e.getBoundingClientRect().height < 43.5)
          .map(e => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).replace(/\s+/g, '.').slice(0, 40)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      });
      expect(pequenos, `alvos < 44px:\n${pequenos.slice(0, 12).join('\n')}`).toEqual([]);
    });
  }

  test('contraste: texto do botão primário e do corpo (AA 4.5:1)', async ({ page }, info) => {
    await abrirApp(page, '/dashboard', info);
    await page.waitForTimeout(400);
    const razoes = await page.evaluate(() => {
      const lum = (c: string) => {
        const m = c.match(/[\d.]+/g)!.map(Number);
        const [r, g, b] = m.slice(0, 3).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const razao = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const out: Record<string, number> = {};
      const btn = document.querySelector('.p-button:not(.p-button-outlined):not(.p-button-text)') as HTMLElement | null;
      if (btn) out['botao primário'] = razao(getComputedStyle(btn).color, getComputedStyle(btn).backgroundColor);
      const main = document.querySelector('main') as HTMLElement;
      out['texto principal'] = razao(getComputedStyle(main.querySelector('h2, h1') ?? main).color, getComputedStyle(document.body).backgroundColor);
      const item = document.querySelector('app-sidebar .sidebar__item') as HTMLElement | null;
      if (item) out['item da sidebar'] = razao(getComputedStyle(item).color, getComputedStyle(document.querySelector('app-sidebar .sidebar') as HTMLElement).backgroundColor);
      return out;
    });
    for (const [nome, r] of Object.entries(razoes)) expect(r, `${nome}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});
