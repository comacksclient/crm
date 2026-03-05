import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth as nextAuth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await nextAuth();
        // Determine role via our session injection
        const role = (session?.user as any)?.role;

        // Only Admins can upload raw CSV data to the CRM
        if (!session || !session.user || role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Only Admins can upload leads.' }, { status: 401 });
        }

        const body = await req.json();
        const { leads } = body; // Expects an array of { clinicName, phoneNumber, city }

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'Invalid or empty leads payload' }, { status: 400 });
        }

        // 1. Authenticate with Google Sheets using exact same method as getCallQueue()
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'google_refresh_token' }
        });

        if (!config || !config.value) {
            return NextResponse.json({ error: 'Google Account not linked. Please visit Admin Dashboard to authorize.' }, { status: 403 });
        }

        const spreadsheetId = process.env.SPREADSHEET_ID;
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'SPREADSHEET_ID is missing from .env' }, { status: 500 });
        }

        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
        );
        auth.setCredentials({ refresh_token: config.value });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Map incoming basic leads into the strict 18-column `Call_Queue` schema
        // Schema: [lead_identity, assignment_info, call_outcome, doctor_type, interest_level, call_notes, next_action_type, whatsapp_details_sent, next_action_date, last_call_date, touch_count, meeting_status, meeting_date, meeting_time, lead_status, priority_score, locked_by, locked_at]

        const rowsToAppend = leads.map(lead => {
            const leadIdentity = `${lead.clinicName || 'Unknown'} - ${lead.phoneNumber || 'NoPhone'}`;
            const assignmentInfo = lead.city || 'Unassigned';

            return [
                leadIdentity,       // 1. A: lead_identity
                assignmentInfo,     // 2. B: assignment_info (Manager/City)
                "",                 // 3. C: call_outcome
                "",                 // 4. D: doctor_type
                "",                 // 5. E: interest_level
                "",                 // 6. F: call_notes
                "New",              // 7. G: next_action_type (Default 'New' per design.md)
                "FALSE",            // 8. H: whatsapp_details_sent
                "",                 // 9. I: next_action_date
                "",                 // 10. J: last_call_date
                "0",                // 11. K: touch_count (Starts at 0)
                "FALSE",            // 12. L: meeting_status
                "",                 // 13. M: meeting_date
                "",                 // 14. N: meeting_time
                "Active",           // 15. O: lead_status
                "0",                // 16. P: priority_score
                "",                 // 17. Q: locked_by
                ""                  // 18. R: locked_at
            ];
        });

        // 3. Append to the sheet
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Call_Queue!A:R',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: rowsToAppend
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully uploaded ${leads.length} leads to the system.`,
            updatedRows: response.data.updates?.updatedRows || 0
        });

    } catch (error: any) {
        console.error('Error uploading leads to sheet:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
