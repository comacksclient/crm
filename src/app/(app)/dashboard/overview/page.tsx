'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, PhoneCall, CalendarDays, Users, Target, AlertTriangle, Trophy, RefreshCw, CheckCircle2, Clock, XCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SdrStat {
    id: string;
    name: string;
    email: string;
    assignedLeads: number;
    callsToday: number;
    meetingsBooked: number;
    conversionRate: string;
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
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: number | string; sub?: string; color: string;
}) {
    return (
        <Card className={`p-5 border-l-4 ${color} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
                    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${color.replace('border-', 'bg-').replace('-600', '-100').replace('-500', '-100')} dark:bg-slate-800`}>
                    <Icon className={`h-5 w-5 ${color.replace('border-', 'text-')}`} />
                </div>
            </div>
        </Card>
    );
}

const meetingStatusStyles: Record<string, string> = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'Show Up': 'bg-green-100 text-green-700 border-green-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'No Show': 'bg-red-100 text-red-700 border-red-200',
    'Rescheduled': 'bg-amber-100 text-amber-700 border-amber-200',
    'Cancelled': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function OverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch('/api/admin/overview');
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
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 60 seconds
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-500 text-sm">Loading command center...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const conversionRate = data.totalLeads > 0
        ? ((data.bookedLeads / data.totalLeads) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-indigo-600" />
                            System Overview
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Live production metrics — auto-refreshing every 60s</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                            Last updated: {format(new Date(data.generatedAt), 'hh:mm:ss a')}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Top KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={PhoneCall} label="Active Leads" value={data.activeLeads.toLocaleString()} sub={`${data.totalLeads.toLocaleString()} total in system`} color="border-indigo-600" />
                    <KpiCard icon={TrendingUp} label="Calls Today" value={data.callsToday} sub="leads touched today" color="border-blue-500" />
                    <KpiCard icon={CalendarDays} label="Meetings Today" value={data.meetingsToday} sub={`${data.totalMeetings} total booked`} color="border-emerald-500" />
                    <KpiCard icon={Target} label="Conversion Rate" value={`${conversionRate}%`} sub={`${data.bookedLeads} leads converted`} color="border-violet-500" />
                </div>

                {/* Secondary KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={AlertTriangle} label="Overdue Leads" value={data.overdueLeads} sub="require immediate action" color="border-red-500" />
                    <KpiCard icon={CheckCircle2} label="Meetings Scheduled" value={data.scheduledCount} sub="upcoming appointments" color="border-teal-500" />
                    <KpiCard icon={XCircle} label="No Shows" value={data.noShowCount} sub="missed appointments" color="border-rose-500" />
                    <KpiCard icon={Users} label="Disqualified" value={data.disqualifiedLeads} sub="removed from pipeline" color="border-slate-400" />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* SDR Leaderboard — takes 2/3 width */}
                    <div className="xl:col-span-2">
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">SDR Leaderboard</h2>
                                <span className="ml-auto text-xs text-slate-400">Ranked by meetings booked</span>
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
                                                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{sdr.assignedLeads}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sdr.callsToday > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                                            {sdr.callsToday}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sdr.meetingsBooked > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                            {sdr.meetingsBooked}
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

                    {/* Recent Meetings — 1/3 width */}
                    <div>
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden h-full">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Meetings</h2>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.recentMeetings.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No meetings booked yet.</div>
                                ) : (
                                    data.recentMeetings.map((m) => (
                                        <div key={m.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate flex-1">
                                                    {m.clinic_name || 'Unnamed Clinic'}
                                                </p>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${meetingStatusStyles[m.meeting_status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {m.meeting_status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                📅 {m.meeting_date} at {m.meeting_time}
                                            </p>
                                            <p className="text-xs text-indigo-500 mt-0.5 truncate">
                                                Booked by: {m.booked_by}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Pipeline Status Bar */}
                <Card className="p-5 shadow-sm border-slate-200 dark:border-slate-800">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                        Lead Pipeline Status
                    </h2>
                    {data.totalLeads > 0 ? (
                        <div className="space-y-3">
                            {[
                                { label: 'Active', count: data.activeLeads, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
                                { label: 'Meeting Booked', count: data.bookedLeads, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                                { label: 'Disqualified', count: data.disqualifiedLeads, color: 'bg-slate-400', textColor: 'text-slate-500' },
                            ].map(({ label, count, color, textColor }) => {
                                const pct = data.totalLeads > 0 ? (count / data.totalLeads) * 100 : 0;
                                return (
                                    <div key={label} className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-32 shrink-0">{label}</span>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full ${color} transition-all duration-700`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${textColor} w-16 text-right`}>{count.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">No leads in the pipeline yet.</p>
                    )}
                </Card>

            </div>
        </div>
    );
}
