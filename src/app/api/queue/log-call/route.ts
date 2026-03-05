import { NextResponse } from 'next/server';
import { logCallOutcome } from '@/lib/queueService';
import { CallLogPayload } from '@/lib/types';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        const payload = await req.json() as CallLogPayload;

        if (!payload.lead_identity || !payload.outcome) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await auth();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use authentic email instead of mock username
        const email = session.user.email;
        await logCallOutcome(payload, email);

        return NextResponse.json({ success: true, message: 'Call logged successfully' });
    } catch (error: any) {
        console.error('Error in /api/queue/log-call:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
