import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';



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
            return NextResponse.json({ error: 'Forbidden: Managers explicitly mapped to a Team only.' }, { status: 403 });
        }

        // Fetch leads that are:
        // 1. Assigned to this Manager's team by the Admin
        // 2. Not yet assigned to a specific SDR
        // 3. Active
        const unassignedLeads = await prisma.lead.findMany({
            where: {
                team_id: dbUser.team_id,
                sdr_id: null,
                lead_status: 'Active'
            },
            take: 1000,
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
        console.error("Error fetching assignable leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
