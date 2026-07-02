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

        // Fetch target SDR info for record keeping
        const targetSdr = await prisma.user.findUnique({
            where: { id: sdrId },
            select: { name: true, email: true, team_id: true }
        });

        if (!targetSdr) {
            return NextResponse.json({ error: 'Target SDR not found.' }, { status: 404 });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // Update all Leads to belong to this SDR inside a transaction.
        // If they had a null next_action_date, schedule them for today. Otherwise, keep their future dates.
        const updateResult = await prisma.$transaction(async (tx) => {
            await tx.lead.updateMany({
                where: {
                    id: { in: leadIds },
                    next_action_date: null
                },
                data: {
                    sdr_id: sdrId,
                    team_id: targetSdr.team_id,
                    manager_id: dbUser.id,
                    assigned_to: targetSdr.name || targetSdr.email,
                    assigned_date: new Date().toISOString(),
                    next_action_date: todayStr
                }
            });

            return await tx.lead.updateMany({
                where: {
                    id: { in: leadIds },
                    next_action_date: { not: null }
                },
                data: {
                    sdr_id: sdrId,
                    team_id: targetSdr.team_id,
                    manager_id: dbUser.id,
                    assigned_to: targetSdr.name || targetSdr.email,
                    assigned_date: new Date().toISOString()
                }
            });
        });

        return NextResponse.json({ success: true, count: updateResult.count });
    } catch (e: any) {
        console.error("Error bulk assigning leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
