/** Mapeia status de atendimento pro par label+classe CSS do `.status-pill` (spec 10, telas mobile). */
export function obterPillStatus(status: string | undefined): { label: string; cssClass: string } {
  switch (status) {
    case 'AGENDADO':
      return { label: 'Confirmado', cssClass: 'status-pill--ok' };
    case 'CONCLUIDO':
      return { label: 'Concluído', cssClass: 'status-pill--neutral' };
    case 'CANCELADO':
      return { label: 'Cancelado', cssClass: 'status-pill--err' };
    case 'FALTA':
      return { label: 'Falta', cssClass: 'status-pill--warn' };
    default:
      return { label: status || '—', cssClass: 'status-pill--neutral' };
  }
}
