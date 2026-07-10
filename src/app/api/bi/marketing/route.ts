import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get('startDate') || '2026-07-01';
    const endDateStr = url.searchParams.get('endDate') || '2026-07-10';
    const storeFilter = url.searchParams.get('store') || 'all'; // 'all', 'mecanica', 'ct'

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    // Calcular período equivalente do mês anterior (MoM)
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    
    const prevEndDate = new Date(endDate);
    prevEndDate.setMonth(prevEndDate.getMonth() - 1);

    // Buscar todas as integrações
    const integrations = await prisma.integration.findMany();
    const ctIntegrationIds = integrations
      .filter(i => i.nome.toUpperCase().includes('CT') || i.nome.toUpperCase().includes('CENTRO'))
      .map(i => i.id);
    const mecIntegrationIds = integrations
      .filter(i => i.nome.toUpperCase().includes('MEC') || i.nome.toUpperCase().includes('AUTOMOTIVO'))
      .map(i => i.id);

    // Filtros de query do Prisma
    const buildWhereClause = (start: Date, end: Date) => {
      const where: any = {
        data: {
          gte: start,
          lte: end
        }
      };
      if (storeFilter === 'mecanica' && mecIntegrationIds.length > 0) {
        where.integrationId = { in: mecIntegrationIds };
      } else if (storeFilter === 'ct' && ctIntegrationIds.length > 0) {
        where.integrationId = { in: ctIntegrationIds };
      }
      return where;
    };

    // 1. Buscar registros do período atual
    const campaigns = await prisma.performanceCampanha.findMany({
      where: buildWhereClause(startDate, endDate),
      orderBy: { data: 'asc' }
    });

    // 2. Buscar registros do período do mês anterior
    const prevCampaigns = await prisma.performanceCampanha.findMany({
      where: buildWhereClause(prevStartDate, prevEndDate)
    });

    // 3. Agregados Período Atual
    let totalConversas = 0;
    let totalCliques = 0;
    let totalAlcance = 0;
    let totalImpressoes = 0;
    let totalInvestimento = 0;

    campaigns.forEach(c => {
      totalConversas += c.conversoesMensagens || 0;
      totalCliques += c.cliquesLink || 0;
      totalAlcance += c.alcance || 0;
      totalImpressoes += c.impressoes || 0;
      totalInvestimento += c.valorGasto || 0;
    });

    const custoMedioConversa = totalConversas > 0 ? totalInvestimento / totalConversas : 0;
    const cpcMedio = totalCliques > 0 ? totalInvestimento / totalCliques : 0;

    // 4. Agregados Período Anterior
    let prevTotalConversas = 0;
    let prevTotalCliques = 0;
    let prevTotalAlcance = 0;
    let prevTotalImpressoes = 0;
    let prevTotalInvestimento = 0;

    prevCampaigns.forEach(c => {
      prevTotalConversas += c.conversoesMensagens || 0;
      prevTotalCliques += c.cliquesLink || 0;
      prevTotalAlcance += c.alcance || 0;
      prevTotalImpressoes += c.impressoes || 0;
      prevTotalInvestimento += c.valorGasto || 0;
    });

    const prevCustoMedioConversa = prevTotalConversas > 0 ? prevTotalInvestimento / prevTotalConversas : 0;
    const prevCpcMedio = prevTotalCliques > 0 ? prevTotalInvestimento / prevTotalCliques : 0;

    // Helper para variação percentual
    const getDiff = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    // 5. Agrupar por data (Evolução Diária)
    const dailyMap = new Map<string, { dataStr: string; conversas: number; cliques: number; investimento: number; impressoes: number }>();
    const current = new Date(startDate);
    while (current <= endDate) {
      const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
      dailyMap.set(label, { dataStr: label, conversas: 0, cliques: 0, investimento: 0, impressoes: 0 });
      current.setDate(current.getDate() + 1);
    }

    campaigns.forEach(c => {
      const label = new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
      const currentVal = dailyMap.get(label) || { dataStr: label, conversas: 0, cliques: 0, investimento: 0, impressoes: 0 };
      currentVal.conversas += c.conversoesMensagens || 0;
      currentVal.cliques += c.cliquesLink || 0;
      currentVal.investimento += c.valorGasto || 0;
      currentVal.impressoes += c.impressoes || 0;
      dailyMap.set(label, currentVal);
    });

    // 6. Agrupar por Criativo
    const creativeMap = new Map<string, {
      criativo: string;
      conversas: number;
      cliques: number;
      impressoes: number;
      alcance: number;
      investimento: number;
      frequenciaSoma: number;
      frequenciaCount: number;
    }>();

    campaigns.forEach(c => {
      const key = c.adSetName || 'Outros';
      const existing = creativeMap.get(key) || {
        criativo: key,
        conversas: 0,
        cliques: 0,
        impressoes: 0,
        alcance: 0,
        investimento: 0,
        frequenciaSoma: 0,
        frequenciaCount: 0
      };
      existing.conversas += c.conversoesMensagens || 0;
      existing.cliques += c.cliquesLink || 0;
      existing.impressoes += c.impressoes || 0;
      existing.alcance += c.alcance || 0;
      existing.investimento += c.valorGasto || 0;
      existing.frequenciaSoma += c.frequencia || 0;
      existing.frequenciaCount += 1;
      creativeMap.set(key, existing);
    });

    const tableData = Array.from(creativeMap.values()).map(c => {
      const freqMedia = c.frequenciaCount > 0 ? c.frequenciaSoma / c.frequenciaCount : 0;
      const cpc = c.cliques > 0 ? c.investimento / c.cliques : 0;
      const custoConversa = c.conversas > 0 ? c.investimento / c.conversas : 0;
      return {
        criativo: c.criativo,
        conversas: c.conversas,
        custoConversa: Number(custoConversa.toFixed(2)),
        cliques: c.cliques,
        cpc: Number(cpc.toFixed(2)),
        impressoes: c.impressoes,
        frequencia: Number(freqMedia.toFixed(2)),
        alcance: c.alcance,
        investimento: Number(c.investimento.toFixed(2))
      };
    }).sort((a, b) => b.investimento - a.investimento);

    // 7. CÁLCULO DE COMPARAÇÃO DE GESTORES (Anderson vs. Fulvio)
    // Busca todo o histórico dos dois
    const allCampaigns = await prisma.performanceCampanha.findMany();

    const calculateManagerStats = (filterIds: number[]) => {
      const filtered = allCampaigns.filter(c => filterIds.includes(c.integrationId || 0));
      if (filtered.length === 0) return null;

      let conv = 0, cli = 0, spent = 0, imp = 0, alc = 0;
      const dates = filtered.map(c => new Date(c.data).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      filtered.forEach(c => {
        conv += c.conversoesMensagens || 0;
        cli += c.cliquesLink || 0;
        spent += c.valorGasto || 0;
        imp += c.impressoes || 0;
        alc += c.alcance || 0;
      });

      const uniqueDays = new Set(filtered.map(c => new Date(c.data).toDateString())).size;

      return {
        conversas: conv,
        cliques: cli,
        investimento: Number(spent.toFixed(2)),
        custoConversa: conv > 0 ? Number((spent / conv).toFixed(2)) : 0,
        cpc: cli > 0 ? Number((spent / cli).toFixed(2)) : 0,
        diasAtivos: uniqueDays,
        inicio: minDate.toLocaleDateString('pt-BR'),
        fim: maxDate.toLocaleDateString('pt-BR')
      };
    };

    const andersonStats = calculateManagerStats(ctIntegrationIds);
    const fulvioStats = calculateManagerStats(mecIntegrationIds);

    // Período Concorrente (Overlap)
    const andersonDays = new Set(allCampaigns.filter(c => ctIntegrationIds.includes(c.integrationId || 0)).map(c => new Date(c.data).toDateString()));
    const fulvioDays = new Set(allCampaigns.filter(c => mecIntegrationIds.includes(c.integrationId || 0)).map(c => new Date(c.data).toDateString()));
    const overlapDays = Array.from(andersonDays).filter(d => fulvioDays.has(d));

    let overlapAndersonConv = 0, overlapAndersonSpent = 0;
    let overlapFulvioConv = 0, overlapFulvioSpent = 0;

    allCampaigns.forEach(c => {
      const dateStr = new Date(c.data).toDateString();
      if (overlapDays.includes(dateStr)) {
        if (ctIntegrationIds.includes(c.integrationId || 0)) {
          overlapAndersonConv += c.conversoesMensagens || 0;
          overlapAndersonSpent += c.valorGasto || 0;
        } else if (mecIntegrationIds.includes(c.integrationId || 0)) {
          overlapFulvioConv += c.conversoesMensagens || 0;
          overlapFulvioSpent += c.valorGasto || 0;
        }
      }
    });

    const overlapStats = overlapDays.length > 0 ? {
      dias: overlapDays.length,
      anderson: {
        conversas: overlapAndersonConv,
        investimento: Number(overlapAndersonSpent.toFixed(2)),
        custoConversa: overlapAndersonConv > 0 ? Number((overlapAndersonSpent / overlapAndersonConv).toFixed(2)) : 0
      },
      fulvio: {
        conversas: overlapFulvioConv,
        investimento: Number(overlapFulvioSpent.toFixed(2)),
        custoConversa: overlapFulvioConv > 0 ? Number((overlapFulvioSpent / overlapFulvioConv).toFixed(2)) : 0
      }
    } : null;

    return NextResponse.json({
      success: true,
      summary: {
        totalConversas,
        diffConversas: Number(getDiff(totalConversas, prevTotalConversas).toFixed(1)),
        
        custoMedioConversa: Number(custoMedioConversa.toFixed(2)),
        diffCustoConversa: Number(getDiff(custoMedioConversa, prevCustoMedioConversa).toFixed(1)),
        
        totalCliques,
        diffCliques: Number(getDiff(totalCliques, prevTotalCliques).toFixed(1)),
        
        cpcMedio: Number(cpcMedio.toFixed(2)),
        diffCpc: Number(getDiff(cpcMedio, prevCpcMedio).toFixed(1)),
        
        totalAlcance,
        diffAlcance: Number(getDiff(totalAlcance, prevTotalAlcance).toFixed(1)),
        
        totalImpressoes,
        diffImpressoes: Number(getDiff(totalImpressoes, prevTotalImpressoes).toFixed(1)),
        
        totalInvestimento: Number(totalInvestimento.toFixed(2)),
        diffInvestimento: Number(getDiff(totalInvestimento, prevTotalInvestimento).toFixed(1))
      },
      dailyData: Array.from(dailyMap.values()),
      tableData,
      gestores: {
        anderson: andersonStats,
        fulvio: fulvioStats,
        overlap: overlapStats
      }
    });

  } catch (error: any) {
    console.error('[Marketing BI API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
