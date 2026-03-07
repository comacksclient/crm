import prisma from '@/lib/prisma';
import { updateLeadRow, appendToMeetings, deleteLeadRow, mapPrismaToLead } from './googleSheets';
import { calculatePriorityScore, runActionEngine } from './actionEngine';
import { CallLogPayload, Lead } from './types';



export async function logCallOutcome(payload: CallLogPayload, userEmail: string) {
    const dbLead = await prisma.lead.findUnique({
        where: { id: payload.lead_id }
    });

    if (!dbLead) throw new Error('Lead not found in Database');

    const targetLead = mapPrismaToLead(dbLead);

    // Apply logic
    const updatedLead = runActionEngine(targetLead, payload);
    updatedLead.priority_score = calculatePriorityScore(updatedLead);

    // If the rules engine marks the lead as Disqualified, purge it from the DB
    if (updatedLead.lead_status === 'Disqualified') {
        await deleteLeadRow(targetLead._rowIndex as string);
    } else {
        // Update Database Lead
        await updateLeadRow(targetLead._rowIndex as string, updatedLead);
    }

    // If meeting booked, append to meetings sheet
    if (updatedLead.lead_status === 'Meeting Booked') {
        await appendToMeetings(updatedLead, userEmail);
    }
}
