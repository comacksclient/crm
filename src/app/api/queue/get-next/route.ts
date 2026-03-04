import { NextResponse } from 'next/server';
import { getNextLead } from '@/lib/queueService';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.username) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use authentic username for locking leads
        const email = session.username;
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
