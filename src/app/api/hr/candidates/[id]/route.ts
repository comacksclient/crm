import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const payload = await req.json();

        const updatedCandidate = await prisma.candidate.update({
            where: { id },
            data: payload
        });

        return NextResponse.json({ candidate: updatedCandidate, message: 'Candidate updated successfully' });
    } catch (e: any) {
        console.error("Error updating candidate:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;

        await prisma.candidate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Candidate removed successfully' });
    } catch (e: any) {
        console.error("Error deleting candidate:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
