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

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins Only' }, { status: 403 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
        }

        // Check if team exists
        const existingTeam = await prisma.team.findUnique({
            where: { name: name.trim() }
        });

        if (existingTeam) {
            return NextResponse.json({ error: 'A team with this name already exists' }, { status: 400 });
        }

        const newTeam = await prisma.team.create({
            data: { name: name.trim() }
        });

        return NextResponse.json({ success: true, team: newTeam });
    } catch (e: any) {
        console.error("Error creating team:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
