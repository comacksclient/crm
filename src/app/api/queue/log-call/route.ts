import { NextResponse } from 'next/server';
import { logCallOutcome } from '@/lib/queueService';
import { CallLogPayload } from '@/lib/types';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const payload = await req.json() as CallLogPayload;

        if (!payload.lead_identity || !payload.outcome) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await getSession();

        if (!session || !session.username) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use actual session username instead of mock
        const email = session.username;
        await logCallOutcome(payload, email);

        return NextResponse.json({ success: true, message: 'Call logged successfully' });
    } catch (error: any) {
        console.error('Error in /api/queue/log-call:', error);
        // Determine if it's a lock expiry error
        if (error.message?.includes('Lock might have expired')) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
