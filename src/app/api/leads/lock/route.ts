import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { leadId, action } = body; // 'lock' or 'unlock'

        if (!leadId || !action) {
            return NextResponse.json({ error: 'Missing leadId or action' }, { status: 400 });
        }

        const userEmail = session.user.email;

        if (action === 'lock') {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);


            const leads = await prisma.lead.updateMany({
                where: {
                    id: leadId,
                    OR: [
                        { locked_by: null },
                        { locked_by: userEmail },
                        { locked_at: { lt: fiveMinutesAgo } }
                    ]
                },
                data: {
                    locked_by: userEmail,
                    locked_at: new Date()
                }
            });

            if (leads.count === 0) {
                return NextResponse.json({ error: 'Lead is currently in-call with another SDR.' }, { status: 409 });
            }

            return NextResponse.json({ success: true, message: 'Lead locked successfully.' });
        } else if (action === 'unlock') {
            const dbUser = await prisma.user.findUnique({
                where: { email: userEmail },
                select: { role: true }
            });

            const isManagerOrAdmin = dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'MANAGER');

            const whereClause: any = { id: leadId };
            if (!isManagerOrAdmin) {
                whereClause.locked_by = userEmail;
            }

            const leads = await prisma.lead.updateMany({
                where: whereClause,
                data: {
                    locked_by: null,
                    locked_at: null
                }
            });

            if (leads.count === 0) {
                return NextResponse.json({ error: 'Failed to release lock.' }, { status: 400 });
            }

            return NextResponse.json({ success: true, message: 'Lead released successfully.' });
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    } catch (e: any) {
        console.error("Error locking lead:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
