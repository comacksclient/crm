import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';



export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Technically we should check if session.user.role === 'ADMIN', 
        // but since we haven't built the session role injection fully, we allow it for now
        // or we fetch the user from DB to verify admin status.
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string }
        });

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                team_id: true,
                team: { select: { name: true } },
                createdAt: true,
            }
        });

        return NextResponse.json({ users });
    } catch (e: any) {
        console.error("Error fetching users list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
