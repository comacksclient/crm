import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Managers or Admins only.' }, { status: 403 });
        }

        const { leadIds } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'Missing or invalid payload data: leadIds array required.' }, { status: 400 });
        }

        // Production-Grade Security: Verify Team Boundaries for Managers
        if (dbUser.role === 'MANAGER') {
            if (!dbUser.team_id) {
                return NextResponse.json({ error: 'Managers must be assigned to a Team to purge leads.' }, { status: 403 });
            }

            const validLeadsCount = await prisma.lead.count({
                where: {
                    id: { in: leadIds },
                    team_id: dbUser.team_id
                }
            });

            if (validLeadsCount !== leadIds.length) {
                return NextResponse.json({ error: 'Security Violation: Cannot purge leads outside your Team block.' }, { status: 403 });
            }
        }

        // Execute the hard delete
        const deleteResult = await prisma.lead.deleteMany({
            where: {
                id: { in: leadIds }
            }
        });

        return NextResponse.json({
            success: true,
            count: deleteResult.count,
            message: `Successfully purged ${deleteResult.count} leads from the system.`
        });

    } catch (e: any) {
        console.error("Error bulk deleting leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
