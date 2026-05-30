import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden: Management privileges required.' }, { status: 403 });
        }

        const sdrWhereClause: any = { role: 'SDR' };
        if (dbUser.role === 'MANAGER' && dbUser.team_id) {
            sdrWhereClause.team_id = dbUser.team_id;
        }

        const sdrs = await prisma.user.findMany({
            where: sdrWhereClause,
            select: {
                id: true,
                name: true,
                email: true,
                lastLoginAt: true,
                lastActiveAt: true,
                team: { select: { name: true } }
            }
        });

        const todayStart = startOfDay(new Date());
        const liveUsers = [];
        const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

        for (const sdr of sdrs) {
            const callsCount = await prisma.callLog.count({
                where: {
                    sdr_id: sdr.id,
                    createdAt: { gte: todayStart }
                }
            });

            const isLive = sdr.lastActiveAt ? new Date(sdr.lastActiveAt) > sixMinutesAgo : false;

            liveUsers.push({
                id: sdr.id,
                name: sdr.name || sdr.email.split('@')[0],
                email: sdr.email,
                teamName: sdr.team?.name || 'Unassigned',
                lastLoginAt: sdr.lastLoginAt,
                lastActiveAt: sdr.lastActiveAt,
                callsLoggedToday: callsCount,
                status: isLive ? 'LIVE' : 'OFFLINE'
            });
        }

        return NextResponse.json({ users: liveUsers });

    } catch (e: any) {
        console.error("Error in live status monitor api:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
