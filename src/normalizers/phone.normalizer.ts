/**
 * Normaliza números de telefone para o padrão E.164 simplificado: 5516999999999
 * Funciona como função pura, removendo parênteses, traços e espaços,
 * e garantindo o DDI 55 no início.
 */
export const normalizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;

  // Remove tudo que não é dígito
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) return null;

  // Se tem 10 ou 11 dígitos, provavelmente é um número brasileiro sem o DDI
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  // Se for maior e começar com 0 (ex: 055119999...), remove o zero inicial (DDI internacional de alguns PBX)
  if (cleaned.startsWith('055') && cleaned.length > 12) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};
