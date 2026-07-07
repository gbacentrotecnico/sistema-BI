import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

function getWeekInterval(now: Date) {
  // Ajusta para a segunda-feira da semana corrente
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1); // 0 é domingo
  
  const monday = new Date(now.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function isBirthdateInWeek(birthdate: Date, startOfWeek: Date, endOfWeek: Date): boolean {
  const bMonth = birthdate.getMonth();
  const bDay = birthdate.getDate();

  // Testa no ano da segunda-feira
  const testDate = new Date(startOfWeek.getFullYear(), bMonth, bDay);
  if (testDate >= startOfWeek && testDate <= endOfWeek) return true;

  // Se a semana cruzar a virada de ano
  if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
    const testDateNext = new Date(endOfWeek.getFullYear(), bMonth, bDay);
    if (testDateNext >= startOfWeek && testDateNext <= endOfWeek) return true;
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const selectedDateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const today = new Date();
    const { monday, sunday } = getWeekInterval(new Date(today));

    // 1. ANIVERSARIANTES DA SEMANA
    // Buscamos todos os clientes com data de nascimento cadastrada e filtramos em memória
    const clientsWithBirthdays = await prisma.cliente.findMany({
      where: {
        data_nascimento: { not: null }
      },
      orderBy: { nome: 'asc' }
    });

    const aniversariantes = clientsWithBirthdays.filter(c => {
      if (!c.data_nascimento) return false;
      return isBirthdateInWeek(new Date(c.data_nascimento), monday, sunday);
    }).map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      telefone2: c.telefone2,
      data_nascimento: c.data_nascimento?.toISOString().split('T')[0],
      placa_veiculo: c.placa_veiculo
    }));

    // 2. REVISÃO DE 90 DIAS
    // Filtro por data de última compra correspondente a exatos 90 dias atrás da data selecionada
    const referenceDate = new Date(selectedDateStr);
    const purchaseTargetDate = new Date(referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const startOfPurchaseDay = new Date(purchaseTargetDate.getFullYear(), purchaseTargetDate.getMonth(), purchaseTargetDate.getDate(), 0, 0, 0);
    const endOfPurchaseDay = new Date(purchaseTargetDate.getFullYear(), purchaseTargetDate.getMonth(), purchaseTargetDate.getDate(), 23, 59, 59, 999);

    const revisionClients = await prisma.cliente.findMany({
      where: {
        data_ultima_compra: {
          gte: startOfPurchaseDay,
          lte: endOfPurchaseDay
        }
      },
      orderBy: { nome: 'asc' }
    });

    const revisoes = revisionClients.map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      telefone2: c.telefone2,
      data_ultima_compra: c.data_ultima_compra?.toISOString().split('T')[0],
      placa_veiculo: c.placa_veiculo
    }));

    return NextResponse.json({
      success: true,
      meta: {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
        selectedDate: selectedDateStr,
        purchaseTargetDate: purchaseTargetDate.toISOString().split('T')[0]
      },
      aniversariantes,
      revisoes
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Marketing Dashboard Error]', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard de marketing', details: error.message }, { status: 500 });
  }
}
