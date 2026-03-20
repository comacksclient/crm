import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { role: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'HR')) {
            return NextResponse.json({ error: 'HR or Admin privileges required.' }, { status: 403 });
        }

        const candidates = await prisma.candidate.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ candidates });
    } catch (e: any) {
        console.error("Error fetching candidates:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { role: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'HR')) {
            return NextResponse.json({ error: 'HR or Admin privileges required.' }, { status: 403 });
        }

        const payload = await req.json();
        const { name, phone_number, email, notes, scheduled_date, scheduled_time } = payload;

        if (!name || !phone_number) {
            return NextResponse.json({ error: 'Name and Phone Number are required.' }, { status: 400 });
        }

        const candidate = await prisma.candidate.create({
            data: {
                name,
                phone_number,
                email,
                notes,
                scheduled_date,
                scheduled_time,
                status: 'Applied'
            }
        });

        return NextResponse.json({ candidate, message: 'Candidate added successfully' });
    } catch (e: any) {
        console.error("Error creating candidate:", e);
        if (e.code === 'P2002') {
            return NextResponse.json({ error: 'A candidate with this phone number already exists.' }, { status: 400 });
        }
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
