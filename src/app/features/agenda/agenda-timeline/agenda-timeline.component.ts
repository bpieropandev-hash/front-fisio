import { Component, computed, input, output } from '@angular/core';
import {
  arredondarMeiaHora,
  BlocoPosicionado,
  distribuirColunas,
  EventoDoDiaUI,
  formatarMinutos,
  janelaDeHoras,
  minutosDoDia
} from '../agenda-timeline.util';

const ROTULO_STATUS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  FALTA: 'Falta',
  MISTO: 'Vários status'
};

/** Linha do tempo de um dia: altura do bloco proporcional à duração, sobreposição lado a lado e marca do "agora". */
@Component({
  selector: 'app-agenda-timeline',
  templateUrl: './agenda-timeline.component.html',
  styleUrl: './agenda-timeline.component.scss'
})
export class AgendaTimelineComponent {
  readonly dia = input.required<Date>();
  readonly eventos = input.required<EventoDoDiaUI[]>();
  readonly agora = input<Date | null>(null);
  readonly alturaHora = input(72);

  /** Bloco ou turma escolhida. */
  readonly selecionar = output<EventoDoDiaUI>();
  /** Clique num horário vazio (HH:mm, arredondado a 30 min). */
  readonly novoNoHorario = output<string>();

  readonly janela = computed(() => janelaDeHoras(this.eventos()));
  readonly horas = computed(() => {
    const { inicio, fim } = this.janela();
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  });
  readonly alturaTotal = computed(() => (this.janela().fim - this.janela().inicio) * this.alturaHora());
  readonly blocos = computed(() => distribuirColunas(this.eventos()));

  /** Posição vertical da linha do "agora", só quando o dia exibido é hoje e está dentro da janela. */
  readonly topoAgora = computed(() => {
    const agora = this.agora();
    const dia = this.dia();
    if (!agora || agora.toDateString() !== dia.toDateString()) return null;
    const min = minutosDoDia(agora);
    const { inicio, fim } = this.janela();
    if (min < inicio * 60 || min > fim * 60) return null;
    return ((min - inicio * 60) * this.alturaHora()) / 60;
  });

  readonly formatar = formatarMinutos;

  estilo(bloco: BlocoPosicionado): Record<string, string> {
    const { inicio } = this.janela();
    const h = this.alturaHora();
    const topo = ((bloco.evento.inicioMin - inicio * 60) * h) / 60;
    const altura = Math.max(((bloco.evento.fimMin - bloco.evento.inicioMin) * h) / 60 - 3, 22);
    const largura = 100 / bloco.colunas;
    return {
      top: `${topo + 1}px`,
      height: `${altura}px`,
      left: `calc(${bloco.coluna * largura}% + 4px)`,
      width: `calc(${largura}% - 8px)`
    };
  }

  rotuloStatus(status: string): string {
    return ROTULO_STATUS[status] ?? status;
  }

  titulo(evento: EventoDoDiaUI): string {
    return evento.participantes.length > 1
      ? `${evento.servicoNome} · ${evento.participantes.length} participantes`
      : evento.pacienteNome;
  }

  /** Blocos baixos mostram só nome e horário; o status vai no rótulo de acessibilidade. */
  compacto(bloco: BlocoPosicionado): boolean {
    return bloco.evento.fimMin - bloco.evento.inicioMin <= 45 || bloco.colunas > 1;
  }

  rotuloAria(evento: EventoDoDiaUI): string {
    return `${evento.hora}, ${this.titulo(evento)}, ${evento.servicoNome}, ${this.rotuloStatus(evento.status)}`;
  }

  aoClicarNaPista(evento: MouseEvent): void {
    const alvo = evento.target as HTMLElement;
    // Clique em bloco é tratado pelo próprio bloco; aqui só o fundo da pista.
    if (alvo !== evento.currentTarget) return;
    const minutos = this.janela().inicio * 60 + (evento.offsetY * 60) / this.alturaHora();
    this.novoNoHorario.emit(formatarMinutos(arredondarMeiaHora(minutos)));
  }
}
