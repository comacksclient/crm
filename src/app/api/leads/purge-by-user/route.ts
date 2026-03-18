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
            where: { email: session.user.email as string }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Managers or Admins only.' }, { status: 403 });
        }

        const { targetUserId } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID is required.' }, { status: 400 });
        }

        // Managers can only purge leads from their own team
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { team_id: true, name: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
        }

        if (dbUser.role === 'MANAGER' && targetUser.team_id !== dbUser.team_id) {
            return NextResponse.json({ error: 'Security Violation: Cannot purge leads outside your Team.' }, { status: 403 });
        }

        // Perform the purge
        const deleteResult = await prisma.lead.deleteMany({
            where: {
                OR: [
                    { sdr_id: targetUserId },
                    { manager_id: targetUserId }
                ]
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully purged ${deleteResult.count} leads assigned to ${targetUser.name || 'this user'}.`,
            count: deleteResult.count
        });

    } catch (e: any) {
        console.error("Error purging user leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
