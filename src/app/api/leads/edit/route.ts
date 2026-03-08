import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { updateLeadRow, mapPrismaToLead } from '@/lib/googleSheets';

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { role: true }
        });

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admins only can manually edit core lead data.' }, { status: 403 });
        }

        const body = await req.json();
        const { leadId, clinic_name, city, phone_number, lead_identity } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
        }

        const dbLead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!dbLead) {
            return NextResponse.json({ error: 'Lead not found in Database' }, { status: 404 });
        }

        // Apply direct field updates
        const updatedResult = await prisma.lead.update({
            where: { id: leadId },
            data: {
                clinic_name: clinic_name ?? dbLead.clinic_name,
                city: city ?? dbLead.city,
                phone_number: phone_number ?? dbLead.phone_number,
                lead_identity: lead_identity ?? dbLead.lead_identity
            }
        });

        // Sync with Google Sheets logic if necessary
        try {
            const mapped = mapPrismaToLead(updatedResult);
            await updateLeadRow(leadId, mapped);
        } catch (ignored) { }

        return NextResponse.json({
            success: true,
            message: 'Lead record corrected successfully.',
            lead: updatedResult
        });

    } catch (e: any) {
        console.error("Error editing lead:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
