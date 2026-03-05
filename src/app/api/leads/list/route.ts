import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCallQueue } from '@/lib/googleSheets';
import { calculatePriorityScore } from '@/lib/actionEngine';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { leads } = await getCallQueue();

        // 1. Filter out Disqualified and Meeting Booked leads from the main caller list (unless we want to show all)
        // design.md specifies we only call Active leads or those needing action.
        const activeLeads = leads.filter(lead => lead.lead_status !== 'Disqualified' && lead.lead_status !== 'Meeting Booked');

        // 2. Sort leads by Priority Score (DESC), then by touch count (ASC) so freshest leads are on top among ties
        activeLeads.sort((a, b) => {
            const scoreA = calculatePriorityScore(a);
            const scoreB = calculatePriorityScore(b);
            if (scoreB !== scoreA) {
                return scoreB - scoreA; // Descending
            }
            return (a.touch_count || 0) - (b.touch_count || 0); // Ascending
        });

        return NextResponse.json({ leads: activeLeads });
    } catch (e: any) {
        console.error("Error fetching leads list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
