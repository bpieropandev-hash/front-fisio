/**
 * Utilitários para formatação de datas no formato esperado pela API Physio Manager.
 * Usa horário local para evitar problemas de timezone.
 */

/**
 * Formata uma data para o padrão yyyy-MM-dd HH:mm:ss.SSS (API).
 * Usa horário local.
 */
export function formatDateTimeForApi(date: Date, fimDoDia = false): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  if (fimDoDia) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 23:59:59.999`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/**
 * Formata uma data para o padrão yyyy-MM-dd (API - campo date).
 * Usa horário local.
 */
export function formatDateForApi(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
