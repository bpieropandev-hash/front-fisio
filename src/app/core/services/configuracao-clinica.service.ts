import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
export interface ItemCatalogo { codigo:string; nome:string; ativo:boolean; }
export interface ConfiguracaoClinica {
 versao:number; emitenteNome:string; emitenteDocumento:string;
 mensalidadeValorPadrao:number; mensalidadeDiaVencimento:number;
 capacidadeFisioterapia:number; capacidadePilates:number; agruparAgenda:boolean;
 fotoLimiteMiB:number; exibirDor:boolean; procedimentos:ItemCatalogo[]; equipamentos:ItemCatalogo[];
}
export function configuracaoPadrao():ConfiguracaoClinica {
 const itens=(v:[string,string][]):ItemCatalogo[]=>v.map(([codigo,nome])=>({codigo,nome,ativo:true}));
 return {versao:0,emitenteNome:'',emitenteDocumento:'',mensalidadeValorPadrao:0,mensalidadeDiaVencimento:5,capacidadeFisioterapia:1,capacidadePilates:15,agruparAgenda:true,fotoLimiteMiB:5,exibirDor:true,
 procedimentos:itens([['PRESSAO_ARTERIAL','Pressão aferida'],['ALONGAMENTO','Alongamento'],['FORTALECIMENTO','Fortalecimento'],['MOBILIZACAO','Mobilização'],['TERAPIA_MANUAL','Terapia manual'],['EXERCICIO_RESPIRATORIO','Exercício respiratório'],['PILATES','Pilates']]),
 equipamentos:itens([['REFORMER','Reformer'],['CADILLAC','Cadillac'],['CHAIR','Chair'],['BARREL','Barrel'],['SOLO','Solo'],['ACESSORIOS','Acessórios']])};
}
@Injectable({providedIn:'root'})
export class ConfiguracaoClinicaService {
 private readonly http=inject(HttpClient);
 private readonly url=API_CONFIG.baseUrl+'/api/v1/configuracoes';
 readonly atual=signal<ConfiguracaoClinica>(configuracaoPadrao());
 readonly indisponivel=signal(false);
 buscar(){return this.http.get<ConfiguracaoClinica>(this.url).pipe(tap(c=>{this.atual.set(c);this.indisponivel.set(false);}));}
 salvar(c:ConfiguracaoClinica){return this.http.put<ConfiguracaoClinica>(this.url,c).pipe(tap(v=>{this.atual.set(v);this.indisponivel.set(false);}));}
 carregar(){this.buscar().subscribe({error:()=>this.indisponivel.set(true)});}
 limpar(){this.atual.set(configuracaoPadrao());this.indisponivel.set(false);}
}
