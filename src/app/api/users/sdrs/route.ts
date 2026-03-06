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

        if (!dbUser || dbUser.role !== 'MANAGER' || !dbUser.team_id) {
            return NextResponse.json({ error: 'Forbidden: Mapped Managers Only' }, { status: 403 });
        }

        // Fetch ONLY the SDRs that are placed on the exact same Team as this Manager
        const sdrs = await prisma.user.findMany({
            where: {
                role: 'SDR',
                team_id: dbUser.team_id
            },
            select: { id: true, name: true, email: true }
        });

        return NextResponse.json({
            sdrs,
            managerTeamId: dbUser.team_id
        });
    } catch (e: any) {
        console.error("Error fetching SDR list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
