import { NextResponse } from 'next/server';
import { auth as nextAuth } from '@/auth';
import prisma from '@/lib/prisma';



export async function POST(req: Request) {
    try {
        const session = await nextAuth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const body = await req.json();
        const { leads } = body; // Expects an array of { clinicName, phoneNumber, city }

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'Invalid or empty leads payload' }, { status: 400 });
        }

        // 2. Map incoming basic leads exactly into the Prisma structure (Defaults fill the rest)
        const leadsData = leads.map(lead => {
            const leadIdentity = `${lead.clinicName || 'Unknown'} - ${lead.phoneNumber || 'NoPhone'}`;
            const assignmentInfo = lead.city || 'Unassigned';

            return {
                lead_identity: leadIdentity,
                assignment_info: assignmentInfo,
                lead_type: lead.leadType || 'New',
                lead_status: 'Active',
                touch_count: 0,
                priority_score: 0,
                next_action_type: 'New'
            };
        });

        // 3. Batch Append to Local PostgreSQL Database
        const result = await prisma.lead.createMany({
            data: leadsData,
            skipDuplicates: true // Ignore duplicates if needed
        });

        return NextResponse.json({
            success: true,
            message: `Successfully uploaded ${result.count} leads to the system.`,
            updatedRows: result.count
        });

    } catch (error: any) {
        console.error('Error uploading leads to DB:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
