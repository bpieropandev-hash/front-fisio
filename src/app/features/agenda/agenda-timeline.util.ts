import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';

/** Um horário da agenda: um atendimento ou uma turma (vários participantes no mesmo serviço e horário). */
export interface EventoDoDiaUI {
  atendimento: AtendimentoResponseDTO;
  participantes: AtendimentoResponseDTO[];
  chave: string;
  hora: string;
  pacienteNome: string;
  servicoNome: string;
  /** Início e fim em minutos desde 00:00 do dia. */
  inicioMin: number;
  fimMin: number;
  /** Status único do bloco; turmas com status diferentes usam 'MISTO'. */
  status: string;
  sigla: string;
}

export interface BlocoPosicionado {
  evento: EventoDoDiaUI;
  coluna: number;
  colunas: number;
}

export const DURACAO_PADRAO_MIN = 60;
export const HORA_INICIO_PADRAO = 7;
export const HORA_FIM_PADRAO = 19;

/** Minutos desde 00:00 de uma data/hora local. */
export function minutosDoDia(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

/**
 * Distribui blocos que se sobrepõem em colunas lado a lado. Blocos que se tocam em cadeia
 * (A sobrepõe B, B sobrepõe C) formam um grupo e dividem a mesma largura.
 */
export function distribuirColunas(eventos: EventoDoDiaUI[]): BlocoPosicionado[] {
  const ordenados = [...eventos].sort((a, b) => a.inicioMin - b.inicioMin || a.fimMin - b.fimMin);
  const resultado: BlocoPosicionado[] = [];
  let grupo: { evento: EventoDoDiaUI; coluna: number }[] = [];
  let fimDoGrupo = -1;
  let fimPorColuna: number[] = [];

  const fecharGrupo = () => {
    const colunas = fimPorColuna.length;
    grupo.forEach(g => resultado.push({ evento: g.evento, coluna: g.coluna, colunas }));
    grupo = [];
    fimPorColuna = [];
    fimDoGrupo = -1;
  };

  for (const evento of ordenados) {
    if (grupo.length && evento.inicioMin >= fimDoGrupo) fecharGrupo();
    let coluna = fimPorColuna.findIndex(fim => fim <= evento.inicioMin);
    if (coluna === -1) coluna = fimPorColuna.length;
    fimPorColuna[coluna] = evento.fimMin;
    grupo.push({ evento, coluna });
    fimDoGrupo = Math.max(fimDoGrupo, evento.fimMin);
  }
  if (grupo.length) fecharGrupo();
  return resultado;
}

/** Janela de horas inteiras exibida: 07–19 por padrão, ampliada para caber todos os atendimentos do dia. */
export function janelaDeHoras(eventos: EventoDoDiaUI[]): { inicio: number; fim: number } {
  let inicio = HORA_INICIO_PADRAO;
  let fim = HORA_FIM_PADRAO;
  for (const e of eventos) {
    inicio = Math.min(inicio, Math.floor(e.inicioMin / 60));
    fim = Math.max(fim, Math.ceil(e.fimMin / 60));
  }
  return { inicio: Math.max(0, inicio), fim: Math.min(24, fim) };
}

/** Arredonda ao intervalo de 30 min mais próximo e limita ao dia. */
export function arredondarMeiaHora(minutos: number): number {
  return Math.max(0, Math.min(23 * 60 + 30, Math.round(minutos / 30) * 30));
}

export function formatarMinutos(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}
