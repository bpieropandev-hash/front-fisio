---
name: Physio Manager
description: Gestão clínica de ponta a ponta — agenda, prontuário e acerto financeiro — numa bancada calma, densa e legível.
colors:
  accent: "#0f766e"
  accent-hover: "#0c5f58"
  accent-light: "#5eead4"
  on-accent: "#ffffff"
  page: "#f3f6f6"
  surface: "#ffffff"
  surface-sunk: "#e9efee"
  border: "#d8e2e0"
  text: "#142120"
  text-muted: "#51625f"
  text-faint: "#5f716e"
  status-ok-ink: "#12744d"
  status-warn-ink: "#8a5a0b"
  status-err-ink: "#b22128"
  dark-page: "#0a1211"
  dark-surface: "#111c1b"
  dark-sunk: "#162524"
  dark-border: "#223533"
  dark-text: "#e6f1ef"
  dark-text-muted: "#9db3af"
typography:
  display:
    fontFamily: "Sora, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Sora, 'Segoe UI', sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Work Sans', 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Work Sans', 'Segoe UI', sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  sidebar:
    backgroundColor: "color-mix(accent 18%, #0a0f0f)"
    textColor: "#d6e6e3"
    width: "232px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Physio Manager

## Overview

**Creative North Star: "The Workbench"**

Uma bancada de trabalho para uma profissional que alterna entre o balcão da clínica, o tablet e o celular. A navegação fica sempre à mão (sidebar, rail ou bottom-nav, conforme a largura); o conteúdo é denso mas ordenado; a cor aparece para marcar ação e estado, não para decorar. A identidade foi escolhida entre três direções prototipadas (A, B, C) e aprovada nos critérios de `redesign/DECISAO.md`.

O sistema serve eficiência operacional: ver a lista do dia enquanto se edita um atendimento, dar baixa em poucos toques, ler valores sem ambiguidade. Tema claro e escuro são equivalentes. O **acento e o par tipográfico continuam personalizáveis** pela usuária (spec 09); todo o resto deriva deles por tokens.

**Key Characteristics:**
- Shell em três modos: sidebar completa (>1100px), rail de ícones (641–1100px), bottom-nav (≤640px).
- Superfícies planas separadas por borda de 1px; sombra só em overlays.
- Acento único e substituível; status por pílula tonal (fundo suave + tinta escura do mesmo matiz).
- Alvos de toque de 44px no celular e no tablet; foco sempre visível.
- Detalhe do atendimento em gaveta à direita (desktop) ou bottom-sheet (celular), preservando o contrato do `p-dialog`.

## Colors

Neutros frios esverdeados, acento teal por padrão (substituível), semântica de status em verde, âmbar e vermelho.

### Primary
- **Teal Clínico** (#0f766e): acento padrão (`--accent-color`). Botões primários, item ativo, foco. Substituível por `AccentThemeService`.
- **Teal Profundo** (#0c5f58): hover. **Teal Claro** (#5eead4): tinta do acento no tema escuro (`--accent-ink`).
- Texto sobre o acento: `--on-accent` (#ffffff no padrão; deve ser recalculado para acentos claros).

### Neutral
- **Página** (#f3f6f6) e **Superfície** (#ffffff); **Afundado** (#e9efee); **Linha** (#d8e2e0).
- **Tinta** (#142120), **Apoio** (#51625f), **Discreto** (#5f716e). Escuro: página #0a1211, superfície #111c1b, linha #223533, tinta #e6f1ef.
- **Shell**: `color-mix(accent 18%, #0a0f0f)`, ou seja, escuro tingido pelo acento da usuária.

### Named Rules
**The One Accent Rule.** Existe um único acento por usuária; cor extra só para status.

**The Tinted Status Rule.** Status usa fundo translúcido e tinta escura do mesmo matiz (`--status-*`), nunca texto saturado sobre branco.

**The Token Rule.** Nenhuma cor literal em componente: tudo vem de variáveis CSS.

## Typography

**Display Font:** Sora (padrão; `--font-display`). **Body Font:** Work Sans (padrão; `--font-body`). A usuária escolhe entre 5 pares; só o par ativo é baixado.

**Character:** geométrica e amigável nos títulos, neutra no corpo. Tamanhos em `rem` (a raiz escala 100–125% por preferência).

### Hierarchy
- **Display** (600, 1.5rem): título de página. **Title** (600, 1.05rem): título de painel. **Body** (400, 0.9375rem): conteúdo. **Label** (600, 0.78rem): rótulos e metadados.

### Named Rules
**The Variable Font Rule.** Famílias vêm só de `--font-display`/`--font-body`; nunca fixar fonte em componente.

## Layout

Shell em grade: sidebar/rail à esquerda e conteúdo à direita; no celular, cabeçalho com título e bottom-nav fixa com safe-area. Breakpoints em px: 640 (bottom-nav), 768 (layouts de lista/cards e diálogos em tela cheia), 1100 (sidebar vira rail). Espaçamento 4/8/12/16/24/32/48/64 (`--space-*`). Conteúdo com largura máxima definida por tela; tabelas viram listas de cards abaixo de 768px.

## Elevation & Depth

Plano por padrão: profundidade por borda e troca de superfície. Sombra só em overlays (menus, painéis de data). Escala de camadas do PrimeNG (modal 1100, overlay 1000); o CSS do app fica abaixo de 1000.

### Named Rules
**The Flat-By-Default Rule.** Superfícies em repouso não têm sombra.

**The No-Global-Z Rule.** Nenhum `z-index` global ≥ 1000 nem `!important` em `.p-*` para empilhamento; overlays são anexados ao `body`.

## Shapes

Raios 6px (controles), 10px (cards e painéis), 16px (máximo, sheets). Bordas de 1px. Pílulas (999px) só para status e filtros.

## Components

### Buttons
- **Primário:** preenchido com acento, texto `--on-accent`, 44px de altura no toque. Um por vista.
- **Secundário (outlined):** contorno neutro, texto na tinta do acento; hover com fundo `--accent-soft`.
- **Texto:** sem borda. **Perigo:** contorno/tinta de erro. Sem cores literais e sem `[ng-reflect-*]`.

### Navegação
- **Sidebar/rail:** fundo do shell, item ativo em fundo selecionado (sem faixa lateral), `aria-current="page"`; rodapé com tema, perfil e sair.
- **Bottom-nav:** Home, Agenda, Pacientes, Financeiro, Mais; item ativo em pílula suave.

### Tabelas e listas
- Tabela densa no desktop; cards com ações em linha própria no celular; ações de linha com rótulo sem quebra.

### Diálogos e seletores
- `p-dialog` modal; detalhe do atendimento em gaveta à direita (desktop) ou sheet (celular). DatePicker em pt-BR, painel anexado ao `body`, sem z-index próprio.

## Do's and Don'ts

### Do:
- **Do** usar tokens (`--accent-*`, `--bg-*`, `--text-*`, `--status-*`, `--space-*`, `--radius-*`).
- **Do** manter alvos ≥ 44px no toque e foco visível (`--focus-ring`).
- **Do** testar com `npm run e2e` (6 larguras × claro/escuro) antes de concluir uma tela.
- **Do** dar a toda tela estados de loading, erro e vazio.

### Don't:
- **Don't** usar gradientes decorativos nem segunda cor de marca.
- **Don't** fixar cores ou fontes em componentes, nem `z-index` ≥ 1000.
- **Don't** usar border-radius > 16px em cards.
- **Don't** depender de `::ng-deep` novo ou de `!important` para empilhamento.
