import { defineConfig } from '@playwright/test';

/** Viewports de referência do redesign (spec 12): celular compacto/comum, tablet, desktop. */
const VIEWPORTS = [
  { nome: '360', width: 360, height: 740, mobile: true },
  { nome: '390', width: 390, height: 844, mobile: true },
  { nome: '768', width: 768, height: 1024, mobile: true },
  { nome: '1024', width: 1024, height: 768, mobile: false },
  { nome: '1280', width: 1280, height: 800, mobile: false },
  { nome: '1440', width: 1440, height: 900, mobile: false }
] as const;

const TEMAS = ['light', 'dark'] as const;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  // API sempre simulada em e2e/support/mock-api.ts: nenhum teste fala com backend ou produção.
  webServer: {
    command: 'npx ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 240_000
  },
  use: {
    baseURL: 'http://localhost:4200',
    // Usa o Chrome já instalado: evita baixar navegadores.
    channel: 'chrome',
    trace: 'retain-on-failure'
  },
  projects: VIEWPORTS.flatMap(vp =>
    TEMAS.map(tema => ({
      name: `${vp.nome}-${tema}`,
      metadata: { tema, largura: vp.width },
      use: {
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile && vp.width < 768,
        hasTouch: vp.mobile,
        colorScheme: tema
      }
    }))
  )
});
