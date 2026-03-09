'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Users,
    UserCircle2,
    ShieldCheck,
    Loader2,
    PhoneCall,
    AlertCircle,
    CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
}

interface TeamData {
    hasTeam: boolean;
    message?: string;
    team?: {
        id: string;
        name: string;
        createdAt: string;
    };
    managers?: TeamMember[];
    sdrs?: TeamMember[];
    currentUser?: {
        id: string;
        role: string;
    };
}

export default function MyTeamPage() {
    const [data, setData] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        try {
            const res = await fetch('/api/teams/me');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error("Failed to fetch team data");
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveTeam = async () => {
        if (!confirm("Are you sure you want to leave this team? Any active leads currently assigned to you will be released back to the team pool.")) return;

        setActionLoading('leave');
        try {
            const res = await fetch('/api/teams/leave', { method: 'POST' });
            if (res.ok) {
                toast.success('Successfully left the team.');
                fetchTeamData(); // Refresh to show unassigned state
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to leave team.');
            }
        } catch (e) {
            toast.error('Network error while leaving team.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (userId: string, name: string | null) => {
        if (!confirm(`Are you sure you want to remove ${name || 'this user'} from the team? Their active leads will be released back to the team pool.`)) return;

        setActionLoading(userId);
        try {
            const res = await fetch('/api/teams/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });

            if (res.ok) {
                toast.success('Member removed successfully.');
                fetchTeamData(); // Refresh roster
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to remove member.');
            }
        } catch (e) {
            toast.error('Network error during member removal.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-medium">Loading your team roster...</p>
            </div>
        );
    }

    if (!data?.hasTeam) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
                <Card className="max-w-md w-full border-red-100 dark:border-red-900/50 shadow-sm">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-red-100 dark:bg-red-900/30 p-3 rounded-full w-fit mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
                        </div>
                        <CardTitle className="text-xl">Unassigned Agent</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-slate-600 dark:text-slate-400">
                        <p>{data?.message || "You are not currently assigned to any Corporate Team. Please request a secure invite link from your Manager or Administrator to join the grid."}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header Profile */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>

                    <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-600/20">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                                    {data.team?.name}
                                </h1>
                                <p className="text-slate-500 font-medium flex items-center gap-2 mb-3">
                                    <CalendarDays className="h-4 w-4" />
                                    Formed {data.team?.createdAt ? format(new Date(data.team.createdAt), 'MMMM yyyy') : 'Recently'}
                                </p>
                                <button
                                    onClick={handleLeaveTeam}
                                    disabled={actionLoading === 'leave'}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center gap-2 w-fit"
                                >
                                    {actionLoading === 'leave' && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Leave Team
                                </button>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
                            <div className="text-center">
                                <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{data.managers?.length || 0}</div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managers</div>
                            </div>
                            <div className="w-px bg-slate-200 dark:bg-slate-700 h-10 self-center"></div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{data.sdrs?.length || 0}</div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active SDRs</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Management Column */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Command Structure
                        </h2>

                        {data.managers?.length === 0 ? (
                            <p className="text-sm text-slate-500 px-2 italic">No managers assigned to this team.</p>
                        ) : (
                            <div className="grid gap-3">
                                {data.managers?.map(manager => (
                                    <Card key={manager.id} className="border-emerald-100 dark:border-emerald-900/30 shadow-sm bg-white dark:bg-slate-900">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                                                <UserCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {manager.name || 'Anonymous User'}
                                                    {manager.id === data.currentUser?.id && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">YOU</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">{manager.email}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{manager.role}</Badge>
                                                {data.currentUser?.role === 'ADMIN' && manager.id !== data.currentUser?.id && (
                                                    <button
                                                        onClick={() => handleRemoveMember(manager.id, manager.name)}
                                                        disabled={actionLoading === manager.id}
                                                        className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {actionLoading === manager.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SDR Column */}
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-indigo-500" />
                            Dialing Floor
                        </h2>

                        {data.sdrs?.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500">No Sales Development Reps have joined this team yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.sdrs?.map(sdr => (
                                    <Card
                                        key={sdr.id}
                                        className={`transition-all duration-200 ${sdr.id === data.currentUser?.id
                                            ? 'border-indigo-300 dark:border-indigo-700 shadow-md bg-indigo-50/30 dark:bg-indigo-900/10'
                                            : 'border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900'
                                            }`}
                                    >
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${sdr.id === data.currentUser?.id ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
                                                }`}>
                                                <UserCircle2 className={`h-6 w-6 ${sdr.id === data.currentUser?.id ? 'text-white' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-900 dark:text-white truncate text-base mb-0.5 flex items-center gap-2">
                                                    {sdr.name || sdr.email.split('@')[0]}
                                                    {sdr.id === data.currentUser?.id && (
                                                        <Badge className="bg-indigo-600 hover:bg-indigo-600 text-[10px] h-5 px-1.5">YOU</Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mb-2">{sdr.email}</p>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${sdr.id === data.currentUser?.id ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                        SDR Operator
                                                    </div>

                                                    {(data.currentUser?.role === 'MANAGER' || data.currentUser?.role === 'ADMIN') && sdr.id !== data.currentUser?.id && (
                                                        <button
                                                            onClick={() => handleRemoveMember(sdr.id, sdr.name)}
                                                            disabled={actionLoading === sdr.id}
                                                            className="text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            {actionLoading === sdr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
