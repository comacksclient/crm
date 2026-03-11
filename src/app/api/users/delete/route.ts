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

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
        }

        const { targetUserId } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID is required.' }, { status: 400 });
        }

        if (targetUserId === dbUser.id) {
            return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
        }

        // Un-assign any leads connected to this user to prevent orphaned relational data bugs
        await prisma.lead.updateMany({
            where: {
                OR: [
                    { sdr_id: targetUserId },
                    { manager_id: targetUserId }
                ]
            },
            data: {
                sdr_id: null,
                manager_id: null,
                assigned_to: null,
                assigned_date: null
            }
        });

        // Permanently delete the user from the database
        await prisma.user.delete({
            where: { id: targetUserId }
        });

        return NextResponse.json({ success: true, message: 'User permanently purged from the system.' });
    } catch (e: any) {
        console.error("Error deleting user:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
