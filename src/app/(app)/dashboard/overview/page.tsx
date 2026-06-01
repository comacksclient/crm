'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, TrendingUp, PhoneCall, CalendarDays, Users, Target,
    AlertTriangle, Trophy, RefreshCw, CheckCircle2, Clock, XCircle,
    BarChart3, Activity, PhoneOff, AlertCircle, Percent, ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SDR {
    id: string;
    name: string | null;
    email: string;
}

interface SdrStat {
    id: string;
    name: string;
    email: string;
    assignedLeads: number;
    callsToday: number;
    meetingsBooked: number;
    meetingsBookedToday: number;
    conversionRate: string;
    status: string;
}

interface RecentMeeting {
    id: string;
    clinic_name: string | null;
    phone_number: string | null;
    meeting_date: string;
    meeting_time: string;
    meeting_status: string;
    booked_by: string;
    createdAt: string;
}

interface EodMetrics {
    noPickup: number;
    invalidNum: number;
    conversationHappened: number;
    requestedCallback: number;
    interested: number;
    notInterested: number;
    meetingBooked: number;
    followUpCreated: number;
}

interface WeeklyMetrics {
    followUp: { created: number; completed: number; pending: number; overdue: number };
    connection: { connected: number; noPickup: number; invalidNum: number; callbackReq: number; notInterested: number };
    conversion: { interestedLeads: number; meetingsBooked: number; qualifiedLeads: number; conversions: number };
    activity: { totalCalls: number; freshCalls: number; followUpCalls: number; retryCalls: number; avgCallsPerDay: string };
    efficiency: { connectRate: string; interestRate: string; bookingRate: string };
}

interface OverviewData {
    totalLeads: number;
    activeLeads: number;
    bookedLeads: number;
    disqualifiedLeads: number;
    overdueLeads: number;
    callsToday: number;
    meetingsToday: number;
    totalMeetings: number;
    noShowCount: number;
    scheduledCount: number;
    sdrLeaderboard: SdrStat[];
    recentMeetings: RecentMeeting[];
    generatedAt: string;

    // Daily stats
    dailyCalls: number;
    dailyConnected: number;
    dailyNoPickup: number;
    dailyInvalid: number;
    dailyCallback: number;
    dailyMeetingsBooked: number;
    dailyNotInterested: number;
    dailyFollowUpCreated: number;
    dailyConnectRate: string;
    dailyInterestRate: string;
    dailyMeetingBookingRate: string;

    // Weekly stats
    weeklyCalls: number;
    weeklyConnected: number;
    weeklyNoPickup: number;
    weeklyInvalid: number;
    weeklyCallback: number;
    weeklyMeetingsBooked: number;
    weeklyNotInterested: number;
    weeklyFollowUpCreated: number;
    weeklyConnectRate: string;
    weeklyInterestRate: string;
    weeklyMeetingBookingRate: string;

    sdrs: SDR[];
    eod?: EodMetrics;
    weekly?: WeeklyMetrics;
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: number | string; sub?: string; color: string;
}) {
    return (
        <Card className={`p-5 border-l-4 ${color} shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
                    {sub && <p className="text-xs text-slate-500 mt-1.5 font-medium">{sub}</p>}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-355" />
                </div>
            </div>
        </Card>
    );
}

const meetingStatusStyles: Record<string, string> = {
    'Scheduled': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Show Up': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-250',
    'No Show': 'bg-rose-50 text-rose-700 border-rose-200',
    'Rescheduled': 'bg-amber-50 text-amber-700 border-amber-200',
    'Cancelled': 'bg-slate-50 text-slate-600 border-slate-250',
};

export default function OverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statsPeriod, setStatsPeriod] = useState<'today' | 'weekly'>('today');
    const [selectedSdr, setSelectedSdr] = useState<string>('all');

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch(`/api/admin/overview?sdrId=${selectedSdr}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else if (res.status === 403) {
                toast.error('Access restricted. Admins and Managers only.');
            } else {
                toast.error('Failed to load overview data.');
            }
        } catch {
            toast.error('Network error while loading overview.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedSdr]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-650 mx-auto" />
                    <p className="text-slate-500 text-xs font-semibold">Loading command center dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const conversionRate = data.totalLeads > 0
        ? ((data.bookedLeads / data.totalLeads) * 100).toFixed(1)
        : '0.0';

    // Toggle logic helper
    const activeStats = statsPeriod === 'today' ? {
        calls: data.dailyCalls,
        connected: data.dailyConnected,
        noPickup: data.dailyNoPickup,
        invalid: data.dailyInvalid,
        callback: data.dailyCallback,
        meetingsBooked: data.dailyMeetingsBooked,
        connectRate: data.dailyConnectRate,
        interestRate: data.dailyInterestRate,
        bookingRate: data.dailyMeetingBookingRate
    } : {
        calls: data.weeklyCalls,
        connected: data.weeklyConnected,
        noPickup: data.weeklyNoPickup,
        invalid: data.weeklyInvalid,
        callback: data.weeklyCallback,
        meetingsBooked: data.weeklyMeetingsBooked,
        connectRate: data.weeklyConnectRate,
        interestRate: data.weeklyInterestRate,
        bookingRate: data.weeklyMeetingBookingRate
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Dashboard Title Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <BarChart3 className="h-6 w-6 text-indigo-650" />
                            System Overview Panel
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Real-time performance indicators and operational metrics.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {data.sdrs && data.sdrs.length > 0 && (
                            <Select value={selectedSdr} onValueChange={setSelectedSdr}>
                                <SelectTrigger className="w-[200px] h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="All SDRs Combined" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All SDRs Combined</SelectItem>
                                    {data.sdrs.map((sdr) => (
                                        <SelectItem key={sdr.id} value={sdr.id}>
                                            {sdr.name || sdr.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <span className="text-[10px] font-bold text-slate-400">
                            UPDATED: {format(new Date(data.generatedAt), 'hh:mm:ss a')}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="gap-2 rounded-xl text-xs"
                        >
                            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                            Force Refresh
                        </Button>
                    </div>
                </div>

                {/* Primary KPI Indicators Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={PhoneCall} label="Active Calling Pool" value={data.activeLeads.toLocaleString()} sub={`${data.totalLeads.toLocaleString()} total ingested leads`} color="border-indigo-600" />
                    <KpiCard icon={TrendingUp} label="Daily Interaction Count" value={data.callsToday} sub="calls logged today" color="border-blue-500" />
                    <KpiCard icon={CalendarDays} label="Meetings Booked Today" value={data.meetingsToday} sub={`${data.totalMeetings} meetings scheduled`} color="border-emerald-500" />
                    <KpiCard icon={Target} label="Global Conversion Rate" value={`${conversionRate}%`} sub={`${data.bookedLeads} converted leads`} color="border-violet-500" />
                </div>

                {/* Secondary KPI Status Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={ShieldAlert} label="Overdue Follow-ups" value={data.overdueLeads} sub="requiring immediate callbacks" color="border-rose-500" />
                    <KpiCard icon={CheckCircle2} label="Upcoming Meetings" value={data.scheduledCount} sub="scheduled pipelines" color="border-teal-500" />
                    <KpiCard icon={XCircle} label="No-Show Meetings" value={data.noShowCount} sub="failed appointments" color="border-amber-500" />
                    <KpiCard icon={Users} label="Disqualified Leads" value={data.disqualifiedLeads} sub="filtered out of workflow" color="border-slate-400" />
                </div>

                {/* Daily & Weekly Performance Insights (Central Panel) */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 p-5 border-b flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-extrabold text-slate-900">Operational Performance Insights</CardTitle>
                            <CardDescription className="text-xs">Historical connection rates and outcomes analysis.</CardDescription>
                        </div>
                        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border">
                            <button
                                onClick={() => setStatsPeriod('today')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statsPeriod === 'today' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
                            >
                                Today's Activity
                            </button>
                            <button
                                onClick={() => setStatsPeriod('weekly')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statsPeriod === 'weekly' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500'}`}
                            >
                                Past 7 Days
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {statsPeriod === 'today' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                                {/* EOD Calculations Grid */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <TrendingUp className="h-4 w-4 text-indigo-600" /> End of Day (EOD) Calculations
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Conversation Happened</span>
                                            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{data.eod?.conversationHappened || 0}</span>
                                            <span className="text-[9px] text-slate-500">successful pick-ups</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Meetings Booked</span>
                                            <span className="text-xl font-extrabold text-emerald-600 mt-1">{data.eod?.meetingBooked || 0}</span>
                                            <span className="text-[9px] text-slate-500">scheduled meetings</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Follow-up Created</span>
                                            <span className="text-xl font-extrabold text-blue-600 mt-1">{data.eod?.followUpCreated || 0}</span>
                                            <span className="text-[9px] text-slate-500">callbacks scheduled</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Requested Callback</span>
                                            <span className="text-xl font-extrabold text-amber-600 mt-1">{data.eod?.requestedCallback || 0}</span>
                                            <span className="text-[9px] text-slate-500">callbacks requested</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">No Pickup</span>
                                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">{data.eod?.noPickup || 0}</span>
                                            <span className="text-[9px] text-slate-500">calls not picked</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Invalid Num</span>
                                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">{data.eod?.invalidNum || 0}</span>
                                            <span className="text-[9px] text-slate-500">rejected calls</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Interested</span>
                                            <span className="text-lg font-bold text-emerald-600 mt-1">{data.eod?.interested || 0}</span>
                                            <span className="text-[9px] text-slate-500">level &gt;= 3 conversion</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Not Interested</span>
                                            <span className="text-lg font-bold text-rose-600 mt-1">{data.eod?.notInterested || 0}</span>
                                            <span className="text-[9px] text-slate-500">level &lt; 3 conversion</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Efficiency Ratings */}
                                <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6">
                                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Percent className="h-4 w-4 text-blue-600" /> Daily Performance Ratings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Connect Rate</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Pickups vs dials</p>
                                            </div>
                                            <span className="text-lg font-extrabold text-indigo-650">{activeStats.connectRate}%</span>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Interest Conversion</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">High interest vs pickups</p>
                                            </div>
                                            <span className="text-lg font-extrabold text-blue-600">{activeStats.interestRate}%</span>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Meeting Booking Rate</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Bookings vs pickups</p>
                                            </div>
                                            <span className="text-lg font-extrabold text-emerald-600">{activeStats.bookingRate}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Connection & Conversion Metrics */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <PhoneCall className="h-4 w-4 text-indigo-600" /> Connection & Conversion (Weekly)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connection Metrics</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Connected Dials</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.connection?.connected || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">No Pickup Dials</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.connection?.noPickup || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Invalid Num</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.connection?.invalidNum || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Callback Requested</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.connection?.callbackReq || 0}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversion Metrics</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 border rounded-xl bg-indigo-50/10 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[9px] font-semibold text-indigo-750 dark:text-indigo-400">Interested Leads</p>
                                                        <p className="text-base font-extrabold text-indigo-900 dark:text-indigo-200 mt-0.5">{data.weekly?.conversion?.interestedLeads || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-emerald-50/10 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
                                                        <p className="text-[9px] font-semibold text-emerald-750 dark:text-emerald-400">Meetings Booked</p>
                                                        <p className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">{data.weekly?.conversion?.meetingsBooked || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Qualified Leads</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.conversion?.qualifiedLeads || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Total Conversions</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.conversion?.conversions || 0}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Follow-ups & Activity Metrics */}
                                    <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6">
                                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <CalendarDays className="h-4 w-4 text-indigo-650" /> Follow-ups & Activity (Weekly)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow-up Metrics</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Follow-ups Created</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.followUp?.created || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Follow-ups Completed</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.followUp?.completed || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Pending Follow-ups</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.followUp?.pending || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-rose-50/10 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30">
                                                        <p className="text-[9px] font-semibold text-rose-750 dark:text-rose-455">Overdue Follow-ups</p>
                                                        <p className="text-base font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">{data.weekly?.followUp?.overdue || 0}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity Metrics</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Total Dials</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.activity?.totalCalls || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Fresh Leads Dialed</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.activity?.freshCalls || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Avg Calls / Day</p>
                                                        <p className="text-base font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{data.weekly?.activity?.avgCallsPerDay || 0}</p>
                                                    </div>
                                                    <div className="p-2.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[9px] font-semibold text-slate-400">Retry Dials</p>
                                                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.weekly?.activity?.retryCalls || 0}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Efficiency & Accuracy Ratings */}
                                    <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6">
                                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Percent className="h-4 w-4 text-indigo-650" /> Weekly Efficiency Ratings
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="p-3.5 bg-indigo-50/10 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-indigo-750 dark:text-indigo-400 uppercase tracking-wide">Connect Rate</p>
                                                    <p className="text-[9px] text-indigo-600/85 mt-0.5">Pickups vs outbound dials</p>
                                                </div>
                                                <span className="text-lg font-extrabold text-indigo-900 dark:text-indigo-200">{data.weekly?.efficiency?.connectRate || '0.0'}%</span>
                                            </div>

                                            <div className="p-3.5 bg-blue-50/10 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-blue-750 dark:text-blue-400 uppercase tracking-wide">Interest Conversion</p>
                                                    <p className="text-[9px] text-blue-600/85 mt-0.5">High interest vs pickups</p>
                                                </div>
                                                <span className="text-lg font-extrabold text-blue-900 dark:text-blue-200">{data.weekly?.efficiency?.interestRate || '0.0'}%</span>
                                            </div>

                                            <div className="p-3.5 bg-emerald-50/10 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-750 dark:text-emerald-400 uppercase tracking-wide">Booking Rate</p>
                                                    <p className="text-[9px] text-emerald-600/85 mt-0.5">Meetings booked vs pickups</p>
                                                </div>
                                                <span className="text-lg font-extrabold text-emerald-900 dark:text-emerald-200">{data.weekly?.efficiency?.bookingRate || '0.0'}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* SDR Leaderboard */}
                    <div className="xl:col-span-2">
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">SDR Live Productivity Leaderboard</h2>
                                <span className="ml-auto text-xs text-slate-400">Ranked by calls today</span>
                            </div>
                            {data.sdrLeaderboard.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-sm">
                                    No SDRs found in your scope.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3 text-left w-8">#</th>
                                                <th className="px-5 py-3 text-left">SDR Name</th>
                                                <th className="px-5 py-3 text-center">Status</th>
                                                <th className="px-5 py-3 text-center">Assigned Leads</th>
                                                <th className="px-5 py-3 text-center">Calls Today</th>
                                                <th className="px-5 py-3 text-center">Meetings Booked</th>
                                                <th className="px-5 py-3 text-center">Conv. Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {data.sdrLeaderboard.map((sdr, idx) => (
                                                <tr key={sdr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        {idx === 0 ? (
                                                            <span className="text-lg">🥇</span>
                                                        ) : idx === 1 ? (
                                                            <span className="text-lg">🥈</span>
                                                        ) : idx === 2 ? (
                                                            <span className="text-lg">🥉</span>
                                                        ) : (
                                                            <span className="text-slate-400 font-semibold">{idx + 1}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{sdr.name}</p>
                                                        <p className="text-xs text-slate-400">{sdr.email}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        {sdr.status === 'LIVE' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800/40">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                                                Offline
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{sdr.assignedLeads}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sdr.callsToday > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                                            {sdr.callsToday}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sdr.meetingsBookedToday > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                            {sdr.meetingsBookedToday}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">{sdr.conversionRate}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Recent Meetings */}
                    <div>
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden h-full rounded-2xl">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Meetings Booked</h2>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.recentMeetings.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs">No meetings booked yet.</div>
                                ) : (
                                    data.recentMeetings.map((m) => (
                                        <div key={m.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <p className="font-semibold text-xs text-slate-950 dark:text-slate-100 truncate flex-1">
                                                    {m.clinic_name || 'Unnamed Clinic'}
                                                </p>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${meetingStatusStyles[m.meeting_status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {m.meeting_status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500">
                                                📅 {m.meeting_date} at {m.meeting_time}
                                            </p>
                                            <p className="text-[10px] text-indigo-650 mt-0.5 truncate font-medium">
                                                Booked by: {m.booked_by}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Pipeline Progress Stats */}
                <Card className="p-5 shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                        Lead Pipeline Status Ratio
                    </h2>
                    {data.totalLeads > 0 ? (
                        <div className="space-y-3">
                            {[
                                { label: 'Active Pipeline Pool', count: data.activeLeads, color: 'bg-indigo-600', textColor: 'text-indigo-600' },
                                { label: 'Meetings Booked (Converted)', count: data.bookedLeads, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                                { label: 'Disqualified Leads', count: data.disqualifiedLeads, color: 'bg-slate-400', textColor: 'text-slate-500' },
                            ].map(({ label, count, color, textColor }) => {
                                const pct = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
                                return (
                                    <div key={label} className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-44 shrink-0">{label}</span>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-2.5 rounded-full ${color} transition-all duration-700`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${textColor} w-16 text-right`}>{count.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-xs">No leads in the pipeline yet.</p>
                    )}
                </Card>

            </div>
        </div>
    );
}
