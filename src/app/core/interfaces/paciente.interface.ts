export interface PacienteCreateRequestDTO {
  nome: string;
  cpf: string;
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
  anamnese?: string;
}

export interface PacienteResponseDTO {
  id: number;
  nome: string;
  cpf: string;
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
  anamnese?: string;
  dataCadastro?: string;
  ativo?: boolean;
}


