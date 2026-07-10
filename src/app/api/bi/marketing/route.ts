import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get('startDate') || '2026-07-01';
    const endDateStr = url.searchParams.get('endDate') || '2026-07-10';

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    // Calcular período equivalente do mês anterior (MoM)
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    
    const prevEndDate = new Date(endDate);
    prevEndDate.setMonth(prevEndDate.getMonth() - 1);

    // 1. Buscar todos os registros do período atual (Unificados - sem separar por BM no Master)
    const campaigns = await prisma.performanceCampanha.findMany({
      where: {
        data: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { data: 'asc' }
    });

    // 2. Buscar todos os registros do período do mês anterior (Unificados)
    const prevCampaigns = await prisma.performanceCampanha.findMany({
      where: {
        data: {
          gte: prevStartDate,
          lte: prevEndDate
        }
      }
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

    // 7. CÁLCULO DE COMPARAÇÃO DE GESTORES (Apenas período concorrente / overlap)
    const integrations = await prisma.integration.findMany();
    const ctIntegrationIds = integrations
      .filter(i => i.nome.toUpperCase().includes('CT') || i.nome.toUpperCase().includes('CENTRO'))
      .map(i => i.id);
    const mecIntegrationIds = integrations
      .filter(i => i.nome.toUpperCase().includes('MEC') || i.nome.toUpperCase().includes('AUTOMOTIVO'))
      .map(i => i.id);

    const allCampaigns = await prisma.performanceCampanha.findMany();

    // Encontrar dias do Anderson e Fulvio
    const andersonDays = new Set(allCampaigns.filter(c => ctIntegrationIds.includes(c.integrationId || 0)).map(c => new Date(c.data).toDateString()));
    const fulvioDays = new Set(allCampaigns.filter(c => mecIntegrationIds.includes(c.integrationId || 0)).map(c => new Date(c.data).toDateString()));
    
    // Dias em que ambos rodaram juntos
    const overlapDays = Array.from(andersonDays).filter(d => fulvioDays.has(d));

    let andersonOverlapConv = 0, andersonOverlapSpent = 0, andersonOverlapCliques = 0;
    let fulvioOverlapConv = 0, fulvioOverlapSpent = 0, fulvioOverlapCliques = 0;

    allCampaigns.forEach(c => {
      const dateStr = new Date(c.data).toDateString();
      if (overlapDays.includes(dateStr)) {
        if (ctIntegrationIds.includes(c.integrationId || 0)) {
          andersonOverlapConv += c.conversoesMensagens || 0;
          andersonOverlapSpent += c.valorGasto || 0;
          andersonOverlapCliques += c.cliquesLink || 0;
        } else if (mecIntegrationIds.includes(c.integrationId || 0)) {
          fulvioOverlapConv += c.conversoesMensagens || 0;
          fulvioOverlapSpent += c.valorGasto || 0;
          fulvioOverlapCliques += c.cliquesLink || 0;
        }
      }
    });

    const overlapDates = overlapDays.map(d => new Date(d).getTime());
    const minOverlap = overlapDates.length > 0 ? new Date(Math.min(...overlapDates)).toLocaleDateString('pt-BR') : '';
    const maxOverlap = overlapDates.length > 0 ? new Date(Math.max(...overlapDates)).toLocaleDateString('pt-BR') : '';

    const andersonStats = overlapDays.length > 0 ? {
      conversas: andersonOverlapConv,
      cliques: andersonOverlapCliques,
      investimento: Number(andersonOverlapSpent.toFixed(2)),
      custoConversa: andersonOverlapConv > 0 ? Number((andersonOverlapSpent / andersonOverlapConv).toFixed(2)) : 0,
      cpc: andersonOverlapCliques > 0 ? Number((andersonOverlapSpent / andersonOverlapCliques).toFixed(2)) : 0,
      diasAtivos: overlapDays.length,
      inicio: minOverlap,
      fim: maxOverlap
    } : null;

    const fulvioStats = overlapDays.length > 0 ? {
      conversas: fulvioOverlapConv,
      cliques: fulvioOverlapCliques,
      investimento: Number(fulvioOverlapSpent.toFixed(2)),
      custoConversa: fulvioOverlapConv > 0 ? Number((fulvioOverlapSpent / fulvioOverlapConv).toFixed(2)) : 0,
      cpc: fulvioOverlapCliques > 0 ? Number((fulvioOverlapSpent / fulvioOverlapCliques).toFixed(2)) : 0,
      diasAtivos: overlapDays.length,
      inicio: minOverlap,
      fim: maxOverlap
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
        overlap: overlapDays.length > 0 ? { dias: overlapDays.length } : null
      }
    });

  } catch (error: any) {
    console.error('[Marketing BI API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
