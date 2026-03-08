import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';



export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify Admin strictly for full DB export
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string }
        });

        if (!dbUser || dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only Administrators can export the Database.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const exportType = searchParams.get('type') || 'leads';

        // We need the names of the SDRs, but `sdr_id` is just a string in Lead.
        const allSdrs = await prisma.user.findMany({
            where: { role: { in: ['SDR', 'MANAGER'] } },
            select: { id: true, name: true, email: true }
        });

        const sdrMap = new Map(allSdrs.map(u => [u.id, u.name || u.email]));

        if (exportType === 'meetings') {
            const allMeetings = await prisma.meeting.findMany({
                include: {
                    lead: {
                        include: { team: { select: { name: true } } }
                    }
                },
                orderBy: { meeting_date: 'desc' }
            });

            const formattedMeetings = allMeetings.map(m => ({
                "Meeting Date": m.meeting_date,
                "Meeting Time": m.meeting_time,
                "Identity": m.lead?.lead_identity || 'Unknown',
                "Status": m.meeting_status,
                "Booked By": m.booked_by,
                "Team": m.lead?.team?.name || 'Unassigned',
                "No Show": m.no_show ? 'Yes' : 'No',
                "Notes": m.meeting_notes || 'N/A'
            }));

            return NextResponse.json({
                success: true,
                type: 'meetings',
                data: formattedMeetings,
                total: formattedMeetings.length
            });
        }

        // Leads Export (Master Database Dump)
        const allLeads = await prisma.lead.findMany({
            include: {
                team: { select: { name: true } }
            },
            orderBy: [
                { lead_status: 'asc' }, // Group by status
                { priority_score: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        const formattedLeads = allLeads.map(lead => ({
            "Identity": lead.lead_identity,
            "City": lead.assignment_info,
            "Status": lead.lead_status,
            "Touches": lead.touch_count,
            "Priority": lead.priority_score,
            "Outcome": lead.call_outcome || 'N/A',
            "Next Action": lead.next_action_type || 'N/A',
            "Action Date": lead.next_action_date || 'N/A',
            "Team": lead.team?.name || 'Unassigned',
            "Caller": lead.sdr_id ? (sdrMap.get(lead.sdr_id) || 'Unknown') : 'Unassigned'
        }));

        return NextResponse.json({
            success: true,
            type: 'leads',
            data: formattedLeads,
            total: formattedLeads.length
        });
    } catch (e: any) {
        console.error("Export Error:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
