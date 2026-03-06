import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string }
        });

        if (!dbUser) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
        }

        const invite = await prisma.teamInvite.findUnique({
            where: { id: token },
            include: { team: true }
        });

        if (!invite) {
            return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
        }

        if (new Date() > invite.expiresAt) {
            // Cleanup expired
            await prisma.teamInvite.delete({ where: { id: token } });
            return NextResponse.json({ error: 'This invite link has expired.' }, { status: 400 });
        }

        // Securely update the user: hard-lock them to the team and force the SDR role.
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                team_id: invite.team_id,
                // Do not downgrade Admins or existing Managers who click a link out of curiosity,
                // but if they are newly onboarded or unassigned SDRs, ensure they stay SDR.
                role: (dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER') ? dbUser.role : 'SDR'
            }
        });

        // Optionally delete the invite token if it's single-use, but usually company links are multi-use.
        // We will keep it as multi-use until it expires so the manager can paste it in a WhatsApp group. 

        return NextResponse.json({ success: true, teamName: invite.team.name });
    } catch (e: any) {
        console.error("Error accepting team invite:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
