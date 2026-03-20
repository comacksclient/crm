import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden: Admins and Managers only.' }, { status: 403 });
        }

        // Scoping: Managers see their team only, Admins see everything
        const leadScope: any = {};
        const meetingScope: any = {};
        if (dbUser.role === 'MANAGER' && dbUser.team_id) {
            leadScope.team_id = dbUser.team_id;
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd'); // Synchronized with actionEngine
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // === 1. Lead Status Counts ===
        const [totalLeads, activeLeads, bookedLeads, disqualifiedLeads] = await Promise.all([
            prisma.lead.count({ where: leadScope }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Active' } }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Meeting Booked' } }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Disqualified' } }),
        ]);

        // === 2. Calls Today (leads whose last_call_date is today) ===
        const callsToday = await prisma.lead.count({
            where: { ...leadScope, last_call_date: todayStr }
        });

        // === 3. Meeting Stats ===
        const [meetingsToday, totalMeetings, noShowCount, scheduledCount] = await Promise.all([
            prisma.meeting.count({ where: { ...meetingScope, createdAt: { gte: todayStart } } }),
            prisma.meeting.count({ where: meetingScope }),
            prisma.meeting.count({ where: { ...meetingScope, meeting_status: 'No Show' } }),
            prisma.meeting.count({ where: { ...meetingScope, meeting_status: 'Scheduled' } }),
        ]);

        // === 4. SDR Leaderboard ===
        // Get all SDRs in scope
        const sdrWhere: any = { role: 'SDR' };
        if (dbUser.team_id) {
            sdrWhere.team_id = dbUser.team_id;
        }
        const sdrs = await prisma.user.findMany({
            where: sdrWhere,
            select: { id: true, name: true, email: true }
        });

        // For each SDR: count assigned leads, calls today, meetings booked
        const sdrLeaderboard = [];
        for (const sdr of sdrs) {
            // We do these sequentially to avoid exhausting the DB connection pool (Aiven limits)
            const assignedLeads = await prisma.lead.count({ where: { sdr_id: sdr.id, lead_status: 'Active' } });
            const callsTodaySdr = await prisma.lead.count({ where: { sdr_id: sdr.id, last_call_date: todayStr } });
            const meetingsBooked = await prisma.meeting.count({ where: { booked_by: sdr.email } });

            sdrLeaderboard.push({
                id: sdr.id,
                name: sdr.name || sdr.email.split('@')[0],
                email: sdr.email,
                assignedLeads,
                callsToday: callsTodaySdr,
                meetingsBooked,
                conversionRate: assignedLeads > 0 ? ((meetingsBooked / (assignedLeads + meetingsBooked)) * 100).toFixed(1) : '0.0'
            });
        }

        // Sort leaderboard by meetings booked DESC
        sdrLeaderboard.sort((a, b) => b.meetingsBooked - a.meetingsBooked);

        // === 5. Recent Meetings (last 8) ===
        const recentMeetings = await prisma.meeting.findMany({
            where: meetingScope,
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                id: true,
                clinic_name: true,
                phone_number: true,
                meeting_date: true,
                meeting_time: true,
                meeting_status: true,
                booked_by: true,
                createdAt: true
            }
        });

        // === 6. Overdue Leads Count ===
        const overdueLeads = await prisma.lead.count({
            where: { ...leadScope, lead_status: 'Active', overdue: true }
        });

        return NextResponse.json({
            totalLeads,
            activeLeads,
            bookedLeads,
            disqualifiedLeads,
            overdueLeads,
            callsToday,
            meetingsToday,
            totalMeetings,
            noShowCount,
            scheduledCount,
            sdrLeaderboard,
            recentMeetings,
            generatedAt: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('Error fetching overview data:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
