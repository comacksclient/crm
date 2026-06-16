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
            select: { role: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'HR')) {
            return NextResponse.json({ error: 'HR or Admin privileges required.' }, { status: 403 });
        }

        const payload = await req.json();
        const { candidates } = payload;

        if (!candidates || !Array.isArray(candidates)) {
            return NextResponse.json({ error: 'Invalid payload: candidates array is required.' }, { status: 400 });
        }


        const validCandidates = [];
        for (const candidate of candidates) {
            const { name, phone_number, email, notes, scheduled_date, scheduled_time } = candidate;

            if (!name || !phone_number) {
                continue;
            }

            validCandidates.push({
                name: String(name).trim(),
                phone_number: String(phone_number).trim(),
                email: email ? String(email).trim() : null,
                notes: notes ? String(notes).trim() : null,
                scheduled_date: scheduled_date ? String(scheduled_date).trim() : null,
                scheduled_time: scheduled_time ? String(scheduled_time).trim() : null,
                status: 'Applied'
            });
        }

        if (validCandidates.length === 0) {
            return NextResponse.json({ error: 'No valid candidates found to import.' }, { status: 400 });
        }


        const result = await prisma.candidate.createMany({
            data: validCandidates,
            skipDuplicates: true
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `Successfully imported ${result.count} candidates.`
        });
    } catch (e: any) {
        console.error("Error in bulk candidate upload:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
