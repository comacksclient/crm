'use client';

import { useState, useEffect } from 'react';
import { Lead, CallOutcome, DoctorType, InterestLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { Loader2, LogOut, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function QueuePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [teamName, setTeamName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [outcome, setOutcome] = useState<CallOutcome | ''>('');
    const [doctorType, setDoctorType] = useState<DoctorType | ''>('');
    const [interestLevel, setInterestLevel] = useState<InterestLevel | ''>('');
    const [notes, setNotes] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [whatsappSent, setWhatsappSent] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/leads/list');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setTeamName(data.teamName || 'Unassigned');
            } else {
                toast.error('Failed to load leads table');
            }
        } catch (e) {
            toast.error('Network error while fetching leads');
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (lead: Lead) => {
        setActiveLead(lead);
        setOutcome('');
        setDoctorType('');
        setInterestLevel('');
        setNotes('');
        setMeetingDate('');
        setMeetingTime('');
        setWhatsappSent(false);
    };

    const handleCloseModal = () => {
        setActiveLead(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLead || !outcome) return;
        if (!notes.trim()) {
            toast.error("Call Notes are mandatory to advance the workflow!");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                lead_id: activeLead._rowIndex as string,
                lead_identity: activeLead.lead_identity,
                outcome: outcome as CallOutcome,
                doctorType: doctorType as DoctorType || undefined,
                interestLevel: interestLevel as InterestLevel || undefined,
                notes,
                whatsappDetailsSent: whatsappSent,
                meetingDate: meetingDate || undefined,
                meetingTime: meetingTime || undefined,
            };

            const res = await fetch('/api/queue/log-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Call logged successfully!');
                setActiveLead(null);
                fetchLeads(); // Refresh table
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to log call');
            }
        } catch (e) {
            toast.error('Error submitting call log');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            CRM Table View
                            {teamName && (
                                <span className="text-xs font-normal px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                                    {teamName}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500">View and log interactions for your assigned leads. Sorted by priority.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => window.location.href = '/meetings'} className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                            Booked Meetings
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/dashboard/admin'} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                            Setup & Uploads
                        </Button>
                        <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })} className="gap-2">
                            <LogOut className="h-4 w-4" /> Sign Out
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Clinic / Lead</th>
                                    <th className="px-6 py-4">City / Info</th>
                                    <th className="px-6 py-4 text-center">Score</th>
                                    <th className="px-6 py-4 text-center">Touches</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Next Action Date</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading leads...
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                    <Loader2 className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No leads assigned to you yet</p>
                                                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                                                        You are currently in the <b>{teamName}</b> team.
                                                        Wait for your Manager to assign leads to your queue or ask them to use the "Turbo Distribute" tool.
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead, idx) => {
                                        const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                        return (
                                            <tr
                                                key={idx}
                                                onClick={() => handleRowClick(lead)}
                                                className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={lead.lead_identity}>
                                                    {lead.lead_identity}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={lead.assignment_info}>
                                                    {lead.assignment_info || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${lead.priority_score > 50 ? 'bg-red-100 text-red-700' : lead.priority_score > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {lead.priority_score}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                                                    {lead.touch_count} / 5
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-xs font-medium border border-green-200 dark:border-green-800">
                                                        {lead.lead_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={isOverdue ? "text-red-600 font-semibold" : "text-slate-600"}>
                                                            {lead.next_action_date ? format(new Date(lead.next_action_date), 'MMM dd, yyyy') : 'No Action Scheduled'}
                                                        </span>
                                                        {isOverdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase font-bold rounded">Overdue</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Log Call
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal Overlay / Log Call Drawer */}
            {activeLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Log Call Outcome</h2>
                                <p className="text-sm text-slate-500 mt-1">Calling: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeLead.lead_identity}</span></p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleCloseModal} className="text-slate-400 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-2">
                                    <Label htmlFor="outcome">Call Outcome</Label>
                                    <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)} required>
                                        <SelectTrigger id="outcome">
                                            <SelectValue placeholder="Select outcome..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Doctor Connected">Doctor Connected</SelectItem>
                                            <SelectItem value="Assistant picked">Assistant picked</SelectItem>
                                            <SelectItem value="Not Picked">Not Picked</SelectItem>
                                            <SelectItem value="Invalid">Invalid</SelectItem>
                                            <SelectItem value="Call back requested">Call back requested</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {outcome === 'Doctor Connected' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
                                        <div className="space-y-2">
                                            <Label htmlFor="interest">Interest Level (1-5)</Label>
                                            <Select value={interestLevel.toString()} onValueChange={(v) => setInterestLevel(parseInt(v) as InterestLevel)} required>
                                                <SelectTrigger id="interest">
                                                    <SelectValue placeholder="Select level" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5 - Highly Interested (Booked)</SelectItem>
                                                    <SelectItem value="4">4 - Interested</SelectItem>
                                                    <SelectItem value="3">3 - Moderate</SelectItem>
                                                    <SelectItem value="2">2 - Low</SelectItem>
                                                    <SelectItem value="1">1 - Not Interested</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="doctor_type">Doctor Type</Label>
                                            <Select value={doctorType} onValueChange={(v) => setDoctorType(v as DoctorType)} required>
                                                <SelectTrigger id="doctor_type">
                                                    <SelectValue placeholder="Select problem" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                                    <SelectItem value="Busy">Busy</SelectItem>
                                                    <SelectItem value="No problem admitted">No problem admitted</SelectItem>
                                                    <SelectItem value="Inflow problem">Inflow problem</SelectItem>
                                                    <SelectItem value="Treatment Completion problem">Treatment Completion problem</SelectItem>
                                                    <SelectItem value="Both">Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {interestLevel === 5 && (
                                            <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-3 border-t border-indigo-100 dark:border-indigo-900 mt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="meetingDate">Meeting Date</Label>
                                                    <Input id="meetingDate" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="meetingTime">Meeting Time</Label>
                                                    <Input id="meetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} required />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {outcome === 'Doctor Connected' && (interestLevel === 3 || interestLevel === 4) && (
                                    <div className="flex items-center gap-3 mt-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                                        <input
                                            type="checkbox"
                                            id="whatsappSent"
                                            checked={whatsappSent}
                                            onChange={(e) => setWhatsappSent(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <Label htmlFor="whatsappSent" className="cursor-pointer text-sm font-semibold">
                                            WhatsApp Details Evaluated / Sent for Nurture Flow
                                        </Label>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Call Notes <span className="text-red-500">*</span></Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Add any additional context or remarks here..."
                                        className="min-h-[100px] resize-y"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting || !outcome} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Save Outcome
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
