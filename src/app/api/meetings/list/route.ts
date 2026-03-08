import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';



export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { role: true, id: true, name: true, team_id: true }
        });

        if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Build Query based on role
        let queryArgs: any = {
            include: {
                lead: {
                    select: {
                        lead_identity: true,
                        assignment_info: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        };

        // Role-Based Security Hardening
        if (dbUser.role === 'SDR') {
            // SDRs strictly only see their OWN bookings
            queryArgs.where = { booked_by: session.user.email as string };
        } else if (dbUser.role === 'MANAGER') {
            // Managers only see bookings for leads assigned to their team
            if (!dbUser.team_id) {
                return NextResponse.json({ meetings: [] });
            }
            queryArgs.where = {
                lead: {
                    team_id: dbUser.team_id
                }
            };
        }
        // Admins see everything (no 'where' clause needed)

        const meetings = await prisma.meeting.findMany(queryArgs);

        // Fetch user names for "Booked By" column if Admin/Manager
        const userEmails = [...new Set(meetings.map(m => m.booked_by))];
        const users = await prisma.user.findMany({
            where: { email: { in: userEmails } },
            select: { email: true, name: true }
        });
        const userMap = new Map();
        users.forEach(u => userMap.set(u.email, u.name || u.email));

        // Map the result to a flatter structure for the frontend if needed
        const mappedMeetings = meetings.map((m: any) => {
            const identityParts = m.lead?.lead_identity?.split(' - ') || [];
            const clinicName = identityParts[0] || 'Unknown';
            const phoneNumber = identityParts[1] || 'Unknown';

            return {
                id: m.id,
                clinic_name: clinicName,
                phone_number: phoneNumber,
                city: m.lead?.assignment_info || 'Unknown',
                meeting_date: m.meeting_date,
                meeting_time: m.meeting_time,
                meeting_status: m.meeting_status,
                meeting_notes: m.meeting_notes,
                sdr_name: userMap.get(m.booked_by) || m.booked_by,
                no_show: m.no_show,
                created_at: m.createdAt
            };
        });

        return NextResponse.json({ meetings: mappedMeetings });
    } catch (e: any) {
        console.error("Error fetching meetings list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
