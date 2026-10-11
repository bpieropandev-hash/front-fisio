/** Funções puras de apresentação usadas pelo AgendaComponent (cores, labels, formatação de data/hora). */

export function obterCoresPorStatus(status: string): { backgroundColor: string; borderColor: string; textColor: string } {
  switch (status) {
    case 'AGENDADO':
      return {
        backgroundColor: '#a5d6a7',
        borderColor: '#16a34a',
        textColor: '#1b5e20'
      };
    case 'CONCLUIDO':
      return {
        backgroundColor: '#90caf9',
        borderColor: '#2563eb',
        textColor: '#0d47a1'
      };
    case 'CANCELADO':
      return {
        backgroundColor: '#ef9a9a',
        borderColor: '#dc2626',
        textColor: '#b71c1c'
      };
    case 'FALTA':
      return {
        backgroundColor: '#fff59d',
        borderColor: '#ca8a04',
        textColor: '#f57f17'
      };
    default:
      return {
        backgroundColor: '#e0e0e0',
        borderColor: '#64748b',
        textColor: '#424242'
      };
  }
}

export function obterTipoServico(servicoNome: string, servicoTipo?: string): 'PILATES' | 'FISIOTERAPIA' | 'AVALIACAO' | 'OUTRO' {
  const nome = (servicoNome || '').toLowerCase();
  if (nome.includes('avalia')) return 'AVALIACAO';
  // Preferir o tipo vindo do backend quando existir
  if (servicoTipo === 'PILATES') return 'PILATES';
  if (servicoTipo === 'FISIOTERAPIA') return 'FISIOTERAPIA';
  // Fallback por nome
  if (nome.includes('pilates')) return 'PILATES';
  if (nome.includes('fisio')) return 'FISIOTERAPIA';
  return 'OUTRO';
}

export function obterLabelStatus(status: string | undefined): string {
  switch (status) {
    case 'AGENDADO':
      return 'Agendado';
    case 'CONCLUIDO':
      return 'Concluído';
    case 'CANCELADO':
      return 'Cancelado';
    case 'FALTA':
      return 'Falta';
    default:
      return status || '—';
  }
}

export function formatHora(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function obterSiglaTipoServico(tipo: string | undefined): string {
  switch (tipo) {
    case 'PILATES':
      return 'PIL';
    case 'FISIOTERAPIA':
      return 'FIS';
    case 'AVALIACAO':
      return 'AVL';
    default:
      return 'OUT';
  }
}

export function normalizarStatusClass(status: string | undefined): string {
  // Ex.: "CONCLUIDO" -> "concluido"
  return (status || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function combinarDataHora(data: Date | null, hora: string | null): Date | null {
  if (!data || !hora) return null;

  const [horas, minutos] = hora.split(':').map(Number);
  const dataCombinada = new Date(data);
  dataCombinada.setHours(horas, minutos, 0, 0);
  return dataCombinada;
}

export function separarDataHora(dataHora: Date | null): { data: Date | null; hora: string | null } {
  if (!dataHora) return { data: null, hora: null };

  const data = new Date(dataHora);
  data.setHours(0, 0, 0, 0);

  const horas = String(dataHora.getHours()).padStart(2, '0');
  const minutos = String(dataHora.getMinutes()).padStart(2, '0');
  const hora = `${horas}:${minutos}`;

  return { data, hora };
}

/** Grade padrão de horários (30min) + horário exato do atendimento, se estiver fora da grade */
export function montarHorariosComExtra(
  horariosDisponiveis: { label: string; value: string }[],
  hora: string | null
): { label: string; value: string }[] {
  const base = [...horariosDisponiveis];
  if (hora && !base.some(h => h.value === hora)) {
    base.push({ label: hora, value: hora });
    base.sort((a, b) => a.value.localeCompare(b.value));
  }
  return base;
}
