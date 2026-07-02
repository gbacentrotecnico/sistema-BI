/**
 * Normaliza os arrays de labels.
 * Transforma todas as strings para lowercase, remove espaços vazios
 * e remove duplicatas.
 */
export const normalizeLabels = (labels: string[] | null | undefined): string[] => {
  if (!labels || !Array.isArray(labels)) return [];

  const normalized = labels
    .map(label => label.toLowerCase().trim())
    .filter(label => label.length > 0);

  return [...new Set(normalized)];
};
