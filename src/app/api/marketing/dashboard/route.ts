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

function isBirthdateInInterval(birthdate: Date, start: Date, end: Date): boolean {
  const bMonth = birthdate.getMonth();
  const bDay = birthdate.getDate();

  // Testa no ano da data de início
  const testDate = new Date(start.getFullYear(), bMonth, bDay);
  if (testDate >= start && testDate <= end) return true;

  // Se o intervalo cruzar a virada de ano
  if (start.getFullYear() !== end.getFullYear()) {
    const testDateNext = new Date(end.getFullYear(), bMonth, bDay);
    if (testDateNext >= start && testDateNext <= end) return true;
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Obter parâmetros de data das query params
    const selectedDateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Filtro Aniversariantes
    const anivStartDateStr = url.searchParams.get('anivStartDate');
    const anivEndDateStr = url.searchParams.get('anivEndDate');
    
    // Filtro Revisão
    const revStartDateStr = url.searchParams.get('revStartDate');
    const revEndDateStr = url.searchParams.get('revEndDate');

    // Inicializar intervalos padrões se não informados
    let anivStart: Date;
    let anivEnd: Date;
    
    if (anivStartDateStr && anivEndDateStr) {
      anivStart = new Date(anivStartDateStr + 'T00:00:00');
      anivEnd = new Date(anivEndDateStr + 'T23:59:59');
    } else {
      const today = new Date(selectedDateStr + 'T00:00:00');
      const { monday, sunday } = getWeekInterval(today);
      anivStart = monday;
      anivEnd = sunday;
    }

    let revStartOfPurchase: Date;
    let revEndOfPurchase: Date;

    if (revStartDateStr && revEndDateStr) {
      const rStart = new Date(revStartDateStr + 'T00:00:00');
      const rEnd = new Date(revEndDateStr + 'T23:59:59');
      
      // Data de compra alvo é 90 dias atrás do período selecionado
      revStartOfPurchase = new Date(rStart.getTime() - 90 * 24 * 60 * 60 * 1000);
      revEndOfPurchase = new Date(rEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      const referenceDate = new Date(selectedDateStr + 'T00:00:00');
      const purchaseTargetDate = new Date(referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      revStartOfPurchase = new Date(purchaseTargetDate.getFullYear(), purchaseTargetDate.getMonth(), purchaseTargetDate.getDate(), 0, 0, 0);
      revEndOfPurchase = new Date(purchaseTargetDate.getFullYear(), purchaseTargetDate.getMonth(), purchaseTargetDate.getDate(), 23, 59, 59, 999);
    }

    // 1. ANIVERSARIANTES
    // Buscamos todos os clientes com data de nascimento cadastrada e filtramos em memória
    const clientsWithBirthdays = await prisma.cliente.findMany({
      where: {
        data_nascimento: { not: null }
      },
      orderBy: { nome: 'asc' }
    });

    const aniversariantes = clientsWithBirthdays.filter(c => {
      if (!c.data_nascimento) return false;
      return isBirthdateInInterval(new Date(c.data_nascimento), anivStart, anivEnd);
    }).map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      telefone2: c.telefone2,
      data_nascimento: c.data_nascimento?.toISOString().split('T')[0],
      data_ultima_compra: c.data_ultima_compra?.toISOString().split('T')[0] || null,
      placa_veiculo: c.placa_veiculo,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));

    // 2. REVISÃO DE 90 DIAS
    const revisionClients = await prisma.cliente.findMany({
      where: {
        data_ultima_compra: {
          gte: revStartOfPurchase,
          lte: revEndOfPurchase
        }
      },
      orderBy: { nome: 'asc' }
    });

    const revisoes = revisionClients.map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      telefone2: c.telefone2,
      data_nascimento: c.data_nascimento?.toISOString().split('T')[0] || null,
      data_ultima_compra: c.data_ultima_compra?.toISOString().split('T')[0],
      placa_veiculo: c.placa_veiculo,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));

    // 3. DATA DA ÚLTIMA IMPORTAÇÃO
    // Pegamos a maior data de criação na tabela de clientes
    const latestClient = await prisma.cliente.findFirst({
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    });
    const lastImportDate = latestClient?.created_at?.toISOString() || null;

    return NextResponse.json({
      success: true,
      meta: {
        anivStart: anivStart.toISOString().split('T')[0],
        anivEnd: anivEnd.toISOString().split('T')[0],
        revStartOfPurchase: revStartOfPurchase.toISOString().split('T')[0],
        revEndOfPurchase: revEndOfPurchase.toISOString().split('T')[0],
        selectedDate: selectedDateStr,
        lastImportDate
      },
      aniversariantes,
      revisoes
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Marketing Dashboard Error]', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard de marketing', details: error.message }, { status: 500 });
  }
}
