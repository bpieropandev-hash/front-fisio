export interface AuthenticationDTO {
  login: string;
  senha: string;
}

export interface LoginResponseDTO {
  token: string;
}

export interface EsqueciSenhaRequestDTO {
  loginOuEmail: string;
}

export interface RedefinirSenhaRequestDTO {
  token: string;
  novaSenha: string;
}

export interface AlterarSenhaRequestDTO {
  senhaAtual: string;
  novaSenha: string;
}


