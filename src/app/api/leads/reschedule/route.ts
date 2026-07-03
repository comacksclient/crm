import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { updateLeadRow, mapPrismaToLead } from '@/lib/leadService';

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { leadId, next_action_date } = body;

        if (!leadId || !next_action_date) {
            return NextResponse.json({ error: 'Lead ID and new date required' }, { status: 400 });
        }

        const dbLead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!dbLead) {
            return NextResponse.json({ error: 'Lead not found in Database' }, { status: 404 });
        }

        // Apply date update and recalculate priority metrics
        const todayStr = new Date().toISOString().split('T')[0];
        const overdue = next_action_date < todayStr;
        const interestLevel = dbLead.interest_level || 0;
        const priorityScore = (overdue ? 100 : 0) + (interestLevel * 10);

        const updatedResult = await prisma.lead.update({
            where: { id: leadId },
            data: {
                next_action_date: next_action_date,
                overdue: overdue,
                priority_score: priorityScore
            }
        });

        // Sync with Google Sheets logic if necessary
        try {
            const mapped = mapPrismaToLead(updatedResult);
            await updateLeadRow(leadId, mapped);
        } catch (ignored) { }

        return NextResponse.json({
            success: true,
            message: 'Lead action date updated.',
            lead: updatedResult
        });

    } catch (e: any) {
        console.error("Error rescheduling lead:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
