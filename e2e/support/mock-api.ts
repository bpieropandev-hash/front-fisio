import type { Page, Route } from '@playwright/test';

/**
 * API simulada para e2e. Dados 100% fictícios; nunca aponta para backend real.
 * Interceptamos a origem configurada em environment.ts (http://localhost:8080).
 */
const API = 'http://localhost:8080';

const agora = new Date();
const iso = (dias: number, hora: number, minuto = 0): string => {
  const d = new Date(agora);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

const pacientes = [
  ['Maria Souza', '111.111.111-11'],
  ['João Pereira', '222.222.222-22'],
  ['Ana Beatriz Lima Albuquerque', '333.333.333-33'],
  ['Carlos Eduardo', '444.444.444-44'],
  ['Fernanda Costa', '555.555.555-55']
].map(([nome, cpf], i) => ({
  id: i + 1, nome, cpf, telefone: `(11) 90000-000${i}`, email: `p${i}@exemplo.test`,
  dataNascimento: `1985-03-1${i}`, cidade: 'São Paulo', estado: 'SP', ativo: true,
  possuiAssinaturaAtiva: i % 2 === 0, dataCadastro: '2026-01-10'
}));

const servicos = [
  { id: 1, nome: 'Pilates Mensal', tipo: 'PILATES', valorBase: 380, capacidade: 4, pctClinica: 40, pctProfissional: 60, ativo: true },
  { id: 2, nome: 'Fisioterapia Avulsa', tipo: 'FISIOTERAPIA', valorBase: 180, pctClinica: 30, pctProfissional: 70, ativo: true }
];

/** Um atendimento hoje às 14h garante um item visível na agenda mobile e no calendário. */
const atendimentos = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  pacienteId: (i % 5) + 1,
  servicoBaseId: (i % 2) + 1,
  dataHoraInicio: i === 0 ? iso(0, 14) : iso(i - 3, 8 + (i % 8)),
  dataHoraFim: i === 0 ? iso(0, 15) : iso(i - 3, 9 + (i % 8)),
  statusPagamento: i % 3 ? 'PAYMENT_PENDING' : 'PAID',
  modalidadeCobranca: i % 2 ? 'AVULSO' : 'MENSALIDADE',
  valorCobrado: i % 2 ? 180 : 380,
  pctClinicaSnapshot: 40,
  pctProfissionalSnapshot: 60,
  status: i === 0 ? 'AGENDADO' : i < 4 ? 'CONCLUIDO' : i === 5 ? 'FALTA' : 'AGENDADO',
  evolucao: ''
}));

const assinaturas = [1, 3, 5].map((p, i) => ({
  id: i + 1, pacienteId: p, pacienteNome: pacientes[p - 1].nome, servicoId: 1, servicoNome: 'Pilates Mensal',
  valorMensal: 380, diaVencimento: 10, ativo: true, dataInicio: '2026-01-05'
}));

const cobrancas = assinaturas.map((a, i) => ({
  id: i + 1, assinaturaId: a.id, pacienteId: a.pacienteId, pacienteNome: a.pacienteNome, descricao: 'Pilates Mensal',
  mesReferencia: agora.getMonth() + 1, anoReferencia: agora.getFullYear(), valor: 380,
  status: i ? 'PENDENTE' : 'PAGO', pctClinicaSnapshot: 40, pctProfissionalSnapshot: 60,
  ...(i ? {} : { dataPagamento: iso(-2, 10).slice(0, 10), recebedor: 'CLINICA', tipoPagamento: 'PIX' })
}));

const usuario = {
  id: 1, login: 'teste', email: 'teste@exemplo.test', nome: 'Dra. Teste', telefone: '(11) 99999-0000',
  fotoBase64: null, role: 'ADMIN', corPrimaria: null, fonteTema: null, tamanhoFonte: null
};

const evolucaoVazia = {
  versao: 1, procedimentos: [], equipamentos: [], pressaoSistolica: null, pressaoDiastolica: null,
  dor: null, observacoes: '', resumo: '', autor: null, atualizadoEm: null
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*'
};

function responder(route: Route, corpo: unknown, status = 200): Promise<void> {
  return route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
}

function resolver(metodo: string, caminho: string): unknown {
  const partes = caminho.split('/').filter(Boolean); // api, v1, recurso, id?, ...
  const [, , recurso, id, sub] = partes;
  const porId = <T>(lista: T[]): T | undefined => lista[Number(id) - 1];

  if (metodo !== 'GET') return {};
  if (recurso === 'pacientes') return id ? porId(pacientes) : pacientes;
  if (recurso === 'servicos') return id ? porId(servicos) : servicos;
  if (recurso === 'agendamentos') {
    if (id && sub === 'evolucao-estruturada') return evolucaoVazia;
    if (id && sub === 'historico') return [];
    return id ? porId(atendimentos) : atendimentos;
  }
  if (recurso === 'assinaturas') return assinaturas;
  if (recurso === 'cobrancas') {
    return { conteudo: cobrancas, paginaAtual: 0, tamanhoPagina: 20, totalElementos: cobrancas.length, totalPaginas: 1 };
  }
  if (recurso === 'dashboard') {
    return {
      totalAtendimentos: 14, atendimentosPagamentoPendente: 9, faturamentoProfissional: 2280.5,
      alertasPendencia: [
        { nomePaciente: 'Maria Souza', tipoPendencia: 'ASSINATURA', descricao: 'Mensalidade do mês' },
        { nomePaciente: 'João Pereira', tipoPendencia: 'ATENDIMENTO_AVULSO', descricao: 'Sessão avulsa' }
      ]
    };
  }
  if (recurso === 'usuarios') return usuario;
  if (recurso === 'configuracoes') return {};
  return [];
}

/** Instala a API simulada e a sessão de teste (token fictício, tema) antes de qualquer navegação. */
export async function prepararSessao(page: Page, tema: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t: string) => {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${b64({ alg: 'HS256' })}.${b64({ sub: 'teste', iss: 'physio-manager', exp: Math.floor(Date.now() / 1000) + 28800 })}.x`;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('app-theme', t);
  }, tema);

  await page.route(`${API}/**`, route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    return responder(route, resolver(req.method(), new URL(req.url()).pathname));
  });
}
