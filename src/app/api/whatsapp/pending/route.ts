import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
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

        // Fetch leads requiring WhatsApp actions
        const dbLeads = await prisma.lead.findMany({
            where: {
                next_action_type: 'WhatsApp Follow Up',
                whatsapp_status: 'Pending',
                lead_status: 'Active'
            },
            orderBy: { updatedAt: 'desc' },
            take: 300
        });

        // Resolve SDR names safely without relying on absent Prisma foreign-key constraints
        const sdrIds = [...new Set(dbLeads.map(l => l.sdr_id).filter(Boolean))] as string[];
        const sdrs = await prisma.user.findMany({
            where: { id: { in: sdrIds } },
            select: { id: true, name: true, email: true }
        });

        const sdrMap = new Map();
        sdrs.forEach(sdr => sdrMap.set(sdr.id, sdr));

        // The UI requires explicit mapping down to a clean array
        const mappedLeads = dbLeads.map(lead => {
            const sdrInfo = lead.sdr_id ? sdrMap.get(lead.sdr_id) : null;
            return {
                id: lead.id,
                name: lead.clinic_name || lead.lead_identity.split(' - ')[0] || lead.lead_identity,
                phone_number: lead.phone_number || lead.lead_identity.split(' - ')[1] || 'Unknown',
                city: lead.city || lead.assignment_info?.split(' - ')[0] || '-',
                sdrName: sdrInfo?.name || sdrInfo?.email || 'System',
                interest_level: lead.interest_level || 3,
                call_notes: lead.call_notes || '',
                next_action_date: lead.next_action_date,
                whatsapp_status: lead.whatsapp_status
            };
        });

        return NextResponse.json({ leads: mappedLeads });
    } catch (e: any) {
        console.error("Error fetching pending whatsapp leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
