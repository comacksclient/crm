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

        // Fetch user from DB to get reliable Role and ID
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string }
        });

        if (!dbUser) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

        let whereClause: any = { lead_status: 'Active' };

        // Row-Level Security Enforcements based on design.md
        if (dbUser.role === 'SDR') {
            whereClause.sdr_id = dbUser.id; // SDRs ONLY see leads explicitly assigned to them
        } else if (dbUser.role === 'MANAGER') {
            if (dbUser.team_id) {
                // Manager sees all leads delegated to their team
                whereClause.team_id = dbUser.team_id;
            } else {
                return NextResponse.json({ leads: [] }); // Manager without a team sees nothing
            }
        }
        // If ADMIN, the whereClause remains just { lead_status: 'Active' }, which fetches EVERYTHING.

        // Scalable Database Querying: Fetch matching leads (up to 200 to prevent DOM overflow)
        const dbLeads = await prisma.lead.findMany({
            where: whereClause,
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
