import { Injectable } from '@angular/core';
import { updatePrimaryPalette } from '@primeuix/themes';
import { FonteTema, TamanhoFonte } from '../interfaces/usuario.interface';

const DEFAULT_ACCENT = '#4cc9f0';
const DEFAULT_FONTE: FonteTema = 'moderno';
const DEFAULT_TAMANHO: TamanhoFonte = 'medio';
const ACCENT_STORAGE_KEY = 'accent-color';
const FONTE_STORAGE_KEY = 'fonte-tema';
const TAMANHO_STORAGE_KEY = 'tamanho-fonte';

/** Escala aplicada no font-size da raiz (html). "medio" já vem maior que o padrão do navegador (16px) — legibilidade era queixa recorrente. */
const TAMANHO_SCALE: Record<TamanhoFonte, string> = {
  pequeno: '100%',
  medio: '112.5%',
  grande: '125%'
};

const PALETTE_STEPS = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;
const STEP_500_INDEX = 6;

const FONT_PAIRS: Record<FonteTema, { display: string; body: string }> = {
  acolhedor: { display: "'Fraunces', serif", body: "'Karla', sans-serif" },
  classico: { display: "'Libre Baskerville', serif", body: "'Source Sans 3', sans-serif" },
  moderno: { display: "'Sora', sans-serif", body: "'Work Sans', sans-serif" },
  editorial: { display: "'Spectral', serif", body: "'Nunito Sans', sans-serif" },
  direto: { display: "'Manrope', sans-serif", body: "'Literata', serif" }
};

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Gera escala 0-950 (formato PrimeNG PaletteDesignToken) a partir de 1 hex, mantendo 500 = hex exato. */
function gerarEscala(hex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(hex);
  const escala: Record<string, string> = {};

  PALETTE_STEPS.forEach((step, i) => {
    let targetL: number;
    if (i <= STEP_500_INDEX) {
      const t = i / STEP_500_INDEX;
      targetL = 97 - t * (97 - l);
    } else {
      const t = (i - STEP_500_INDEX) / (PALETTE_STEPS.length - 1 - STEP_500_INDEX);
      targetL = l - t * (l - 8);
    }
    escala[step] = hslToHex(h, s, clamp(targetL, 0, 100));
  });

  return escala;
}

@Injectable({
  providedIn: 'root'
})
export class AccentThemeService {

  constructor() {
    // Aplica cache local (localStorage) imediatamente pra evitar flash antes do /me responder
    this.aplicarCor(localStorage.getItem(ACCENT_STORAGE_KEY));
    this.aplicarFonte(localStorage.getItem(FONTE_STORAGE_KEY) as FonteTema | null);
    this.aplicarTamanhoFonte(localStorage.getItem(TAMANHO_STORAGE_KEY) as TamanhoFonte | null);
  }

  aplicarCor(hex: string | null): void {
    const hexEfetivo = hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_ACCENT;
    const { h, s, l } = hexToHsl(hexEfetivo);
    const hover = hslToHex(h, s, clamp(l - 10, 0, 100));
    const light = hslToHex(h, s, clamp(l + 25, 0, 92));

    const root = document.documentElement.style;
    root.setProperty('--accent-color', hexEfetivo);
    root.setProperty('--accent-color-hover', hover);
    root.setProperty('--accent-color-light', light);

    updatePrimaryPalette(gerarEscala(hexEfetivo));

    if (hex) {
      localStorage.setItem(ACCENT_STORAGE_KEY, hexEfetivo);
    } else {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    }
  }

  aplicarFonte(fonte: FonteTema | null): void {
    const fonteEfetiva = fonte && FONT_PAIRS[fonte] ? fonte : DEFAULT_FONTE;
    const par = FONT_PAIRS[fonteEfetiva];

    const root = document.documentElement.style;
    root.setProperty('--font-display', par.display);
    root.setProperty('--font-body', par.body);

    if (fonte) {
      localStorage.setItem(FONTE_STORAGE_KEY, fonte);
    } else {
      localStorage.removeItem(FONTE_STORAGE_KEY);
    }
  }

  aplicarTamanhoFonte(tamanho: TamanhoFonte | null): void {
    const tamanhoEfetivo = tamanho && TAMANHO_SCALE[tamanho] ? tamanho : DEFAULT_TAMANHO;

    document.documentElement.style.fontSize = TAMANHO_SCALE[tamanhoEfetivo];

    if (tamanho) {
      localStorage.setItem(TAMANHO_STORAGE_KEY, tamanho);
    } else {
      localStorage.removeItem(TAMANHO_STORAGE_KEY);
    }
  }

  /** Opções pro select de fonte no perfil */
  listarOpcoesFonte(): { label: string; value: FonteTema }[] {
    return [
      { label: 'Acolhedor (Fraunces + Karla)', value: 'acolhedor' },
      { label: 'Clássico (Libre Baskerville + Source Sans 3)', value: 'classico' },
      { label: 'Moderno (Sora + Work Sans)', value: 'moderno' },
      { label: 'Editorial (Spectral + Nunito Sans)', value: 'editorial' },
      { label: 'Direto (Manrope + Literata)', value: 'direto' }
    ];
  }

  /** Opções pro select de tamanho de fonte no perfil */
  listarOpcoesTamanhoFonte(): { label: string; value: TamanhoFonte }[] {
    return [
      { label: 'Pequeno', value: 'pequeno' },
      { label: 'Médio (padrão)', value: 'medio' },
      { label: 'Grande', value: 'grande' }
    ];
  }
}
