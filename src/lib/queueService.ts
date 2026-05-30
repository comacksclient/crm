import prisma from '@/lib/prisma';
import { updateLeadRow, appendToMeetings, mapPrismaToLead } from './leadService';
import { calculatePriorityScore, runActionEngine } from './actionEngine';
import { CallLogPayload, Lead } from './types';

export async function logCallOutcome(payload: CallLogPayload, userEmail: string) {
    const dbLead = await prisma.lead.findUnique({
        where: { id: payload.lead_id }
    });

    if (!dbLead) throw new Error('Lead not found in Database');

    // Fetch user ID for logging call history
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true }
    });

    if (!user) throw new Error('User not found in Database');

    const targetLead = mapPrismaToLead(dbLead);

    // Apply rules engine logic
    const updatedLead = runActionEngine(targetLead, payload);
    updatedLead.priority_score = calculatePriorityScore(updatedLead);

    // 1. Record historical interaction log
    await prisma.callLog.create({
        data: {
            lead_id: payload.lead_id,
            sdr_id: user.id,
            outcome: payload.outcome,
            doctor_type: payload.doctorType || null,
            interest_level: payload.interestLevel || null,
            notes: payload.notes
        }
    });

    // 2. Perform soft status update instead of hard-deleting records
    if (updatedLead.lead_status === 'Disqualified' || updatedLead.lead_status === 'Inactive') {
        await prisma.lead.update({
            where: { id: targetLead._rowIndex as string },
            data: {
                lead_status: updatedLead.lead_status,
                call_outcome: updatedLead.call_outcome,
                doctor_type: updatedLead.doctor_type,
                interest_level: updatedLead.interest_level,
                call_notes: updatedLead.call_notes,
                touch_count: updatedLead.touch_count,
                last_call_date: updatedLead.last_call_date
            }
        });
    } else {
        // Update Active Lead details
        await updateLeadRow(targetLead._rowIndex as string, updatedLead);
    }

    // 3. If meeting is booked, append to meetings record
    if (updatedLead.lead_status === 'Meeting Booked') {
        await appendToMeetings(updatedLead, userEmail);
    }
}
