import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden: Admins or Managers Only' }, { status: 403 });
        }

        const teams = await prisma.team.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true, leads: true }
                }
            }
        });

        return NextResponse.json({ teams });
    } catch (e: any) {
        console.error("Error fetching teams list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
