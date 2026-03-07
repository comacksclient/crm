export type UserRole = 'admin' | 'manager' | 'sdr';

export type LeadStatus = 'Active' | 'Meeting Booked' | 'Disqualified' | 'Inactive';

export type CallOutcome =
    | 'Doctor Connected'
    | 'Assistant picked'
    | 'Not Picked'
    | 'Invalid'
    | 'Call back requested';

export type DoctorType =
    | 'Rejected'
    | 'Busy'
    | 'No problem admitted'
    | 'Inflow problem'
    | 'Treatment Completion problem'
    | 'Both';

export type InterestLevel = 1 | 2 | 3 | 4 | 5;

export type NextActionType =
    | 'Call follow up 1'
    | 'Call follow up 2'
    | 'WhatsApp Follow Up'
    | 'Reattempt call'
    | 'New';

export interface Lead {
    _rowIndex?: string; // Prisma Database UUID acting as the index
    lead_identity: string;
    assignment_info: string;

    // Explicit Lead Identity
    lead_code?: string | null;
    clinic_name?: string | null;
    phone_number?: string | null;
    city?: string | null;

    // Hierarchy & Assignment
    assigned_to?: string | null;
    assigned_date?: string | null;

    // Call Qualification
    call_outcome?: CallOutcome | null;
    doctor_type?: DoctorType | null;
    interest_level?: InterestLevel | null;
    call_notes?: string;

    // Automated Fields
    next_action_type?: NextActionType | null;
    whatsapp_details_sent?: boolean;
    next_action_date?: string; // YYYY-MM-DD
    last_call_date?: string; // YYYY-MM-DD
    touch_count: number;
    overdue?: boolean;
    whatsapp_status?: string;

    meeting_status?: boolean;
    meeting_date?: string | null;
    meeting_time?: string | null;

    lead_status: LeadStatus;
    priority_score: number;

    // Locking mechanism
    locked_by?: string | null;
    locked_at?: string | null; // ISO Timestamp
}

export interface CallLogPayload {
    lead_id: string; // The primary UUID from PostgreSQL
    lead_identity: string;
    outcome: CallOutcome;
    doctorType?: DoctorType;
    interestLevel?: InterestLevel;
    notes: string; // Mandatory piece of logic
    whatsappDetailsSent?: boolean;
    meetingDate?: string;
    meetingTime?: string;
    providedNextActionDate?: string; // For manual "Call follow up" override
}
