import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { updateLeadRow, mapPrismaToLead } from '@/lib/googleSheets';
import { calculatePriorityScore } from '@/lib/actionEngine';
import { addDays, format } from 'date-fns';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true }
        });

        // The user explicitly stated "I will personally handle the WhatsApp follow-ups, not the SDR".
        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'WhatsApp broadcast desk is restricted to Organization Management.' }, { status: 403 });
        }

        const body = await req.json();
        const { leadId } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
        }

        const dbLead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!dbLead) throw new Error('Lead not found in Database');

        // Automate Workflow changes
        const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

        const tempLead = mapPrismaToLead(dbLead);
        tempLead.whatsapp_status = 'Sent';
        tempLead.next_action_type = 'Call follow up 1';
        tempLead.next_action_date = tomorrowDate;

        // Recalculate priority routing because the Date changed
        tempLead.priority_score = calculatePriorityScore(tempLead);

        // Update DB with workflow automation
        const result = await prisma.lead.update({
            where: { id: leadId },
            data: {
                whatsapp_status: 'Sent',
                whatsapp_details_sent: true,
                touch_count: { increment: 1 }, // Manager's action counts as a touch
                next_action_type: 'Call follow up 1',
                next_action_date: tomorrowDate,
                priority_score: tempLead.priority_score,
                overdue: tempLead.overdue
            }
        });

        // Attempt Google Sheet update (fail silently to not block API if Sheets API limit reached)
        try {
            await updateLeadRow(tempLead._rowIndex as string, tempLead);
        } catch (ignored) { }

        return NextResponse.json({
            success: true,
            message: 'WhatsApp dispatched. Lead safely routed to SDR for Tomorrow follow-up.'
        });

    } catch (e: any) {
        console.error("Error executing whatsapp send block:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
