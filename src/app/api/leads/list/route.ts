import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { calculatePriorityScore } from '@/lib/actionEngine';
import { mapPrismaToLead } from '@/lib/googleSheets';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Scalable Database Querying: Only fetch precisely 'Active' leads (up to 200)
        // Disqualified leads have already been hard deleted, and Meeting Booked leads have their own page.
        const dbLeads = await prisma.lead.findMany({
            where: { lead_status: 'Active' },
            take: 200, // Hard limit to ensure frontend DOM doesn't crash on huge datasets
        });

        // Compute scores and sort efficiently
        const activeLeads = dbLeads.map(mapPrismaToLead);

        activeLeads.forEach(lead => {
            lead.priority_score = calculatePriorityScore(lead);
        });

        // Sort leads by Priority Score (DESC), then by touch count (ASC) so freshest leads are on top among ties
        activeLeads.sort((a, b) => {
            if (b.priority_score !== a.priority_score) {
                return b.priority_score - a.priority_score; // Descending
            }
            return (a.touch_count || 0) - (b.touch_count || 0); // Ascending
        });

        return NextResponse.json({ leads: activeLeads });
    } catch (e: any) {
        console.error("Error fetching leads list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
