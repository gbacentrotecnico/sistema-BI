import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET() {
  try {
    const lojas = await prisma.loja.findMany({
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json({ success: true, lojas });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { codigo, nome } = await request.json();
    if (!codigo || !nome) {
      return NextResponse.json({ success: false, error: 'Código e Nome são obrigatórios.' }, { status: 400 });
    }

    const existing = await prisma.loja.findUnique({ where: { codigo } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Já existe uma loja cadastrada com este código.' }, { status: 400 });
    }

    const loja = await prisma.loja.create({
      data: { codigo, nome }
    });

    return NextResponse.json({ success: true, loja });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
