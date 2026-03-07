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

        const { leadIds, teamId } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !teamId) {
            return NextResponse.json({ error: 'Missing or invalid payload data: leadIds array and teamId required.' }, { status: 400 });
        }

        // Delegate these raw leads completely to the specified team
        const updateResult = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds }
            },
            data: {
                team_id: teamId,
                // Make sure they drop any legacy assignments if they were weirdly dirty
                sdr_id: null,
                manager_id: null
            }
        });

        return NextResponse.json({ success: true, count: updateResult.count });
    } catch (e: any) {
        console.error("Error delegating leads to team:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
