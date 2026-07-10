import { IIntegrationAdapter } from '../IIntegrationAdapter';
import { RawEvent } from '@prisma/client';
import { prisma } from '@/config/prisma';

export class MetaAdsAdapter implements IIntegrationAdapter {
  async processEvent(rawEvent: RawEvent): Promise<void> {
    const payload = rawEvent.payload_json as any;
    if (!payload) return;

    // Helpers robustos de tratamento de dados
    const parseBR = (val: any): number | null => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'string') {
        const cleaned = val.replace(',', '.').trim();
        if (cleaned.toLowerCase() === 'nan' || cleaned.toLowerCase() === 'null') {
          return null;
        }
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof val === 'number') {
        return isNaN(val) ? null : val;
      }
      return null;
    };

    const parseBRRequired = (val: any, defaultVal = 0): number => {
      const parsed = parseBR(val);
      return parsed === null ? defaultVal : parsed;
    };

    const parseIntSafe = (val: any): number | null => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'string') {
        const cleaned = val.trim();
        if (cleaned.toLowerCase() === 'nan' || cleaned.toLowerCase() === 'null') {
          return null;
        }
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof val === 'number') {
        return isNaN(val) ? null : Math.round(val);
      }
      return null;
    };

    const parseIntRequired = (val: any, defaultVal = 0): number => {
      const parsed = parseIntSafe(val);
      return parsed === null ? defaultVal : parsed;
    };

    const dayVal = payload['Day'] || payload['day'] || payload['data'];
    const data = dayVal ? new Date(dayVal) : new Date();
    const adSetName = payload['Ad Set Name'] || payload['adSetName'] || 'N/A';
    const campaignName = payload['Campaign Name'] || payload['campaignName'] || 'N/A';
    const integrationId = rawEvent.integration_id;

    await prisma.performanceCampanha.upsert({
      where: {
        data_adSetName_campaignName_integrationId: {
          data,
          adSetName,
          campaignName,
          integrationId
        }
      },
      update: {
        alcance: parseIntRequired(payload['Reach'] || payload['alcance']),
        impressoes: parseIntRequired(payload['Impressions'] || payload['impressoes']),
        frequencia: parseBRRequired(payload['Frequency'] || payload['frequencia']),
        resultados: parseBR(payload['Results'] || payload['resultados']),
        custoPorResultado: parseBR(payload['Cost per Result'] || payload['custoPorResultado']),
        valorGasto: parseBRRequired(payload['Amount Spent'] || payload['valorGasto']),
        cpm: parseBRRequired(payload['CPM (Cost per 1,000 Impressions)'] || payload['cpm']),
        cliquesLink: parseIntRequired(payload['Link Clicks'] || payload['cliquesLink']),
        cpc: parseBR(payload['CPC (Cost per Link Click)'] || payload['cpc']),
        ctr: parseBRRequired(payload['CTR (Link Click-Through Rate)'] || payload['ctr']),
        videoWatches25: parseIntSafe(payload['Video Watches at 25%'] || payload['videoWatches25']),
        videoWatches50: parseIntSafe(payload['Video Watches at 50%'] || payload['videoWatches50']),
        videoWatches75: parseIntSafe(payload['Video Watches at 75%'] || payload['videoWatches75']),
        videoWatches95: parseIntSafe(payload['Video Watches at 95%'] || payload['videoWatches95']),
        conversoesMensagens: parseIntSafe(payload['Messaging Conversations Started'] || payload['conversoesMensagens']),
        custoPorConversaoMensagem: parseBR(payload['Cost per Messaging Conversations Started'] || payload['custoPorConversaoMensagem'])
      },
      create: {
        data,
        adSetName,
        campaignName,
        alcance: parseIntRequired(payload['Reach'] || payload['alcance']),
        impressoes: parseIntRequired(payload['Impressions'] || payload['impressoes']),
        frequencia: parseBRRequired(payload['Frequency'] || payload['frequencia']),
        resultados: parseBR(payload['Results'] || payload['resultados']),
        custoPorResultado: parseBR(payload['Cost per Result'] || payload['custoPorResultado']),
        valorGasto: parseBRRequired(payload['Amount Spent'] || payload['valorGasto']),
        cpm: parseBRRequired(payload['CPM (Cost per 1,000 Impressions)'] || payload['cpm']),
        cliquesLink: parseIntRequired(payload['Link Clicks'] || payload['cliquesLink']),
        cpc: parseBR(payload['CPC (Cost per Link Click)'] || payload['cpc']),
        ctr: parseBRRequired(payload['CTR (Link Click-Through Rate)'] || payload['ctr']),
        videoWatches25: parseIntSafe(payload['Video Watches at 25%'] || payload['videoWatches25']),
        videoWatches50: parseIntSafe(payload['Video Watches at 50%'] || payload['videoWatches50']),
        videoWatches75: parseIntSafe(payload['Video Watches at 75%'] || payload['videoWatches75']),
        videoWatches95: parseIntSafe(payload['Video Watches at 95%'] || payload['videoWatches95']),
        conversoesMensagens: parseIntSafe(payload['Messaging Conversations Started'] || payload['conversoesMensagens']),
        custoPorConversaoMensagem: parseBR(payload['Cost per Messaging Conversations Started'] || payload['custoPorConversaoMensagem']),
        integrationId
      }
    });
  }
}
