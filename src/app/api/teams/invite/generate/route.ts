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
            return NextResponse.json({ error: 'Forbidden: Only Administrators can generate team invites.' }, { status: 403 });
        }

        const { teamId } = await req.json();

        if (!teamId) {
            return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
        }

        // Generate an invite valid for 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await prisma.teamInvite.create({
            data: {
                team_id: teamId,
                createdBy: dbUser.id,
                expiresAt: expiresAt
            }
        });

        return NextResponse.json({ success: true, inviteId: invite.id });
    } catch (e: any) {
        console.error("Error generating team invite:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
