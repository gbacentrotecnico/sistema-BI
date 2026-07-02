import { prisma } from '@/config/prisma';

export class UpsertContactCommand {
  static async execute(data: { name: string; phone_number?: string; chatwoot_id?: string }) {
    if (!data.phone_number) {
      // O esquema atual exige Telefone único.
      // Se não houver telefone no Chatwoot, geramos um fallback temporário baseado no ID
      // No mundo real, a modelagem de Cliente deveria ter chatwoot_id @unique
      data.phone_number = `fallback_${data.chatwoot_id || Date.now()}`;
    }

    // Formatar telefone básico (removendo caracteres não numéricos) se for real
    const telefoneLimpo = data.phone_number.startsWith('fallback') 
      ? data.phone_number 
      : data.phone_number.replace(/\D/g, '');

    const cliente = await prisma.cliente.upsert({
      where: { telefone: telefoneLimpo },
      update: {
        nome: data.name,
        updated_at: new Date()
      },
      create: {
        telefone: telefoneLimpo,
        nome: data.name
      }
    });

    return cliente;
  }
}
