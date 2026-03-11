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
            select: { id: true, team_id: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
        }

        if (!dbUser.team_id) {
            return NextResponse.json({ error: 'You are not currently assigned to a team.' }, { status: 400 });
        }


        await prisma.lead.updateMany({
            where: {
                sdr_id: dbUser.id
            },
            data: {
                sdr_id: null,
                manager_id: null,
                assigned_to: null,
                assigned_date: null
            }
        });


        await prisma.user.update({
            where: { id: dbUser.id },
            data: { team_id: null }
        });

        return NextResponse.json({ success: true, message: 'Successfully left the team.' });
    } catch (e: any) {
        console.error("Error leaving team:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
