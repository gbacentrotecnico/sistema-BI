import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET() {
  try {
    const colaboradores = await prisma.tele.findMany({
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json({ success: true, colaboradores });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, nome, tipo, aliases } = await request.json();
    
    if (id) {
      // Update
      const colaborador = await prisma.tele.update({
        where: { id: parseInt(id, 10) },
        data: {
          nome,
          tipo,
          aliases: aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : undefined
        }
      });
      return NextResponse.json({ success: true, colaborador });
    } else {
      // Create
      if (!nome || !tipo) {
        return NextResponse.json({ success: false, error: 'Nome e Tipo de colaborador são obrigatórios.' }, { status: 400 });
      }

      const colaborador = await prisma.tele.create({
        data: {
          nome,
          tipo,
          aliases: aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : [nome]
        }
      });
      return NextResponse.json({ success: true, colaborador });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
