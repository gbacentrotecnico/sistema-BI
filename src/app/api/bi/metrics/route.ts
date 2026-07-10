import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET() {
  try {
    // 1. Leads Atendidos (Conversas)
    const leadsAtendidos = await prisma.conversa.count();

    // 2. Cupons Gerados (Oportunidades com cupom associado)
    const cuponsGerados = await prisma.oportunidade.count({
      where: { cupom_id: { not: null } }
    });

    // 3. Carros em Loja (Oportunidades com status COMPARECEU)
    const carrosEmLoja = await prisma.oportunidade.count({
      where: { status: 'COMPARECEU' }
    });

    // 4. Conversão Geral = Carros em Loja / Leads Atendidos
    const conversaoGeral = leadsAtendidos > 0 ? (carrosEmLoja / leadsAtendidos) * 100 : 0;

    // 5. Conversão Real:
    // Dedução de tags de exclusão na Fato_Conversa (ex: ddd_de_fora, falta_de_pneu, pneu_que_nao_trabalhamos)
    // Para simplificar, buscamos todas as conversas e filtramos em memória ou fazemos query filtrando por array overlaps.
    // Como Prisma lida com arrays postgres com postgresql-specific syntax, faremos a exclusão no banco:
    const tagsExclusao = ['ddd_de_fora', 'falta_de_pneu', 'pneu_que_nao_trabalhamos'];
    
    // Contar conversas que NÃO contém nenhuma das tags de exclusão
    const leadsQualificados = await prisma.conversa.count({
      where: {
        NOT: {
          etiquetas: {
            hasSome: tagsExclusao
          }
        }
      }
    });

    const conversaoReal = leadsQualificados > 0 ? (carrosEmLoja / leadsQualificados) * 100 : 0;

    // 6. Faturamento Real da Loja (Soma apenas a planilha de origem 'TELE')
    const faturamentoAgregado = await prisma.vendaDiariaColaborador.aggregate({
      where: { origem_planilha: 'TELE' },
      _sum: {
        total_liquido: true,
        lucro: true
      }
    });

    const faturamentoReal = Number(faturamentoAgregado._sum.total_liquido || 0);
    const lucroReal = Number(faturamentoAgregado._sum.lucro || 0);

    // 7. CAC (Custo de Aquisição de Cliente)
    // CAC = Valor Gasto no Marketing / Carros em Loja
    const totalGastoMarketingAgg = await prisma.performanceCampanha.aggregate({
      _sum: {
        valorGasto: true
      }
    });
    const totalGastoMarketing = totalGastoMarketingAgg._sum.valorGasto || 0;
    const cac = carrosEmLoja > 0 ? totalGastoMarketing / carrosEmLoja : 0;

    // 8. Faturamento por Loja (segmentação para gráfico de pizza)
    const faturamentoPorLojaRaw = await prisma.vendaDiariaColaborador.groupBy({
      by: ['loja_id'],
      where: { origem_planilha: 'TELE' },
      _sum: {
        total_liquido: true
      }
    });

    const lojas = await prisma.loja.findMany();
    const faturamentoPorLoja = faturamentoPorLojaRaw.map(item => {
      const lojaObj = lojas.find(l => l.id === item.loja_id);
      return {
        loja: lojaObj ? lojaObj.nome : `Loja ${item.loja_id}`,
        valor: Number(item._sum.total_liquido || 0)
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        leadsAtendidos,
        cuponsGerados,
        carrosEmLoja,
        conversaoGeral,
        conversaoReal,
        leadsQualificados,
        faturamentoReal,
        lucroReal,
        cac,
        totalGastoMarketing
      },
      faturamentoPorLoja
    });

  } catch (error: any) {
    console.error('[BI Metrics Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
