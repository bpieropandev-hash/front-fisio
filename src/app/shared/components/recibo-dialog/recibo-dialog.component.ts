import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { OrigemRecibo, ReciboResponseDTO } from '../../../core/interfaces/recibo.interface';
import { ReciboService } from '../../../core/services/recibo.service';
import { ErrorHandlerUtil } from '../../../core/utils/error-handler.util';
@Component({
  selector: 'app-recibo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, Button, InputText],
  templateUrl: './recibo-dialog.component.html',
  styles: [`.form-group {display: flex; flex-direction: column; gap: .5rem; margin: 1rem 0;}`]
})
export class ReciboDialogComponent implements OnChanges {
  private readonly service = inject(ReciboService);
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() origem: OrigemRecibo | null = null;
  @Input() dataPagamento = '';
  @Input() pacienteNome = '';
  @Input() pacienteDocumento = '';
  recibo = signal<ReciboResponseDTO | null>(null);
  erro = signal('');
  carregando = signal(false);
  ocupado = signal(false);
  pagadorNome = '';
  pagadorDocumento = '';
  private consulta = 0;

  ngOnChanges(): void {
    const consulta = ++this.consulta;
    if (!this.visible || !this.origem) return;
    this.ocupado.set(false);
    this.recibo.set(null);
    this.erro.set('');
    this.pagadorNome = this.pacienteNome;
    this.pagadorDocumento = this.pacienteDocumento;
    this.carregando.set(true);
    this.service.listar(this.origem).subscribe({
      next: recibos => {
        if (consulta !== this.consulta) return;
        this.recibo.set(recibos[0] ?? null);
        this.carregando.set(false);
      },
      error: erro => {
        if (consulta !== this.consulta) return;
        this.erro.set(ErrorHandlerUtil.getErrorMessage(erro).detail);
        this.carregando.set(false);
      }
    });
  }

  emitir(): void {
    if (!this.origem || !this.dataPagamento || !this.pagadorNome.trim() || !this.pagadorDocumento.trim()) return;
    const consulta = this.consulta;
    this.ocupado.set(true);
    this.erro.set('');
    this.service.emitir({
      ...this.origem,
      dataPagamento: this.dataPagamento,
      pagadorNome: this.pagadorNome.trim(),
      pagadorDocumento: this.pagadorDocumento.trim()
    }).subscribe({
      next: recibo => {
        if (consulta !== this.consulta) return;
        this.recibo.set(recibo);
        this.ocupado.set(false);
        this.baixar(recibo);
      },
      error: erro => {
        if (consulta !== this.consulta) return;
        this.erro.set(ErrorHandlerUtil.getErrorMessage(erro).detail);
        this.ocupado.set(false);
      }
    });
  }

  baixar(recibo: ReciboResponseDTO): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.service.baixarPdf(recibo.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-${recibo.numero.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.ocupado.set(false);
      },
      error: erro => {
        this.erro.set(ErrorHandlerUtil.getErrorMessage(erro).detail);
        this.ocupado.set(false);
      }
    });
  }
}
