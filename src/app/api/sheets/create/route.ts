import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth as nextAuth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await nextAuth();
        // Only admins can create system sheets
        if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const config = await prisma.systemConfig.findUnique({
            where: { key: 'google_refresh_token' }
        });

        if (!config || !config.value) {
            return NextResponse.json({ error: 'Google Account not linked' }, { status: 403 });
        }

        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
        );

        auth.setCredentials({ refresh_token: config.value });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Create the new Spreadsheet
        const createResponse = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: `CRM Outbound System - ${new Date().toISOString().split('T')[0]}`,
                },
                sheets: [
                    { properties: { title: 'Call_Queue' } },
                    { properties: { title: 'Meetings' } }
                ]
            }
        });

        const spreadsheetId = createResponse.data.spreadsheetId;
        if (!spreadsheetId) {
            throw new Error("Failed to generate Spreadsheet ID");
        }

        // 2. Format the Call_Queue Headers
        const callQueueHeaders = [
            "lead_identity", "assignment_info", "call_outcome", "doctor_type",
            "interest_level", "call_notes", "next_action_type", "whatsapp_details_sent",
            "next_action_date", "last_call_date", "touch_count", "meeting_status",
            "meeting_date", "meeting_time", "lead_status", "priority_score",
            "locked_by", "locked_at"
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Call_Queue!A1:R1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [callQueueHeaders] }
        });

        // 3. Format the Meetings Headers
        const meetingsHeaders = [
            "lead_identity", "meeting_date", "meeting_time", "meeting_status", "booked_by"
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Meetings!A1:E1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [meetingsHeaders] }
        });

        // 4. Share the sheet with the Admin who requested it (if they provide an email, or default to general sharing)
        // Note: For service accounts, the sheet is owned by the service account.
        // We will make it readable/writable by anyone with the link to ensure the Admin can view it.
        const drive = google.drive({ version: 'v3', auth });
        await drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
                role: 'writer',
                type: 'anyone'
            }
        });

        return NextResponse.json({ success: true, spreadsheetId, url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` });

    } catch (error: any) {
        console.error('Error creating Google Sheet:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
