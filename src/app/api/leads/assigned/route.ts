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
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Manager or Admin privileges required.' }, { status: 403 });
        }

        // Determine which leads to fetch based on role
        let whereClause: any = { sdr_id: { not: null } };

        if (dbUser.role === 'MANAGER') {
            if (!dbUser.team_id) {
                return NextResponse.json({ leads: [] });
            }
            whereClause.team_id = dbUser.team_id;
        }

        // Fetch leads that are assigned to an SDR
        const leads = await prisma.lead.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            take: 300,
            include: {
                team: { select: { name: true } }
            }
        });

        // Get unique SDR IDs to fetch their names
        const sdrIds = [...new Set(leads.map(l => l.sdr_id).filter(Boolean))] as string[];

        const sdrs = await prisma.user.findMany({
            where: { id: { in: sdrIds } },
            select: { id: true, name: true, email: true }
        });

        const sdrMap = new Map();
        sdrs.forEach(sdr => {
            sdrMap.set(sdr.id, { name: sdr.name, email: sdr.email });
        });

        const mappedLeads = leads.map(lead => {
            const sdrInfo = lead.sdr_id ? sdrMap.get(lead.sdr_id) : null;
            return {
                id: lead.id,
                lead_identity: lead.lead_identity,
                clinic_name: lead.clinic_name,
                city: lead.city,
                teamName: lead.team?.name || 'Unassigned',
                sdrName: sdrInfo?.name || sdrInfo?.email || 'Unknown SDR',
                assigned_date: lead.assigned_date || lead.createdAt.toISOString(),
                assigned_by: lead.assigned_to || 'System',
                status: lead.lead_status,
                touches: lead.touch_count
            };
        });

        return NextResponse.json({ leads: mappedLeads });
    } catch (e: any) {
        console.error("Error fetching assigned leads:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
