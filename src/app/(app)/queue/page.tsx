'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, CallOutcome, DoctorType, InterestLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Trash2, Edit, Loader2, CheckCircle2, X, Search,
    ChevronLeft, ChevronRight, Filter, Play, ClipboardList,
    History, Calendar, MessageSquare, PhoneCall, Clock, CheckCircle
} from 'lucide-react';

export default function QueuePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [teamName, setTeamName] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('all');
    const [sdrFilter, setSdrFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('Active');
    const [actionFilter, setActionFilter] = useState('all');
    const [scheduleFilter, setScheduleFilter] = useState('all');
    const [uniqueCities, setUniqueCities] = useState<string[]>([]);
    const [uniqueSdrs, setUniqueSdrs] = useState<string[]>([]);
    const [sdrList, setSdrList] = useState<string[]>([]);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const [tomorrowForecast, setTomorrowForecast] = useState<number>(0);

    // Layout States
    const [focusMode, setFocusMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'due' | 'future' | 'whatsapp'>('due');

    // Drawer / Form State
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [outcome, setOutcome] = useState<CallOutcome | ''>('');
    const [doctorType, setDoctorType] = useState<DoctorType | ''>('');
    const [interestLevel, setInterestLevel] = useState<InterestLevel | ''>('');
    const [notes, setNotes] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [whatsappSent, setWhatsappSent] = useState(false);
    const [callbackDate, setCallbackDate] = useState('');

    // Heartbeat setup for live active monitoring
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                await fetch('/api/users/ping', { method: 'POST' });
            } catch (err) {
                console.error("Heartbeat error:", err);
            }
        };

        sendHeartbeat(); // Ping immediately
        const heartbeatInterval = setInterval(sendHeartbeat, 2 * 60 * 1000); // 2 minutes

        return () => clearInterval(heartbeatInterval);
    }, []);

    // Load Leads list with parameters
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            // Map tabs to action filters or overdue filters
            let overdueParam = 'all';
            let nextActionParam = actionFilter;

            if (userRole === 'SDR') {
                if (activeTab === 'due') {
                    overdueParam = 'all';
                } else if (activeTab === 'future') {
                    overdueParam = 'false';
                }
            } else {
                if (activeTab === 'due') {
                    overdueParam = 'all';
                } else if (activeTab === 'future') {
                    overdueParam = 'false';
                }
            }

            if (activeTab === 'whatsapp') {
                nextActionParam = 'WhatsApp Follow Up';
            }

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '15',
                search: searchQuery,
                city: cityFilter,
                sdrId: sdrFilter,
                status: statusFilter,
                nextAction: nextActionParam,
                overdue: overdueParam,
                schedule: scheduleFilter
            });

            const res = await fetch(`/api/leads/list?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setTotalPages(data.totalPages || 1);
                setTotalLeads(data.total || 0);
                setTomorrowForecast(data.tomorrowForecast || 0);
                setTeamName(data.teamName || 'Unassigned');
                setSdrList(data.sdrs || []);

                // Extract cities & SDRs for advanced filtering drop downs
                if (data.leads && data.leads.length > 0) {
                    const cities = Array.from(new Set(data.leads.map((l: Lead) => l.city).filter(Boolean))) as string[];
                    const sdrs = Array.from(new Set(data.leads.map((l: Lead) => l.assigned_to).filter(Boolean))) as string[];
                    setUniqueCities(prev => Array.from(new Set([...prev, ...cities])).sort());
                    setUniqueSdrs(prev => Array.from(new Set([...prev, ...sdrs])).sort());
                }
            }

            const userRes = await fetch('/api/auth/me');
            if (userRes.ok) {
                const userData = await userRes.json();
                setUserRole(userData.user?.role || 'SDR');
                setUserEmail(userData.user?.email || null);
            }
        } catch (e) {
            toast.error('Network error fetching leads pipeline');
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, cityFilter, sdrFilter, statusFilter, actionFilter, activeTab, userRole, scheduleFilter]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Handle single lead clicks (claim lock and open workspace)
    const handleStartCall = async (lead: Lead) => {
        try {
            // Attempt to lock lead to prevent double dialing
            const res = await fetch('/api/leads/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead._rowIndex, action: 'lock' })
            });

            if (res.ok) {
                setActiveLead(lead);
                setOutcome(lead.call_outcome || '');
                setDoctorType(lead.doctor_type || '');
                setInterestLevel(lead.interest_level || '');
                setNotes('');
                setMeetingDate(lead.meeting_date || '');
                setMeetingTime(lead.meeting_time || '');
                setWhatsappSent(lead.whatsapp_details_sent || false);
                toast.success(`Lead locked. Session started.`);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to lock lead.');
            }
        } catch (err) {
            toast.error('Error starting call lock.');
        }
    };

    const handleReleaseCall = async () => {
        if (!activeLead) return;
        try {
            await fetch('/api/leads/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: activeLead._rowIndex, action: 'unlock' })
            });
            setActiveLead(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLead || !outcome) return;
        if (!notes.trim()) {
            toast.error("Call Notes are mandatory to log call outcome!");
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
                providedNextActionDate: callbackDate || undefined,
            };

            const res = await fetch('/api/queue/log-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Call logged and next action scheduled!');
                setActiveLead(null);
                setCallbackDate('');
                fetchLeads(); // Refresh list
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to log call outcome');
            }
        } catch (e) {
            toast.error('Error logging call details.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateNextActionDate = async (lead: Lead, newDate: string) => {
        try {
            const res = await fetch('/api/leads/reschedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: lead._rowIndex,
                    next_action_date: newDate || null
                })
            });

            if (res.ok) {
                toast.success('Next action date updated successfully');
                fetchLeads(); // Refresh list
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update date');
            }
        } catch (e) {
            toast.error('Error updating next action date');
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setCityFilter('all');
        setSdrFilter('all');
        setActionFilter('all');
        setScheduleFilter('all');
        setStatusFilter('Active');
        setPage(1);
    };

    const groupedLeads = useMemo(() => {
        const followUps: Lead[] = [];
        const reattempts: Lead[] = [];
        const newLeads: Lead[] = [];

        leads.forEach(lead => {
            const action = (lead.next_action_type || '').toLowerCase();
            if (action === 'new') {
                newLeads.push(lead);
            } else if (action.includes('reattempt') || action.includes('retry')) {
                reattempts.push(lead);
            } else {
                followUps.push(lead);
            }
        });

        return { followUps, reattempts, newLeads };
    }, [leads]);

    const renderLeadRow = (lead: Lead) => {
        const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date(new Date().setHours(0, 0, 0, 0));
        return (
            <tr
                key={lead._rowIndex}
                onClick={() => handleStartCall(lead)}
                className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
            >
                <td
                    className="px-6 py-4 font-semibold text-slate-950 dark:text-slate-100 max-w-[200px] truncate"
                    title={lead.lead_identity}
                    onClick={(e) => e.stopPropagation()}
                >
                    {lead.clinic_name || lead.lead_identity.split(' - ')[0] || lead.lead_identity}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400" title={lead.city || undefined}>
                    {lead.city || '-'}
                </td>
                <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">{lead.touch_count}</span> / 5
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md">
                        {lead.next_action_type || 'New'}
                    </span>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${lead.lead_status === 'Meeting Booked' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : lead.lead_status === 'Disqualified' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {lead.lead_status}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium" onClick={(e) => e.stopPropagation()}>
                    <Input
                        type="date"
                        value={(lead.next_action_date || '').substring(0, 10)}
                        onChange={async (e) => {
                            const newDate = e.target.value;
                            await handleUpdateNextActionDate(lead, newDate);
                        }}
                        className={`bg-transparent border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-900 border p-1.5 w-[135px] text-xs font-semibold rounded transition-all cursor-pointer ${
                            isOverdue
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-slate-700 dark:text-slate-300"
                        }`}
                    />
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                    {isOverdue ? (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] uppercase font-bold rounded-full border border-rose-200">Overdue</span>
                    ) : (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full border border-slate-200">On Track</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Button
                        onClick={(e) => { e.stopPropagation(); handleStartCall(lead); }}
                        size="sm"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                    >
                        <Play className="h-3 w-3 fill-indigo-700" /> Start Call
                    </Button>
                </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Dashboard Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            📞 Comacks Dashboard
                            {teamName && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-full border border-indigo-150">
                                    {teamName}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Review, filter, and dial corporate leads. Sorted dynamically by priority.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        {/* Tomorrow Forecast Badge */}
                        <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/30 p-2 rounded-xl text-left px-4 h-9">
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Tomorrow Forecast</span>
                            <span className="text-xs font-extrabold text-amber-800 dark:text-amber-200">{tomorrowForecast} follow-ups</span>
                        </div>
                        {/* Focus Mode Pill Toggle */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2">Focus View</span>
                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`px-4 py-1 text-xs font-bold rounded-full transition-all duration-200 ${focusMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-slate-400'}`}
                            >
                                {focusMode ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Reset button */}
                        <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs font-medium">
                            Reset View
                        </Button>
                    </div>
                </div>

                {/* Advanced Search & Filtering Drawer */}
                {!activeLead && (
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardContent className="p-5 flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[240px] relative">
                                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                <Input
                                    placeholder="Search clinic, phone number, city..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="pl-9 bg-slate-50 border-slate-200 rounded-xl"
                                />
                            </div>

                            {userRole !== 'SDR' && (
                                <div className="w-40 shrink-0">
                                    <Select value={sdrFilter} onValueChange={(v) => { setSdrFilter(v); setPage(1); }}>
                                        <SelectTrigger className="bg-slate-50 rounded-xl">
                                            <SelectValue placeholder="SDR Filter" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All SDRs</SelectItem>
                                            <SelectItem value="unassigned">Unassigned Pool</SelectItem>
                                            {Array.from(new Set(sdrList.length > 0 ? sdrList : uniqueSdrs)).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {userRole !== 'SDR' && (
                                <div className="w-40 shrink-0">
                                    <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
                                        <SelectTrigger className="bg-slate-50 rounded-xl">
                                            <SelectValue placeholder="City Filter" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Regions</SelectItem>
                                            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="w-40 shrink-0">
                                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl">
                                        <SelectValue placeholder="Lead Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active Queue</SelectItem>
                                        <SelectItem value="Meeting Booked">Meetings Booked</SelectItem>
                                        <SelectItem value="Disqualified">Disqualified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-40 shrink-0">
                                <Select value={scheduleFilter} onValueChange={(v) => { setScheduleFilter(v); setPage(1); }}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl">
                                        <SelectValue placeholder="Schedule Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Timeframes</SelectItem>
                                        <SelectItem value="today">Scheduled Today</SelectItem>
                                        <SelectItem value="yesterday-overdue">Yesterday & Overdue</SelectItem>
                                        {userRole !== 'SDR' && <SelectItem value="future">Future Follow-ups</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-40 shrink-0">
                                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl">
                                        <SelectValue placeholder="Action Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Action Types</SelectItem>
                                        <SelectItem value="new">New Leads</SelectItem>
                                        <SelectItem value="follow-up">Follow-ups</SelectItem>
                                        <SelectItem value="reattempt">Reattempts</SelectItem>
                                        <SelectItem value="WhatsApp Follow Up">WhatsApp Follow-ups</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* calling segment Tabs */}
                {!activeLead && !focusMode && (
                    <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
                        <button
                            onClick={() => { setActiveTab('due'); setPage(1); }}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'due' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Active Call List (Today/Overdue)
                        </button>
                        <button
                            onClick={() => { setActiveTab('future'); setPage(1); }}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'future' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <Calendar className="h-4 w-4" />
                            Scheduled Future Follow-ups
                        </button>
                        <button
                            onClick={() => { setActiveTab('whatsapp'); setPage(1); }}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'whatsapp' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp Follow Up
                        </button>
                    </div>
                )}

                {/* === LAYOUT MODE A: FOCUS MODE WORKSPACE === */}
                {focusMode && !activeLead ? (
                    <Card className="p-12 text-center border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-full">
                                <Play className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Focus Mode</h2>
                            <p className="text-slate-500 text-sm">
                                Focus Mode is enabled. Dial leads one-by-one according to priority. Hides tabular clutter to keep you locked on calls.
                            </p>
                            {leads.length > 0 ? (
                                <Button
                                    size="lg"
                                    onClick={() => handleStartCall(leads[0])}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-8 rounded-xl shadow-md"
                                >
                                    <PhoneCall className="h-4 w-4" />
                                    Dial Next High Priority Lead
                                </Button>
                            ) : (
                                <p className="text-emerald-600 font-bold bg-emerald-50 py-2 rounded">
                                    🎉 Clean desk! No active leads due today in your queue.
                                </p>
                            )}
                        </div>
                    </Card>
                ) : null}

                {/* === ACTIVE CALLING SESSION INTERFACE (SPLIT SCREEN WORKSPACE) === */}
                {activeLead ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">

                        {/* Call Outcomes Form (Left 2 columns) */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-md rounded-2xl overflow-hidden border-indigo-100 border-2">
                                <CardHeader className="bg-indigo-50/50 p-6 border-b border-indigo-100 dark:border-indigo-900/30 flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Active Calling Dashboard</CardTitle>
                                        <CardDescription className="text-indigo-600 font-semibold mt-1">
                                            Dialing: {activeLead.clinic_name || activeLead.lead_identity} ({activeLead.phone_number})
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={handleReleaseCall} className="text-slate-400 hover:bg-white">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </CardHeader>

                                <form onSubmit={handleSubmit}>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="outcome" className="font-semibold text-slate-700">Call Outcome</Label>
                                            <Select value={outcome} onValueChange={(v) => { setOutcome(v as CallOutcome); if (v !== 'Call back requested') setCallbackDate(''); }} required>
                                                <SelectTrigger id="outcome" className="rounded-xl border-slate-200">
                                                    <SelectValue placeholder="Select call outcome..." />
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

                                        {outcome === 'Call back requested' && (
                                            <div className="space-y-2 p-4 border border-indigo-150 rounded-xl bg-indigo-50/20">
                                                <Label htmlFor="callbackDate" className="font-semibold text-slate-700">Callback Date <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    id="callbackDate"
                                                    type="date"
                                                    value={callbackDate}
                                                    onChange={(e) => setCallbackDate(e.target.value)}
                                                    className="bg-white rounded-lg border-slate-200"
                                                    min={new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                        )}

                                        {outcome === 'Doctor Connected' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border border-indigo-100 rounded-xl bg-indigo-50/20">
                                                <div className="space-y-2">
                                                    <Label htmlFor="interest" className="font-semibold text-slate-700">Interest Level</Label>
                                                    <Select value={interestLevel.toString()} onValueChange={(v) => setInterestLevel(parseInt(v) as InterestLevel)} required>
                                                        <SelectTrigger id="interest" className="bg-white rounded-lg">
                                                            <SelectValue placeholder="Rank level (1-5)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="5">5 - Highly Interested (Booked)</SelectItem>
                                                            <SelectItem value="4">4 - Interested (Follow-up)</SelectItem>
                                                            <SelectItem value="3">3 - Moderate (WhatsApp)</SelectItem>
                                                            <SelectItem value="2">2 - Low (Disqualify)</SelectItem>
                                                            <SelectItem value="1">1 - Not Interested (Disqualify)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="doctor_type" className="font-semibold text-slate-700">Doctor Pain Point</Label>
                                                    <Select value={doctorType} onValueChange={(v) => setDoctorType(v as DoctorType)} required>
                                                        <SelectTrigger id="doctor_type" className="bg-white rounded-lg">
                                                            <SelectValue placeholder="Select primary problem..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                                            <SelectItem value="Busy">Busy</SelectItem>
                                                            <SelectItem value="No problem admitted">No problem admitted</SelectItem>
                                                            <SelectItem value="Inflow problem">Inflow problem</SelectItem>
                                                            <SelectItem value="Treatment Completion problem">Treatment Completion problem</SelectItem>
                                                            <SelectItem value="Both">Both problems</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {interestLevel === 5 && (
                                                    <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-indigo-100 mt-2">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="meetingDate" className="font-semibold text-slate-700">Meeting Date</Label>
                                                            <Input id="meetingDate" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="bg-white" required />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="meetingTime" className="font-semibold text-slate-700">Meeting Time</Label>
                                                            <Input id="meetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="bg-white" required />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {outcome === 'Doctor Connected' && (interestLevel === 3 || interestLevel === 4) && (
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                <input
                                                    type="checkbox"
                                                    id="whatsappSent"
                                                    checked={whatsappSent}
                                                    onChange={(e) => setWhatsappSent(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <Label htmlFor="whatsappSent" className="cursor-pointer text-sm font-semibold text-slate-700">
                                                    WhatsApp marketing resources successfully sent for nurture flow
                                                </Label>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="font-semibold text-slate-700">Call Notes <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Provide Call details. Explain response, objections, callbacks, or rescheduling context..."
                                                className="min-h-[100px] rounded-xl"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </CardContent>

                                    <div className="flex justify-between p-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                                        <Button type="button" variant="outline" onClick={handleReleaseCall} disabled={submitting} className="rounded-xl">
                                            Cancel & Unlock
                                        </Button>
                                        <Button type="submit" disabled={submitting || !outcome} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 font-bold shadow-md">
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                            Log Outcome
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>

                        {/* Call History Timeline (Right 1 column) */}
                        <div className="space-y-6">
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl h-full flex flex-col">
                                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4 text-indigo-600" />
                                        <CardTitle className="text-sm font-bold">Call History Timeline</CardTitle>
                                    </div>
                                    <CardDescription>Previous dials for this client ({activeLead.touch_count || 0} total touches)</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 flex-1 overflow-y-auto max-h-[500px]">
                                    {!activeLead.logs || activeLead.logs.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 text-xs">
                                            No call history logs found. This is a fresh lead.
                                        </div>
                                    ) : (
                                        <div className="relative border-l border-slate-200 dark:border-slate-700 pl-4 space-y-6 ml-2 text-xs">
                                            {activeLead.logs.map((log: any) => (
                                                <div key={log.id} className="relative">
                                                    <span className="absolute -left-[21px] top-1 flex items-center justify-center bg-white border border-slate-300 rounded-full p-0.5">
                                                        <Clock className="h-3 w-3 text-slate-500" />
                                                    </span>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-slate-700">{log.outcome}</span>
                                                            <span className="text-slate-400 text-[10px]">{format(new Date(log.createdAt), 'MMM dd, h:mm a')}</span>
                                                        </div>
                                                        {log.interest_level && (
                                                            <p className="text-[10px] font-semibold text-indigo-600">Interest level: {log.interest_level}/5</p>
                                                        )}
                                                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border">{log.notes || 'No notes added.'}</p>
                                                        <p className="text-[9px] text-slate-400">Caller: {log.sdrName || 'System'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}

                {/* === LAYOUT MODE B: DATA TABLE VIEW === */}
                {!activeLead && !focusMode && (
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap">Name</th>
                                        <th className="px-6 py-4 whitespace-nowrap">City</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Touches</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Next Action</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Scheduled Date</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Overdue</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                                Filtering pipeline...
                                            </td>
                                        </tr>
                                    ) : leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                        <ClipboardList className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No matching leads found</p>
                                                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                                            Currently showing tab <b>{activeTab}</b>. Try selecting another tab or resetting search filter properties.
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : userRole === 'SDR' && activeTab === 'due' ? (
                                        <>
                                            {/* Section 1: Follow-ups Due Today */}
                                            {groupedLeads.followUps.length > 0 && (
                                                <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 font-bold text-indigo-700 dark:text-indigo-300 text-xs tracking-wider border-t">
                                                    <td colSpan={8} className="px-6 py-2.5">
                                                        📅 FOLLOW-UPS DUE TODAY ({groupedLeads.followUps.length} / 75)
                                                    </td>
                                                </tr>
                                            )}
                                            {groupedLeads.followUps.map((lead: Lead) => renderLeadRow(lead))}

                                            {/* Section 2: Reattempts Due Today */}
                                            {groupedLeads.reattempts.length > 0 && (
                                                <tr className="bg-amber-50/50 dark:bg-amber-950/20 font-bold text-amber-700 dark:text-amber-400 text-xs tracking-wider border-t">
                                                    <td colSpan={8} className="px-6 py-2.5">
                                                        🔁 REATTEMPTS DUE TODAY ({groupedLeads.reattempts.length})
                                                    </td>
                                                </tr>
                                            )}
                                            {groupedLeads.reattempts.map((lead: Lead) => renderLeadRow(lead))}

                                            {/* Section 3: New Leads Capacity */}
                                            {groupedLeads.newLeads.length > 0 && (
                                                <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-emerald-700 dark:text-emerald-400 text-xs tracking-wider border-t">
                                                    <td colSpan={8} className="px-6 py-2.5">
                                                        🆕 FRESH NEW LEADS ({groupedLeads.newLeads.length})
                                                    </td>
                                                </tr>
                                            )}
                                            {groupedLeads.newLeads.map((lead: Lead) => renderLeadRow(lead))}

                                            {groupedLeads.followUps.length === 0 && groupedLeads.reattempts.length === 0 && groupedLeads.newLeads.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                                        🎉 Clean desk! No active leads due today in your queue.
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ) : (
                                        leads.map((lead) => renderLeadRow(lead))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* table Pagination bar */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-150">
                                <span className="text-xs text-slate-500">
                                    Showing {(page - 1) * 15 + 1} - {Math.min(page * 15, totalLeads)} of {totalLeads} total leads
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-bold px-3">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                        disabled={page === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
