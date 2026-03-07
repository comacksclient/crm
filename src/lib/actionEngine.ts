import { Lead, CallLogPayload } from './types';
import { addDays, format, differenceInDays } from 'date-fns';

export function runActionEngine(lead: Lead, payload: CallLogPayload): Lead {
    const updatedLead: Lead = { ...lead };
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const outcome = payload.outcome;
    const interest = payload.interestLevel;

    // Initialize if undefined
    if (updatedLead.touch_count === undefined || isNaN(updatedLead.touch_count)) {
        updatedLead.touch_count = 0;
    }

    // Set the basic fields from payload
    updatedLead.call_outcome = outcome;
    updatedLead.doctor_type = payload.doctorType || null;
    updatedLead.interest_level = interest || null;
    updatedLead.call_notes = payload.notes || '';
    updatedLead.last_call_date = todayDate;

    // Preliminary Disqualification check
    if (outcome === 'Invalid' || interest === 1 || interest === 2) {
        updatedLead.lead_status = 'Disqualified';
        // Note: Check Touch count later, it still applies!
    }

    // Outcome-Based Automation
    if (outcome === 'Not Picked') {
        updatedLead.next_action_type = 'Reattempt';
        updatedLead.next_action_date = tomorrowDate;
        updatedLead.touch_count += 1;
        if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';
    }
    else if (outcome === 'Assistant picked' || outcome === 'Call back requested') {
        updatedLead.next_action_type = 'Call follow up';
        updatedLead.next_action_date = payload.providedNextActionDate || tomorrowDate;
        updatedLead.touch_count += 1;

        // Reset call qualification fields to default
        updatedLead.doctor_type = null;
        updatedLead.interest_level = null;
        if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';
    }
    else if (outcome === 'Doctor Connected') {
        if (interest === 3 || interest === 4) {
            updatedLead.next_action_date = todayDate;
            if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';

            if (interest === 4) {
                updatedLead.next_action_type = 'Call follow up';
                // Prompt: "If (interest level==4) call follow up ... If (whatsapp_sent == true ) touch++"
                if (payload.whatsappDetailsSent) {
                    updatedLead.touch_count += 1;
                }
            } else if (interest === 3) {
                updatedLead.next_action_type = 'Whatsapp details';
                if (payload.whatsappDetailsSent) {
                    updatedLead.touch_count += 1;
                }
            }
        }
        else if (interest === 5) {
            if (payload.meetingDate && payload.meetingTime) {
                updatedLead.meeting_status = 'confirmed';
                updatedLead.meeting_date = payload.meetingDate;
                updatedLead.meeting_time = payload.meetingTime;
                updatedLead.lead_status = 'Meeting Booked';
            }
        }
    }

    // Post-Execution touch count evaluation for Disqualification
    if (updatedLead.touch_count >= 5) {
        updatedLead.lead_status = 'Disqualified';
    }

    return updatedLead;
}

export function calculatePriorityScore(lead: Lead): number {
    if (!lead.next_action_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize time

    const actionDateStr = lead.next_action_date;
    // Fallback parsing
    const actionDate = new Date(actionDateStr);

    // Calculate difference in days
    const daysUntilAction = differenceInDays(actionDate, today);

    // overdue flag
    const overdueFlag = daysUntilAction < 0 ? 1 : 0;
    const interestLevel = lead.interest_level || 0; // if null, 0

    // priority_score = (Overdue_Flag * 100) + (Interest_Level * 10)
    let priorityScore = (overdueFlag * 100) + (interestLevel * 10);

    return priorityScore;
}
