/** Espelha PaginaResponseDTO do backend (P1.3) */
export interface PaginaResponse<T> {
  conteudo: T[];
  paginaAtual: number;
  tamanhoPagina: number;
  totalElementos: number;
  totalPaginas: number;
}
