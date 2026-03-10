import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        // Admins and Managers can update meeting statuses
        if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { meetingId, status, followUpDate, reminderNote } = body;

        if (!meetingId || !status) {
            return NextResponse.json({ error: 'Missing meetingId or status' }, { status: 400 });
        }

        // Validate status
        const validStatuses = ['Scheduled', 'Show Up', 'No Show', 'Rescheduled', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid meeting status' }, { status: 400 });
        }

        // 1. Update the Meeting
        const meeting = await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                meeting_status: status,
                meeting_notes: reminderNote || undefined
            }
        });

        // 2. If it's a negative/reschedule status, bounce it back to the SDR's queue
        if (status === 'No Show' || status === 'Rescheduled' || status === 'Cancelled') {
            const lead = await prisma.lead.findUnique({
                where: { id: meeting.lead_id }
            });

            if (lead) {
                // Construct a conspicuous reminder note
                const notePrefix = `\n--- [${new Date().toISOString().split('T')[0]}] Admin/Manager marked Meeting as ${status} ---\n`;
                const customNote = reminderNote ? `Reminder: ${reminderNote}\n` : '';
                const priorNotes = lead.call_notes ? `\n\nPrior Notes:\n${lead.call_notes}` : '';

                const combinedNotes = notePrefix + customNote + priorNotes;

                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        lead_status: 'Active',
                        meeting_status: false,
                        next_action_date: followUpDate || new Date().toISOString().split('T')[0],
                        next_action_type: 'Call follow up 1',
                        call_notes: combinedNotes,
                        touch_count: lead.touch_count + 1
                    }
                });
            }
        } else if (status === 'Show Up' || status === 'Completed') {
            // Ensure the lead is firmly marked as handled
            await prisma.lead.update({
                where: { id: meeting.lead_id },
                data: {
                    lead_status: 'Meeting Booked'
                }
            });
        }

        return NextResponse.json({ success: true, meeting });
    } catch (error) {
        console.error('Error updating meeting status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
