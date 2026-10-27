import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';

export interface FiltrosTurma {
  status?: string[];
  pacienteId?: number | null;
  servicoId?: number | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
}

export interface TurmaAgenda {
  chave: string;
  participantes: AtendimentoResponseDTO[];
}

/** Os filtros selecionam participantes; o agrupamento nunca acrescenta indivíduos ocultos. */
export function agruparAtendimentos(atendimentos: AtendimentoResponseDTO[], filtros: FiltrosTurma = {}): TurmaAgenda[] {
  const grupos = new Map<string, TurmaAgenda>();
  const inicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
  const fim = filtros.dataFim ? new Date(filtros.dataFim) : null;
  inicio?.setHours(0, 0, 0, 0);
  fim?.setHours(23, 59, 59, 999);

  for (const atendimento of atendimentos) {
    const data = new Date(atendimento.dataHoraInicio);
    if (filtros.status?.length && !filtros.status.includes(atendimento.status)) continue;
    if (filtros.pacienteId && atendimento.pacienteId !== filtros.pacienteId) continue;
    if (filtros.servicoId && atendimento.servicoBaseId !== filtros.servicoId) continue;
    if ((inicio && data < inicio) || (fim && data > fim)) continue;

    // Registros antigos sem fim explícito ficam individuais: não presumir duração.
    const chave = atendimento.dataHoraFim
      ? `${atendimento.servicoBaseId}|${atendimento.dataHoraInicio}|${atendimento.dataHoraFim}`
      : `individual-${atendimento.id}`;
    const grupo = grupos.get(chave) ?? { chave, participantes: [] };
    grupo.participantes.push(atendimento);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()];
}

export function ehMensalidade(atendimento: Partial<AtendimentoResponseDTO> | null | undefined): boolean {
  return atendimento?.modalidadeCobranca === 'MENSALIDADE' || atendimento?.assinaturaId != null;
}

export function podeEmitirReciboAtendimento(atendimento: Partial<AtendimentoResponseDTO> | null | undefined): boolean {
  return !!atendimento && !ehMensalidade(atendimento)
    && atendimento.statusPagamento === 'PAID' && Number(atendimento.valorCobrado) > 0;
}
