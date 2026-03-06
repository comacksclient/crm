import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient, Role } from '@prisma/client';

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

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
        }

        const { userId, role, team_id } = await req.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
        }

        // Validate role exists
        if (!Object.values(Role).includes(role as Role)) {
            return NextResponse.json({ error: 'Invalid Role' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: role as Role,
                team_id: team_id === 'none' ? null : team_id // Allow unassigning
            }
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (e: any) {
        console.error("Error updating user:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
