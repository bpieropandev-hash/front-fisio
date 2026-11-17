# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uma única usuária: a profissional (fisioterapeuta/pilates) dona da clínica, administradora do sistema. Usa no desktop da clínica e, cada vez mais, no celular entre atendimentos. Sem login de recepção ou de pacientes. Usuários são inseridos direto no banco (sem registro via API).

## Product Purpose

Physio Manager: gestão de uma clínica de fisioterapia/pilates. Controla pacientes (anamnese, endereço, soft-delete), agenda de atendimentos, catálogo de serviços, assinaturas mensais, cobranças, dashboard (atendimentos do mês, faturamento da profissional, inadimplentes) e relatórios PDF (acerto financeiro, prontuário). Sucesso: a profissional sabe o que receber, de quem, e o que cada paciente evoluiu, sem planilhas.

## Positioning

Une dois eixos que software genérico separa: (1) acerto financeiro entre clínica e profissional, com split percentual por serviço e snapshot histórico (mudar preço/percentual nunca altera o passado), cobranças mensais geradas automaticamente e controle de inadimplência; (2) agenda e prontuário clínico, com evolução por sessão alimentando o prontuário PDF.

## Operating Context

- Frontend: Angular 21 standalone + signals, PrimeNG 21 (prefixo de tokens `pg`, preset Aura), FullCalendar. Sem NgModules.
- Backend REST Spring Boot separado (`../fisio`), produção no Railway. Auth JWT em `localStorage`, expira em 8h.
- Rotinas: agendar e remarcar sessões (inclusive recorrentes), concluir em lote, registrar evolução, baixar pagamentos (com estorno confirmado), reajustar preços e planos, gerar PDFs.
- Responsivo em codebase única (BreakpointService); novos fluxos mobile podem ganhar shell dedicado, sem app separado.

## Capabilities and Constraints

- Domínio e mensagens em português (Paciente, Cobranca, Assinatura); código em inglês.
- Endpoints sempre via `API_CONFIG`, nunca URL hardcoded.
- Percentuais clínica + profissional somam 100.
- Tema claro/escuro suportado.
- Decisão de design mobile em aberto: direções "Aura frio" vs "paleta quente" (projeto Physio Mobile, DesignSync) ainda não escolhida.

## Brand Commitments

Nenhum logo ou marca formal confirmado nesta rodada. Preferências globais do usuário: sem cores hardcoded (variáveis CSS), sem Inter/Roboto/Arial/system-ui como fonte principal, sem gradientes roxo/azul genéricos, border-radius de cards <= 16px, max-width definido, estados de loading e erro obrigatórios.

## Evidence on Hand

Specs em `../specs/` (00-dominio, 02-frontend, 07-ux-produtividade, CHECKPOINT). Sem depoimentos, métricas ou clientes além da própria usuária; não fabricar.

## Product Principles

1. Dinheiro sem ambiguidade: valores, quem recebe e o que está pendente legíveis de relance.
2. Histórico é imutável: a UI nunca sugere que mudança futura reescreve o passado.
3. Rapidez entre atendimentos: ações frequentes (concluir, baixar, evoluir) em poucos toques no celular.
4. Uma codebase, um conjunto de dados; mobile adapta a experiência, não duplica o produto.
5. Operação segura: ações destrutivas ou de estorno exigem confirmação explícita.

## Accessibility & Inclusion

Alvos de toque >= 44px, foco visível, contraste verificado em claro e escuro, sem overflow horizontal em 390px.
