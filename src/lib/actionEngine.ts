import { Lead, CallLogPayload } from './types';
import { addDays, format, differenceInDays } from 'date-fns';

export function runActionEngine(lead: Lead, payload: CallLogPayload): Lead {
    const updatedLead: Lead = { ...lead };
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const outcome = payload.outcome;
    const interest = payload.interestLevel;


    if (updatedLead.touch_count === undefined || isNaN(updatedLead.touch_count)) {
        updatedLead.touch_count = 0;
    }


    updatedLead.call_outcome = outcome;
    updatedLead.doctor_type = payload.doctorType || null;
    updatedLead.interest_level = interest || null;
    updatedLead.call_notes = payload.notes || '';
    updatedLead.last_call_date = todayDate;


    if (outcome === 'Invalid' || interest === 1 || interest === 2) {
        updatedLead.lead_status = 'Disqualified';

    }


    if (outcome === 'Not Picked') {
        updatedLead.next_action_type = 'Reattempt call';
        updatedLead.next_action_date = tomorrowDate;
        updatedLead.touch_count += 1;
        if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';
    }
    else if (outcome === 'Assistant picked' || outcome === 'Call back requested') {
        updatedLead.next_action_type = 'Call follow up 1';
        updatedLead.next_action_date = payload.providedNextActionDate || tomorrowDate;
        updatedLead.touch_count += 1;


        updatedLead.doctor_type = null;
        updatedLead.interest_level = null;
        if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';
    }
    else if (outcome === 'Doctor Connected') {
        if (interest === 3 || interest === 4) {
            updatedLead.next_action_date = todayDate;
            if (updatedLead.lead_status !== 'Disqualified') updatedLead.lead_status = 'Active';

            if (interest === 4 || interest === 3) {
                updatedLead.next_action_type = 'WhatsApp Follow Up';
                updatedLead.whatsapp_status = 'Pending';

                if (payload.whatsappDetailsSent) {
                    updatedLead.touch_count += 1;
                }
            }
        }
        else if (interest === 5) {
            if (payload.meetingDate && payload.meetingTime) {
                updatedLead.meeting_status = true;
                updatedLead.meeting_date = payload.meetingDate;
                updatedLead.meeting_time = payload.meetingTime;
                updatedLead.lead_status = 'Meeting Booked';
            }
        }
    }


    if (updatedLead.touch_count >= 5) {
        updatedLead.lead_status = 'Disqualified';
    }

    return updatedLead;
}

export function calculatePriorityScore(lead: Lead): number {
    if (!lead.next_action_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const actionDateStr = lead.next_action_date;

    const actionDate = new Date(actionDateStr);


    const daysUntilAction = differenceInDays(actionDate, today);


    const overdueFlag = daysUntilAction < 0 ? 1 : 0;
    const interestLevel = lead.interest_level || 0; // if null, 0


    let priorityScore = (overdueFlag * 100) + (interestLevel * 10);
    lead.overdue = overdueFlag === 1;

    return priorityScore;
}
