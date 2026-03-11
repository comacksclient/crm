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
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Only Managers and Admins can remove team members.' }, { status: 403 });
        }

        const { targetUserId } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID is required.' }, { status: 400 });
        }


        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true, team_id: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
        }

        if (!targetUser.team_id) {
            return NextResponse.json({ error: 'Target user is already not in a team.' }, { status: 400 });
        }


        if (dbUser.role === 'MANAGER') {

            if (targetUser.team_id !== dbUser.team_id) {
                return NextResponse.json({ error: 'Forbidden: You can only remove members from your own team.' }, { status: 403 });
            }

            if (targetUser.role === 'ADMIN' || targetUser.role === 'MANAGER') {
                return NextResponse.json({ error: 'Forbidden: Managers can only remove SDRs.' }, { status: 403 });
            }
        }


        await prisma.lead.updateMany({
            where: {
                sdr_id: targetUser.id
            },
            data: {
                sdr_id: null,
                manager_id: null,
                assigned_to: null,
                assigned_date: null
            }
        });


        await prisma.user.update({
            where: { id: targetUser.id },
            data: { team_id: null }
        });

        return NextResponse.json({ success: true, message: 'User successfully removed from team.' });
    } catch (e: any) {
        console.error("Error removing team member:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
