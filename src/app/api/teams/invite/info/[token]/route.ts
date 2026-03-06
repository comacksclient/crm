import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

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
            return NextResponse.json({ error: 'This invite link has expired.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            teamName: invite.team.name
        });
    } catch (e: any) {
        console.error("Error fetching invite details:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
