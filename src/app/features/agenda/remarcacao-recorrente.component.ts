import { Component,Input,Output,EventEmitter,OnInit,inject,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/config/api.config';
import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';

interface Sessao { id:number; inicio:string; fim:string; protecao:string|null; }
interface Previa { operacaoId:string; origens:Sessao[]; destinos:{origemId:number|null;inicio:string;fim:string;modalidade:string;valor:number}[]; conflitos:{inicio:string;motivo:string}[]; elegiveis:number; protegidos:number; mantidos:number; cancelados:number; criados:number; adicionais:number; frequenciaAnterior:number;frequenciaNova:number;novasAvulsas:number;valorNovasAvulsas:number; }
@Component({selector:'app-remarcacao-recorrente',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./remarcacao-recorrente.component.html',styleUrl:'./remarcacao-recorrente.component.scss'})
export class RemarcacaoRecorrenteComponent implements OnInit {
 @Input({required:true}) atendimento!:AtendimentoResponseDTO;
 @Input() pacienteNome=''; @Input() servicoNome='';
 @Output() concluido=new EventEmitter<void>(); @Output() fechar=new EventEmitter<void>();
 private http=inject(HttpClient); private url=`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.remarcacoes}`;
 carregando=signal(false); enviando=signal(false); erro=signal(''); candidatos=signal<Sessao[]>([]); previa=signal<Previa|null>(null);resultado=signal<unknown>(null);
 camposErro=signal<Record<string,string>>({});consultou=signal(false);
 inicio='';fim='';horario='';modo='MANTER_DATAS';motivo='';dias=new Set<number>();selecionados=new Set<number>(); private sequencia=0;
 diasOpcoes=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
 ngOnInit(){this.inicio=this.atendimento.dataHoraInicio.slice(0,10);this.fim=this.inicio;this.horario=this.atendimento.dataHoraInicio.slice(11,16);}
 alterou(){this.previa.set(null);this.erro.set('');this.camposErro.set({});}
 periodoMudou(){this.alterou();this.consultou.set(false);this.sequencia++;this.carregando.set(false);this.candidatos.set([]);this.selecionados.clear();}
 selecionar(id:number){this.alterou();this.selecionados.has(id)?this.selecionados.delete(id):this.selecionados.add(id);}
 dia(n:number){this.alterou();this.dias.has(n)?this.dias.delete(n):this.dias.add(n);}
 private valido(){if(!this.inicio||!this.fim||this.fim<this.inicio){this.camposErro.set({inicio:!this.inicio?'Informe a data inicial.':'',fim:'A data final deve ser igual ou posterior à inicial.'});this.erro.set('A data final deve ser igual ou posterior à inicial.');return false;}const dias=(Date.parse(this.fim)-Date.parse(this.inicio))/86400000+1;if(dias>366){this.camposErro.set({fim:'Escolha no máximo 366 dias.'});this.erro.set('Escolha no máximo 366 dias.');return false;}return true;}
 carregar(){if(!this.valido()||this.enviando())return;const seq=++this.sequencia;this.alterou();this.candidatos.set([]);this.selecionados.clear();this.consultou.set(false);this.carregando.set(true);this.http.get<Sessao[]>(`${this.url}/candidatos`,{params:{pacienteId:this.atendimento.pacienteId,servicoId:this.atendimento.servicoBaseId,inicio:this.inicio,fim:this.fim}}).subscribe({next:r=>{if(seq!==this.sequencia)return;this.candidatos.set(r);this.selecionados.clear();this.consultou.set(true);this.carregando.set(false);},error:e=>{if(seq!==this.sequencia)return;this.carregando.set(false);this.erro.set(e.error?.mensagem||'Não foi possível consultar as sessões. Tente novamente.');}});}
 gerarPrevia(){if(this.carregando()||this.enviando()||!this.valido())return;if(!this.selecionados.size){this.erro.set('Selecione explicitamente as sessões de origem.');return;}if(!this.horario||this.motivo.trim().length<3||(this.modo==='SUBSTITUIR_DIAS'&&!this.dias.size)){this.camposErro.set({horario:!this.horario?'Informe o novo horário.':'',motivo:this.motivo.trim().length<3?'Descreva o motivo com pelo menos 3 caracteres.':'',dias:this.modo==='SUBSTITUIR_DIAS'&&!this.dias.size?'Selecione pelo menos um dia.':''});this.erro.set('Informe horário, motivo e os dias da nova programação.');return;}this.enviando.set(true);this.erro.set('');this.http.post<Previa>(`${this.url}/previa`,{pacienteId:this.atendimento.pacienteId,servicoId:this.atendimento.servicoBaseId,origemIds:[...this.selecionados],inicio:this.inicio,fim:this.fim,horario:this.horario,modo:this.modo,diasSemana:[...this.dias],motivo:this.motivo.trim()}).subscribe({next:r=>{this.previa.set(r);this.enviando.set(false);},error:e=>{this.enviando.set(false);this.erro.set(e.error?.mensagem||'Não foi possível gerar a prévia.');}});}
 confirmar(){const p=this.previa();if(!p||this.enviando()||p.conflitos.length||!p.elegiveis)return;this.enviando.set(true);this.http.post(`${this.url}/${p.operacaoId}/confirmar`,{}).subscribe({next:r=>{this.resultado.set(r);this.enviando.set(false);this.concluido.emit();},error:e=>{this.enviando.set(false);this.previa.set(null);this.erro.set(e.error?.mensagem||'A confirmação falhou. Gere uma nova prévia.');}});}
}
