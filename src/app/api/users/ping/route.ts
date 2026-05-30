import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST() {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const email = session.user.email;

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, lastActiveAt: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!user.lastActiveAt || user.lastActiveAt < fiveMinutesAgo) {
            await prisma.user.update({
                where: { email },
                data: { lastActiveAt: now }
            });
            return NextResponse.json({ success: true, message: 'Heartbeat registered in database.' });
        }

        return NextResponse.json({ success: true, message: 'Heartbeat registered in memory.' });
    } catch (e: any) {
        console.error("Error in user ping API:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
