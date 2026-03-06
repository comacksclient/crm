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

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only.' }, { status: 403 });
        }

        const unassignedLeads = await prisma.lead.findMany({
            where: {
                team_id: null,
                lead_status: 'Active'
            },
            take: 2000,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                lead_identity: true,
                assignment_info: true,
                lead_type: true,
                createdAt: true
            }
        });

        return NextResponse.json({ leads: unassignedLeads });
    } catch (e: any) {
        console.error("Error fetching unassigned leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
