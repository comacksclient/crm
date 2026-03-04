import { getCallQueue, updateLeadRow, appendToMeetings } from './googleSheets';
import { calculatePriorityScore, runActionEngine } from './actionEngine';
import { CallLogPayload, Lead } from './types';

export async function getNextLead(userEmail: string): Promise<Lead | null> {
    const { leads } = await getCallQueue();
    const now = new Date();

    // Filter for active leads and manage staleness
    const activeLeads = leads.filter(lead => {
        if (lead.lead_status !== 'Active') return false;

        // Check lock expiration (10 minutes)
        if (lead.locked_at) {
            const lockTime = new Date(lead.locked_at).getTime();
            if (now.getTime() - lockTime > 10 * 60 * 1000) {
                // Expired lock, free it up for this pull
                return true;
            } else if (lead.locked_by !== userEmail) {
                // Locked by someone else and not expired
                return false;
            } else {
                // Locked by ME - I can pick it up again
                return true;
            }
        }
        return true;
    });

    if (activeLeads.length === 0) return null;

    // Sort by priority_score DESC, then by touch_count ASC (freshest leads)
    activeLeads.sort((a, b) => {
        const scoreA = calculatePriorityScore(a);
        const scoreB = calculatePriorityScore(b);
        if (scoreB !== scoreA) {
            return scoreB - scoreA; // Descending
        }
        return (a.touch_count || 0) - (b.touch_count || 0); // Ascending
    });

    const targetLead = activeLeads[0];

    // Lock it
    targetLead.locked_by = userEmail;
    targetLead.locked_at = now.toISOString();
    // @ts-expect-error - _rowIndex is added internally by getCallQueue
    await updateLeadRow(targetLead._rowIndex, targetLead);

    return targetLead;
}

export async function logCallOutcome(payload: CallLogPayload, userEmail: string) {
    const { leads } = await getCallQueue();
    const targetLead = leads.find(l => l.lead_identity === payload.lead_identity);

    if (!targetLead) throw new Error('Lead not found');
    if (targetLead.locked_by !== userEmail) throw new Error('Lead is not locked by you. Lock might have expired.');

    // Apply logic
    const updatedLead = runActionEngine(targetLead, payload);
    updatedLead.priority_score = calculatePriorityScore(updatedLead);

    // Unlock
    updatedLead.locked_by = null;
    updatedLead.locked_at = null;

    // Update sheet
    // @ts-expect-error - _rowIndex is added internally by getCallQueue
    await updateLeadRow(targetLead._rowIndex, updatedLead);

    // If meeting booked, append to meetings sheet
    if (updatedLead.lead_status === 'Meeting Booked') {
        await appendToMeetings(updatedLead, userEmail);
    }
}
