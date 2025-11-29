# Physio Manager - Frontend

Sistema de gerenciamento para clínica de fisioterapia desenvolvido em Angular 18+ com Standalone Components e Signals.

## Tecnologias

- Angular 18+
- PrimeNG 18
- FullCalendar
- RxJS
- TypeScript 5.4+

## Funcionalidades

### Autenticação
- Login com JWT Bearer Token
- Guard de rotas protegidas
- Interceptor HTTP para adicionar token automaticamente
- Logout automático em caso de erro 403

### Agenda
- Visualização de agendamentos em calendário (FullCalendar)
- Diferenciação visual entre atendimentos pagos e mensalistas
- Modal de criação/edição de agendamentos
- Regras específicas para baixa de atendimentos:
  - **Fisioterapia (valor > 0)**: Campos financeiros obrigatórios ao concluir
  - **Pilates (valor = 0)**: Apenas evolução obrigatória

### Financeiro

#### Assinaturas
- CRUD completo de assinaturas mensais
- Listagem com status (Ativa/Inativa)
- Criação de novas assinaturas

#### Cobranças Mensais
- Geração de mensalidades por mês/ano
- Listagem de cobranças
- Modal para dar baixa em cobranças pendentes
- Campos: Data Pagamento, Recebedor, Tipo Pagamento

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm start
```

O servidor de desenvolvimento estará disponível em `http://localhost:4200`

## Build

```bash
npm run build
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── core/
│   │   ├── config/          # Configurações da API
│   │   ├── guards/          # Guards de rota
│   │   ├── interceptors/    # Interceptors HTTP
│   │   ├── interfaces/      # Interfaces TypeScript (OpenAPI)
│   │   └── services/        # Services HTTP
│   ├── features/
│   │   ├── auth/            # Módulo de autenticação
│   │   ├── agenda/          # Módulo de agenda
│   │   ├── financeiro/      # Módulo financeiro
│   │   └── pacientes/       # Módulo de pacientes
│   ├── app.component.ts     # Componente raiz
│   └── app.routes.ts        # Rotas da aplicação
└── main.ts                  # Bootstrap da aplicação
```

## Configuração da API

A URL base da API está configurada em `src/app/core/config/api.config.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: 'http://localhost:8080',
  // ...
};
```

## Regras de Negócio

### Pay-per-use (Fisioterapia)
- Valor gerado no momento do agendamento
- Campos financeiros obrigatórios ao concluir

### Recorrência (Pilates)
- Paciente possui assinatura mensal
- Agendamentos têm valor R$ 0,00
- Cobrança gerada mensalmente através do módulo de cobranças


