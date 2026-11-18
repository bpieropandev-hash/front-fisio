import { describe, expect, it } from 'vitest';
import { arredondarMeiaHora, distribuirColunas, EventoDoDiaUI, formatarMinutos, janelaDeHoras } from './agenda-timeline.util';

function ev(chave: string, inicio: string, fim: string): EventoDoDiaUI {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
  return { chave, hora: inicio, inicioMin: m(inicio), fimMin: m(fim), pacienteNome: chave, servicoNome: 'S', status: 'AGENDADO', sigla: 'FIS', participantes: [], atendimento: {} as never };
}

describe('distribuirColunas', () => {
  it('blocos em sequência ficam em coluna única', () => {
    const r = distribuirColunas([ev('a', '08:00', '09:00'), ev('b', '09:00', '10:00')]);
    expect(r.map(b => [b.evento.chave, b.coluna, b.colunas])).toEqual([['a', 0, 1], ['b', 0, 1]]);
  });

  it('simultâneos dividem a largura em colunas', () => {
    const r = distribuirColunas([ev('a', '14:00', '15:00'), ev('b', '14:00', '15:00'), ev('c', '14:00', '15:00')]);
    expect(r.every(b => b.colunas === 3)).toBe(true);
    expect(r.map(b => b.coluna).sort()).toEqual([0, 1, 2]);
  });

  it('encadeamento A-B-C forma um grupo e reaproveita colunas livres', () => {
    const r = distribuirColunas([ev('a', '08:00', '10:00'), ev('b', '09:00', '11:00'), ev('c', '10:00', '12:00')]);
    const porChave = Object.fromEntries(r.map(b => [b.evento.chave, b]));
    expect(porChave['a'].colunas).toBe(2);
    expect(porChave['c'].coluna).toBe(porChave['a'].coluna);
    expect(porChave['b'].coluna).not.toBe(porChave['a'].coluna);
  });

  it('grupos separados não afetam a largura um do outro', () => {
    const r = distribuirColunas([ev('a', '08:00', '09:00'), ev('b', '08:30', '09:30'), ev('c', '11:00', '12:00')]);
    expect(r.find(b => b.evento.chave === 'c')!.colunas).toBe(1);
    expect(r.find(b => b.evento.chave === 'a')!.colunas).toBe(2);
  });

  it('lista vazia devolve vazio', () => expect(distribuirColunas([])).toEqual([]));
});

describe('janelaDeHoras', () => {
  it('usa 07–19 por padrão', () => expect(janelaDeHoras([ev('a', '09:00', '10:00')])).toEqual({ inicio: 7, fim: 19 }));
  it('amplia para caber atendimentos cedo e tarde', () => {
    expect(janelaDeHoras([ev('a', '06:30', '07:30'), ev('b', '20:00', '21:15')])).toEqual({ inicio: 6, fim: 22 });
  });
  it('limita ao dia', () => expect(janelaDeHoras([ev('a', '23:00', '23:59')]).fim).toBe(24));
});

describe('arredondarMeiaHora e formatarMinutos', () => {
  it('arredonda ao mais próximo', () => {
    expect(arredondarMeiaHora(10 * 60 + 14)).toBe(600);
    expect(arredondarMeiaHora(10 * 60 + 16)).toBe(630);
  });
  it('não passa de 23:30', () => expect(arredondarMeiaHora(23 * 60 + 50)).toBe(23 * 60 + 30));
  it('formata HH:mm', () => expect(formatarMinutos(9 * 60 + 5)).toBe('09:05'));
});
