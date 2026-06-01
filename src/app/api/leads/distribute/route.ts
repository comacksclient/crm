import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';



export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { perSdrCount, teamId } = await req.json();

        if (!perSdrCount || perSdrCount <= 0) {
            return NextResponse.json({ error: 'Invalid count per SDR' }, { status: 400 });
        }

        // 1. Identify the Manager and their Team
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, team_id: true, name: true, email: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Manager or Admin privileges required' }, { status: 403 });
        }

        const targetTeamId = dbUser.role === 'ADMIN' && teamId ? teamId : dbUser.team_id;

        if (!targetTeamId) {
            return NextResponse.json({ error: 'You need to specify a Target Team or be assigned to one.' }, { status: 400 });
        }

        // 2. Fetch all active SDRs in this team
        const teamSdrs = await prisma.user.findMany({
            where: {
                team_id: targetTeamId,
                role: 'SDR'
            },
            select: { id: true, name: true, email: true }
        });

        if (teamSdrs.length === 0) {
            return NextResponse.json({ error: 'No SDRs found in this team to distribute leads to' }, { status: 400 });
        }

        const totalNeeded = teamSdrs.length * perSdrCount;

        // 3. Fetch unassigned leads for this team, ordered by priority
        // Admins pull from target team's unassigned leads OR the global pool.
        // Managers pull from target team's unassigned leads.
        const sourceConditions = dbUser.role === 'ADMIN'
            ? [
                { team_id: targetTeamId, sdr_id: null, lead_status: 'Active' },
                { team_id: null, sdr_id: null, lead_status: 'Active' }
              ]
            : [
                { team_id: targetTeamId, sdr_id: null, lead_status: 'Active' }
              ];

        const availableLeads = await prisma.lead.findMany({
            where: {
                OR: sourceConditions
            },
            orderBy: [
                { team_id: 'desc' }, // Target team leads first, then null/global leads
                { priority_score: 'desc' }
            ],
            take: totalNeeded,
            select: { id: true }
        });

        if (availableLeads.length === 0) {
            return NextResponse.json({ error: 'No unassigned leads available for distribution' }, { status: 400 });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // 4. Perform the distribution in a transaction
        let assignedCount = 0;
        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < teamSdrs.length; i++) {
                const sdr = teamSdrs[i];
                const sdrLeads = availableLeads.slice(i * perSdrCount, (i + 1) * perSdrCount);

                if (sdrLeads.length > 0) {
                    await tx.lead.updateMany({
                        where: {
                            id: { in: sdrLeads.map(l => l.id) }
                        },
                        data: {
                            sdr_id: sdr.id,
                            team_id: targetTeamId,
                            manager_id: dbUser.id,
                            assigned_to: sdr.name || sdr.email,
                            assigned_date: new Date().toISOString(),
                            next_action_date: todayStr // Set to today's active queue
                        }
                    });
                    assignedCount += sdrLeads.length;
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully distributed ${assignedCount} leads across ${teamSdrs.length} SDRs (${perSdrCount} each).`,
            count: assignedCount
        });

    } catch (e: any) {
        console.error("Distribution Error:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
