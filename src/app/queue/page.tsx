'use client';

import { useState, useEffect } from 'react';
import { Lead, CallOutcome, DoctorType, InterestLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { signOut, useSession } from 'next-auth/react';
import { Loader2, Phone, LogOut, CheckCircle2 } from 'lucide-react';

export default function QueuePage() {

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [outcome, setOutcome] = useState<CallOutcome | ''>('');
    const [doctorType, setDoctorType] = useState<DoctorType | ''>('');
    const [interestLevel, setInterestLevel] = useState<InterestLevel | ''>('');
    const [notes, setNotes] = useState('');
    const [whatsappSent, setWhatsappSent] = useState(false);
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');

    const fetchNextLead = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/queue/get-next', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setLead(data.lead);
                resetForm();
            } else if (res.status === 404) {
                toast.info('No active leads available in the queue right now.');
                setLead(null);
            } else {
                toast.error('Failed to fetch lead');
            }
        } catch (e) {
            toast.error('Network error while fetching lead');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setOutcome('');
        setDoctorType('');
        setInterestLevel('');
        setNotes('');
        setWhatsappSent(false);
        setMeetingDate('');
        setMeetingTime('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !outcome) return;

        setSubmitting(true);
        try {
            const payload = {
                lead_identity: lead.lead_identity,
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
                setLead(null); // Clear current lead
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to log call');
                if (data.error?.includes('expired')) {
                    setLead(null); // Lock expired, must get new lead
                }
            }
        } catch (e) {
            toast.error('Error submitting call log');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Queue Dashboard</h1>

                    </div>
                    <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })} className="gap-2">
                        <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                </div>

                {/* Main Content */}
                {!lead ? (
                    <Card className="flex flex-col items-center justify-center p-12 shadow-sm border-dashed border-2 border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                        <Phone className="h-12 w-12 text-slate-400 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Ready to make calls?</h2>
                        <p className="text-slate-500 mb-6 text-center max-w-md">
                            Click the button below to fetch the highest priority lead from the queue. You will lock this lead for 10 minutes.
                        </p>
                        <Button size="lg" onClick={fetchNextLead} disabled={loading} className="gap-2 px-8">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
                            {loading ? 'Finding Best Lead...' : 'Get Next Lead'}
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Lead Info Panel */}
                        <Card className="md:col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Lead Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">Lead ID</label>
                                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate" title={lead.lead_identity}>
                                        {lead.lead_identity}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">Assignment Info</label>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{lead.assignment_info || 'N/A'}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <h4 className="text-sm font-semibold mb-3">System Data</h4>
                                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                                        <div className="text-slate-500">Priority Score</div>
                                        <div className="font-medium text-right text-indigo-600 dark:text-indigo-400">{lead.priority_score}</div>

                                        <div className="text-slate-500">Touch Count</div>
                                        <div className="font-medium text-right">{lead.touch_count}</div>

                                        <div className="text-slate-500">Status</div>
                                        <div className="font-medium text-right">{lead.lead_status}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Form */}
                        <Card className="md:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle>Log Call Outcome</CardTitle>
                                <CardDescription>Select the outcome of the call to log details into the system.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-6">
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
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

                                            {interestLevel === 3 && (
                                                <div className="md:col-span-2 flex items-center space-x-2 pt-2">
                                                    <Checkbox id="whatsapp" checked={whatsappSent} onCheckedChange={(c) => setWhatsappSent(c as boolean)} />
                                                    <Label htmlFor="whatsapp" className="font-normal">WhatsApp details sent successfully</Label>
                                                </div>
                                            )}

                                            {interestLevel === 5 && (
                                                <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2">
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

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Call Notes</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Add any additional context or remarks here..."
                                            className="min-h-[100px] resize-y"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t pt-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-b-xl">
                                    <Button type="button" variant="ghost" onClick={() => setLead(null)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting || !outcome} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        Save & Complete List
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
