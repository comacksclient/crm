import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';



export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, name: true, email: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Managers or Admins only.' }, { status: 403 });
        }

        const { leadIds, sdrId } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !sdrId) {
            return NextResponse.json({ error: 'Missing or invalid payload data: leadIds array and sdrId required.' }, { status: 400 });
        }

        // Production-Grade Security: Verify Team Boundaries
        if (dbUser.role === 'MANAGER') {
            if (!dbUser.team_id) {
                return NextResponse.json({ error: 'Managers must be assigned to a Team to allocate leads.' }, { status: 403 });
            }

            // 1. Verify target SDR belongs to the same team
            const targetSdr = await prisma.user.findUnique({
                where: { id: sdrId },
                select: { team_id: true }
            });

            if (!targetSdr || targetSdr.team_id !== dbUser.team_id) {
                return NextResponse.json({ error: 'Security Violation: Cannot assign leads to an SDR outside your Team.' }, { status: 403 });
            }

            // 2. Verify all Leads belong to the same team
            const validLeadsCount = await prisma.lead.count({
                where: {
                    id: { in: leadIds },
                    team_id: dbUser.team_id
                }
            });

            if (validLeadsCount !== leadIds.length) {
                return NextResponse.json({ error: 'Security Violation: One or more leads do not belong to your Team block.' }, { status: 403 });
            }
        }

        // Update all Leads to belong to this SDR, and also record who the allocating Manager was.
        const updateResult = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds }
            },
            data: {
                sdr_id: sdrId,
                manager_id: dbUser.id,
                assigned_to: dbUser.name || dbUser.email,
                assigned_date: new Date().toISOString()
            }
        });

        return NextResponse.json({ success: true, count: updateResult.count });
    } catch (e: any) {
        console.error("Error bulk assigning leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
