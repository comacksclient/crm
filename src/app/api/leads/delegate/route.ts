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
            where: { email: session.user.email as string }
        });

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only.' }, { status: 403 });
        }

        const { leadIds, teamId, managerId, sdrId } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !teamId) {
            return NextResponse.json({ error: 'Missing or invalid payload data: leadIds array and teamId required.' }, { status: 400 });
        }

        // Prepare assignment metadata if an SDR is explicitly selected
        let assignedTo = null;
        let assignedDate = null;

        if (sdrId) {
            const sdrUser = await prisma.user.findUnique({
                where: { id: sdrId },
                select: { name: true, email: true }
            });
            if (sdrUser) {
                assignedTo = sdrUser.name || sdrUser.email;
                assignedDate = new Date().toISOString();
            }
        }

        // Delegate these raw leads completely to the specified team
        const updateResult = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds }
            },
            data: {
                team_id: teamId,
                manager_id: managerId || null,
                sdr_id: sdrId || null,
                assigned_to: assignedTo,
                assigned_date: assignedDate
            }
        });

        return NextResponse.json({ success: true, count: updateResult.count });
    } catch (e: any) {
        console.error("Error delegating leads to team:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
