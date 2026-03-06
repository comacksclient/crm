import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all meetings and include the related Lead data (clinic name, phone)
        const meetings = await prisma.meeting.findMany({
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
        });

        // Map the result to a flatter structure for the frontend if needed
        const mappedMeetings = meetings.map((m: any) => {
            // "ClinicName - Phone" logic from the payload
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
