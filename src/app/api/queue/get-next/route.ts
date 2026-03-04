import { NextResponse } from 'next/server';
import { getNextLead } from '@/lib/queueService';

export async function POST(req: Request) {
    try {
        // Without auth, we use a generic identifier for locking
        const email = 'guest_sdr@system.local';
        const lead = await getNextLead(email);

        if (!lead) {
            return NextResponse.json({ message: 'Queue is empty or all leads are locked' }, { status: 404 });
        }

        return NextResponse.json({ lead });
    } catch (error: any) {
        console.error('Error in /api/queue/get-next:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
