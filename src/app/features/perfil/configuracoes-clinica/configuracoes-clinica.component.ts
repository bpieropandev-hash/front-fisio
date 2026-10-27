import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ConfiguracaoClinicaService,ConfiguracaoClinica} from '../../../core/services/configuracao-clinica.service';
import {ServicoService} from '../../../core/services/servico.service';
import {ServicoResponseDTO} from '../../../core/interfaces/servico.interface';
@Component({selector:'app-configuracoes-clinica',imports:[FormsModule],templateUrl:'./configuracoes-clinica.component.html',styleUrl:'./configuracoes-clinica.component.scss'})
export class ConfiguracoesClinicaComponent implements OnInit {
 private readonly api=inject(ConfiguracaoClinicaService);
 private readonly servicoApi=inject(ServicoService);
 readonly dados=signal<ConfiguracaoClinica|null>(null);
 readonly erro=signal(''); readonly sucesso=signal('');readonly carregando=signal(false);readonly salvando=signal(false);
 readonly servicos=signal<ServicoResponseDTO[]>([]);readonly erroServicos=signal('');readonly salvandoServico=signal<number|null>(null);
 novoProcedimento='';novoEquipamento='';
 ngOnInit(){this.carregar();this.carregarServicos();}
 carregar(){this.carregando.set(true);this.erro.set('');this.api.buscar().subscribe({next:c=>{this.dados.set(structuredClone(c));this.carregando.set(false);},error:()=>{this.erro.set('Não foi possível carregar as configurações. Tente novamente.');this.carregando.set(false);}});}
 carregarServicos(){this.erroServicos.set('');this.servicoApi.listar().subscribe({next:s=>this.servicos.set(s),error:()=>this.erroServicos.set('Não foi possível carregar a capacidade dos serviços.')});}
 adicionar(tipo:'procedimentos'|'equipamentos'){
 const c=this.dados();if(!c)return;
 const nome=(tipo==='procedimentos'?this.novoProcedimento:this.novoEquipamento).trim();
 if(!nome||nome.length>100||c[tipo].length>=50||c[tipo].some(i=>i.nome.toLocaleLowerCase()===nome.toLocaleLowerCase())){this.erro.set('Informe um nome único com até 100 caracteres (máximo de 50 itens).');return;}
 const codigo='ITEM_'+crypto.randomUUID().replaceAll('-','').toUpperCase();
 c[tipo].push({codigo,nome,ativo:true});if(tipo==='procedimentos')this.novoProcedimento='';else this.novoEquipamento='';this.erro.set('');
 }
 salvar(){const c=this.dados();if(!c||this.salvando())return;this.erro.set('');this.sucesso.set('');this.salvando.set(true);
 this.api.salvar(c).subscribe({next:s=>{this.dados.set(structuredClone(s));this.salvando.set(false);this.sucesso.set('Configurações salvas.');},error:e=>{this.salvando.set(false);this.erro.set(e.status===409?'As configurações foram alteradas em outra sessão. Recarregue para revisar antes de salvar.':e.error?.message||e.error?.mensagem||'Não foi possível salvar. Revise os valores e tente novamente.');}});
 }
 salvarCapacidade(s:ServicoResponseDTO){if(this.salvandoServico()!==null)return;if(!Number.isInteger(s.capacidade)||s.capacidade!<1||s.capacidade!>100){this.erroServicos.set('A capacidade deve ser inteira entre 1 e 100.');return;}
 this.salvandoServico.set(s.id);this.erroServicos.set('');this.servicoApi.atualizarCapacidade(s.id,s.capacidade!).subscribe({next:()=>{this.salvandoServico.set(null);this.sucesso.set('Capacidade do serviço salva.');},error:()=>{this.salvandoServico.set(null);this.erroServicos.set('Não foi possível salvar a capacidade. Tente novamente.');}});
 }
}
