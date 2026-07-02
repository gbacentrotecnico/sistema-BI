/**
 * Normaliza datas para um formato UTC seguro no Banco.
 * Suporta timestamp Unix ou strings ISO.
 */
export const normalizeDate = (dateValue: string | number | Date | null | undefined): Date | null => {
  if (!dateValue) return null;

  try {
    const parsed = new Date(dateValue);
    
    // Verifica se a data é inválida
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
