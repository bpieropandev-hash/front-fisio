export type FonteTema = 'acolhedor' | 'classico' | 'moderno' | 'editorial' | 'direto';
export type TamanhoFonte = 'pequeno' | 'medio' | 'grande';

export interface UsuarioMeResponseDTO {
  id: number;
  login: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  fotoBase64: string | null;
  role: string;
  corPrimaria: string | null;
  fonteTema: FonteTema | null;
  tamanhoFonte: TamanhoFonte | null;
}

export interface AtualizarUsuarioRequestDTO {
  login: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  corPrimaria: string | null;
  fonteTema: FonteTema | null;
  tamanhoFonte: TamanhoFonte | null;
}

export interface UploadFotoRequestDTO {
  fotoBase64: string;
}
