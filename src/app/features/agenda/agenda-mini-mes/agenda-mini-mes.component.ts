import { Component, computed, input, output } from '@angular/core';

export interface DiaDoMes {
  data: Date;
  chave: string;
  numero: number;
  quantidade: number;
  hoje: boolean;
  selecionado: boolean;
}

const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function chaveDia(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/** Navegador mensal: marca a ocupação de cada dia e escolhe o dia exibido na linha do tempo. */
@Component({
  selector: 'app-agenda-mini-mes',
  templateUrl: './agenda-mini-mes.component.html',
  styleUrl: './agenda-mini-mes.component.scss'
})
export class AgendaMiniMesComponent {
  readonly mes = input.required<Date>();
  readonly selecionado = input.required<Date>();
  /** Quantidade de horários por dia, indexada por yyyy-MM-dd. */
  readonly contagens = input<Record<string, number>>({});

  readonly diaEscolhido = output<Date>();
  /** -1 mês anterior, +1 próximo mês. */
  readonly mesMudou = output<number>();

  readonly iniciais = INICIAIS;

  readonly titulo = computed(() => {
    const rotulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.mes());
    return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
  });

  readonly vazios = computed(() => Array.from({ length: new Date(this.mes().getFullYear(), this.mes().getMonth(), 1).getDay() }));

  readonly dias = computed<DiaDoMes[]>(() => {
    const ano = this.mes().getFullYear();
    const mes = this.mes().getMonth();
    const total = new Date(ano, mes + 1, 0).getDate();
    const hoje = chaveDia(new Date());
    const escolhido = chaveDia(this.selecionado());
    const contagens = this.contagens();
    return Array.from({ length: total }, (_, i) => {
      const data = new Date(ano, mes, i + 1);
      const chave = chaveDia(data);
      return { data, chave, numero: i + 1, quantidade: contagens[chave] ?? 0, hoje: chave === hoje, selecionado: chave === escolhido };
    });
  });

  /** Marca de ocupação: ponto (1–3), barra curta (4–5), barra longa (6+). */
  marca(quantidade: number): string {
    return quantidade > 5 ? 'grande' : quantidade > 3 ? 'media' : 'pequena';
  }

  rotuloAria(dia: DiaDoMes): string {
    const data = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dia.data);
    return `${data}, ${dia.quantidade === 0 ? 'sem atendimentos' : dia.quantidade === 1 ? '1 atendimento' : `${dia.quantidade} atendimentos`}`;
  }
}
