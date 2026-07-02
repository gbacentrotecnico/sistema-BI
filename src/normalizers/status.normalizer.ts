export enum OportunidadeStatus {
  AGENDADA = 'AGENDADA',
  COMPARECEU = 'COMPARECEU',
  NO_SHOW = 'NO_SHOW',
  CANCELADA = 'CANCELADA',
}

/**
 * Normaliza o status recebido de integrações externas para os status internos permitidos.
 */
export const normalizeStatus = (rawStatus: string | null | undefined): OportunidadeStatus | null => {
  if (!rawStatus) return null;

  const status = rawStatus.toUpperCase().trim();

  switch (status) {
    case 'AGENDADO':
    case 'AGENDADA':
    case 'SCHEDULED':
      return OportunidadeStatus.AGENDADA;
    case 'COMPARECEU':
    case 'VISITED':
    case 'SHOW':
      return OportunidadeStatus.COMPARECEU;
    case 'FALTOU':
    case 'NO SHOW':
    case 'NOSHOW':
    case 'NO_SHOW':
      return OportunidadeStatus.NO_SHOW;
    case 'CANCELADO':
    case 'CANCELADA':
    case 'CANCELED':
    case 'CANCELLED':
      return OportunidadeStatus.CANCELADA;
    default:
      return null; // Status desconhecido
  }
};
