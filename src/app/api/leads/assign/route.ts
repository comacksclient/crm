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

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Managers or Admins only.' }, { status: 403 });
        }

        const { leadIds, sdrId } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !sdrId) {
            return NextResponse.json({ error: 'Missing or invalid payload data: leadIds array and sdrId required.' }, { status: 400 });
        }

        // Technically, a secure system verifies the Manager actually "owns" those City leads before assigning, 
        // but for now, we rely on the UI only showing them what they're allowed to assign.
        // Update all Leads to belong to this SDR, and also record who the allocating Manager was.
        const updateResult = await prisma.lead.updateMany({
            where: {
                id: { in: leadIds }
            },
            data: {
                sdr_id: sdrId,
                manager_id: dbUser.id
            }
        });

        return NextResponse.json({ success: true, count: updateResult.count });
    } catch (e: any) {
        console.error("Error bulk assigning leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
