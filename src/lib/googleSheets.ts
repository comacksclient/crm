import { google } from 'googleapis';
import { Lead } from './types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Authentication via OAuth 2.0 (No longer using Service Account Keys)
const getAuth = async () => {
    const config = await prisma.systemConfig.findUnique({
        where: { key: 'google_refresh_token' }
    });

    if (!config || !config.value) {
        throw new Error('Google OAuth Refresh Token is missing. Please link account in Admin Dashboard.');
    }

    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    );

    oAuth2Client.setCredentials({ refresh_token: config.value });
    return oAuth2Client;
};

const getSheets = async () => google.sheets({ version: 'v4', auth: await getAuth() });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export async function getCallQueue(): Promise<{ leads: Lead[], metadata: any }> {
    // If missing env vars, fail gracefully in dev or throw explicitly
    if (!SPREADSHEET_ID) {
        console.warn("SPREADSHEET_ID is missing");
        return { leads: [], metadata: { total: 0 } };
    }
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Call_Queue!A2:R',
    });

    const rows = response.data.values || [];

    const leads: Lead[] = rows.map((row, index) => {
        return {
            _rowIndex: index + 2, // 1-based, plus header
            lead_identity: row[0] || '',
            assignment_info: row[1] || '',
            call_outcome: row[2] as any || null,
            doctor_type: row[3] as any || null,
            interest_level: row[4] ? parseInt(row[4]) as any : null,
            call_notes: row[5] || '',
            next_action_type: row[6] as any || null,
            whatsapp_details_sent: row[7] === 'TRUE',
            next_action_date: row[8] || '',
            last_call_date: row[9] || '',
            touch_count: parseInt(row[10] || '0', 10),
            meeting_status: row[11] as any || null,
            meeting_date: row[12] || '',
            meeting_time: row[13] || '',
            lead_status: row[14] as any || 'Active',
            priority_score: parseInt(row[15] || '0', 10),
            locked_by: row[16] || null,
            locked_at: row[17] || null,
        };
    });

    return { leads, metadata: { total: rows.length } };
}

export async function updateLeadRow(rowIndex: number, lead: Lead) {
    if (!SPREADSHEET_ID) return;
    const sheets = await getSheets();
    const values = [
        [
            lead.lead_identity,
            lead.assignment_info,
            lead.call_outcome || '',
            lead.doctor_type || '',
            lead.interest_level || '',
            lead.call_notes || '',
            lead.next_action_type || '',
            lead.whatsapp_details_sent ? 'TRUE' : 'FALSE',
            lead.next_action_date || '',
            lead.last_call_date || '',
            lead.touch_count.toString(),
            lead.meeting_status || '',
            lead.meeting_date || '',
            lead.meeting_time || '',
            lead.lead_status,
            lead.priority_score.toString(),
            lead.locked_by || '',
            lead.locked_at || '',
        ]
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Call_Queue!A${rowIndex}:R${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
    });
}

export async function appendToMeetings(lead: Lead, bookedBy: string) {
    if (!SPREADSHEET_ID) return;
    const sheets = await getSheets();
    const values = [
        [
            lead.lead_identity,
            lead.meeting_date || '',
            lead.meeting_time || '',
            lead.meeting_status || '',
            bookedBy
        ]
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Meetings!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
    });
}

export interface MeetingRow {
    lead_identity: string;
    meeting_date: string;
    meeting_time: string;
    meeting_status: string;
    booked_by: string;
}

export async function getMeetings(): Promise<MeetingRow[]> {
    if (!SPREADSHEET_ID) return [];

    try {
        const sheets = await getSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Meetings!A2:E',
        });

        const rows = response.data.values || [];
        return rows.map(row => ({
            lead_identity: row[0] || '',
            meeting_date: row[1] || '',
            meeting_time: row[2] || '',
            meeting_status: row[3] || '',
            booked_by: row[4] || '',
        }));
    } catch (e) {
        console.error("Error fetching meetings:", e);
        return [];
    }
}
