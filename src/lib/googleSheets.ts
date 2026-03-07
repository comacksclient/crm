import { PrismaClient, Lead as PrismaLead, Meeting as PrismaMeeting } from '@prisma/client';
import { Lead } from './types';
import prisma from '@/lib/prisma';

// Map Prisma DB Model to Frontend Lead Interface
export const mapPrismaToLead = (dbLead: any): Lead => ({
    _rowIndex: dbLead.id, // Using DB UUID instead of spreadsheet row index
    lead_identity: dbLead.lead_identity,
    assignment_info: dbLead.assignment_info,

    // Explicit Identity Flags
    clinic_name: dbLead.clinic_name,
    phone_number: dbLead.phone_number,
    city: dbLead.city,

    // Hierarchy Data
    assigned_to: dbLead.assigned_to,
    assigned_date: dbLead.assigned_date,

    call_outcome: dbLead.call_outcome as any,
    doctor_type: dbLead.doctor_type as any,
    interest_level: dbLead.interest_level,
    call_notes: dbLead.call_notes || '',
    next_action_type: dbLead.next_action_type as any,
    whatsapp_details_sent: dbLead.whatsapp_details_sent,
    next_action_date: dbLead.next_action_date || '',
    last_call_date: dbLead.last_call_date || '',
    touch_count: dbLead.touch_count,
    overdue: dbLead.overdue,
    meeting_status: dbLead.meeting_status,
    meeting_date: dbLead.meeting_date || '',
    meeting_time: dbLead.meeting_time || '',
    lead_status: dbLead.lead_status as any,
    priority_score: dbLead.priority_score,
    locked_by: null,
    locked_at: null,
});

// getCallQueue removed: Legacy Google Sheets function phased out for direct scalable Prisma calls.
// In the new system, rowIndex is actually the UUID string of the lead
export async function updateLeadRow(rowIndex: string, lead: Lead) {
    try {
        await prisma.lead.update({
            where: { id: rowIndex },
            data: {
                call_outcome: lead.call_outcome,
                doctor_type: lead.doctor_type,
                interest_level: lead.interest_level,
                call_notes: lead.call_notes,
                next_action_type: lead.next_action_type,
                whatsapp_details_sent: lead.whatsapp_details_sent,
                next_action_date: lead.next_action_date,
                last_call_date: lead.last_call_date,
                touch_count: lead.touch_count,
                lead_status: lead.lead_status,
                priority_score: lead.priority_score,
                overdue: lead.overdue || false,
                meeting_status: lead.meeting_status || false,
                meeting_date: lead.meeting_date || null,
                meeting_time: lead.meeting_time || null
            }
        });
    } catch (e) {
        console.error("Failed to update Lead in Postgres:", e);
    }
}

// Hard Delete Lead from DB
export async function deleteLeadRow(rowIndex: string) {
    try {
        await prisma.lead.delete({
            where: { id: rowIndex }
        });
    } catch (e) {
        console.error("Failed to delete Lead from Postgres:", e);
    }
}

export async function appendToMeetings(lead: Lead, bookedBy: string) {
    try {
        await prisma.meeting.create({
            data: {
                lead_id: lead._rowIndex as string,

                // Lead Identity Snapshots
                clinic_name: lead.clinic_name || lead.lead_identity.split(' - ')[0] || null,
                phone_number: lead.phone_number || null,

                meeting_date: lead.meeting_date || '',
                meeting_time: lead.meeting_time || '',
                meeting_status: 'Scheduled', // Specific lifecycle tracker
                booked_by: bookedBy
            }
        });

        // Ensure the Lead status is also upgraded
        await prisma.lead.update({
            where: { id: lead._rowIndex as string },
            data: { lead_status: 'Meeting Booked' }
        })
    } catch (e) {
        console.error("Failed to append meeting to Postgres:", e);
    }
}

export interface MeetingRow {
    lead_identity: string;
    meeting_date: string;
    meeting_time: string;
    meeting_status: string;
    booked_by: string;
}

export async function getMeetings(): Promise<MeetingRow[]> {
    try {
        const meetings = await prisma.meeting.findMany({
            include: { lead: true },
            orderBy: { meeting_date: 'asc' }
        });

        return meetings.map(m => ({
            lead_identity: m.lead.lead_identity,
            meeting_date: m.meeting_date,
            meeting_time: m.meeting_time,
            meeting_status: m.meeting_status,
            booked_by: m.booked_by,
        }));
    } catch (e) {
        console.error("Error fetching Postgres meetings:", e);
        return [];
    }
}
