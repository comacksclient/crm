import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { perSdrCount } = await req.json();

        if (!perSdrCount || perSdrCount <= 0) {
            return NextResponse.json({ error: 'Invalid count per SDR' }, { status: 400 });
        }

        // 1. Identify the Manager and their Team
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Manager privileges required' }, { status: 403 });
        }

        if (!dbUser.team_id) {
            return NextResponse.json({ error: 'You are not assigned to a team' }, { status: 400 });
        }

        // 2. Fetch all active SDRs in this team
        const teamSdrs = await prisma.user.findMany({
            where: {
                team_id: dbUser.team_id,
                role: 'SDR'
            },
            select: { id: true }
        });

        if (teamSdrs.length === 0) {
            return NextResponse.json({ error: 'No SDRs found in your team to distribute leads to' }, { status: 400 });
        }

        const totalNeeded = teamSdrs.length * perSdrCount;

        // 3. Fetch unassigned leads for this team, ordered by priority
        const availableLeads = await prisma.lead.findMany({
            where: {
                team_id: dbUser.team_id,
                sdr_id: null,
                lead_status: 'Active'
            },
            orderBy: {
                priority_score: 'desc'
            },
            take: totalNeeded,
            select: { id: true }
        });

        if (availableLeads.length === 0) {
            return NextResponse.json({ error: 'No unassigned leads available for distribution' }, { status: 400 });
        }

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
                            manager_id: dbUser.id
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
