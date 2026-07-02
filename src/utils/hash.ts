import crypto from 'crypto';

/**
 * Ordena recursivamente as chaves de um objeto para garantir que
 * a stringificação seja determinística (independentemente da ordem que o JSON chegou).
 */
export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  
  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key]);
  }
  
  return result;
}

/**
 * Gera um hash SHA-256 determinístico de um payload JSON
 */
export function generatePayloadHash(payload: any): string {
  const sortedPayload = sortObjectKeys(payload);
  const jsonString = JSON.stringify(sortedPayload);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}
