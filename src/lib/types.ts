export type UserRole = 'admin' | 'manager' | 'sdr';

export type LeadStatus = 'Active' | 'Meeting Booked' | 'Disqualified';

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
    | 'Call follow up'
    | 'Whatsapp details'
    | 'Reattempt';

export interface Lead {
    _rowIndex?: string; // Prisma Database UUID acting as the index
    lead_identity: string;
    assignment_info: string;

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

    meeting_status?: 'confirmed' | null;
    meeting_date?: string;
    meeting_time?: string;

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
