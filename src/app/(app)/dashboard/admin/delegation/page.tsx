'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowRightCircle, CheckSquare, Square, ArrowLeft, UserCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

interface UnassignedLead {
    id: string;
    lead_identity: string;
    assignment_info: string;
    lead_type: string;
    createdAt: string;
}

interface Team {
    id: string;
    name: string;
}

export default function AdminDelegationDesk() {
    const [leads, setLeads] = useState<UnassignedLead[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(true);

    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [assigning, setAssigning] = useState(false);
    const [profile, setProfile] = useState<{ role: string, teamName: string } | null>(null);

    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [distributeCount, setDistributeCount] = useState('100');
    const [distributing, setDistributing] = useState(false);

    useEffect(() => {
        fetchData();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            setProfile({ role: data.user.role, teamName: data.user.teamName });
        }
    };

    const fetchData = async () => {
        setLoadingLeads(true);
        setLoadingTeams(true);

        try {
            // Fetch raw uncharted leads
            const resLeads = await fetch('/api/leads/unassigned');
            if (resLeads.ok) {
                const data = await resLeads.json();
                setLeads(data.leads || []);
            } else if (resLeads.status === 403) {
                toast.error('Only Admins can delegate leads globally.');
            }

            // Fetch available teams
            const resTeams = await fetch('/api/teams/list');
            if (resTeams.ok) {
                const data = await resTeams.json();
                setTeams(data.teams || []);
            }
        } catch (e) {
            toast.error('Network error fetching pipeline data');
        } finally {
            setLoadingLeads(false);
            setLoadingTeams(false);
        }
    };

    const toggleLeadSelection = (id: string) => {
        const _set = new Set(selectedLeads);
        if (_set.has(id)) _set.delete(id);
        else _set.add(id);
        setSelectedLeads(_set);
    };

    const selectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set()); // Deselect all
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id))); // Select all
        }
    };

    const handleDelegate = async () => {
        if (selectedLeads.size === 0) {
            toast.error("Please select at least one lead to delegate.");
            return;
        }
        if (!selectedTeam) {
            toast.error("Please select a target Team from the dropdown.");
            return;
        }

        setAssigning(true);
        try {
            const res = await fetch('/api/leads/delegate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds: Array.from(selectedLeads),
                    teamId: selectedTeam
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Successfully pushed ${data.count} leads to the selected Team!`);
                setSelectedLeads(new Set());
                fetchData(); // Refresh remaining unassigned queue
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delegate leads');
            }
        } catch (e) {
            toast.error('Network error during bulk delegation');
        } finally {
            setAssigning(false);
        }
    };

    const handleDistribute = async () => {
        if (!selectedTeam) {
            toast.error("Please select a Target Team first to distribute leads into.");
            return;
        }

        const count = parseInt(distributeCount);
        if (isNaN(count) || count <= 0) {
            toast.error("Please enter a valid number of leads per SDR.");
            return;
        }

        setDistributing(true);
        try {
            const res = await fetch('/api/leads/distribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perSdrCount: count, teamId: selectedTeam })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message);
                setShowDistributeModal(false);
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to distribute leads');
            }
        } catch (e) {
            toast.error('Network error during lead distribution');
        } finally {
            setDistributing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <ArrowRightCircle className="h-6 w-6 text-indigo-600" />
                            Admin Delegation Desk
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Push uploaded raw leads downward into specific Corporate Teams.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <UserCircle2 className="h-4 w-4 text-indigo-500" />
                            Current Team: {profile?.teamName || '...'}
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 border-indigo-200 capitalize">{profile?.role.toLowerCase() || '...'}</Badge>
                        </div>
                    </div>
                </div>

                {/* Delegation Control Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={selectAll} className="text-slate-700 bg-slate-50">
                            {selectedLeads.size === leads.length && leads.length > 0 ? (
                                <><CheckSquare className="h-4 w-4 mr-2" /> Deselect All</>
                            ) : (
                                <><Square className="h-4 w-4 mr-2" /> Select All Leads</>
                            )}
                        </Button>
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md">
                            {selectedLeads.size} leads selected
                        </span>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-[250px] bg-white dark:bg-slate-900 font-medium">
                                <SelectValue placeholder="Select Target Team..." />
                            </SelectTrigger>
                            <SelectContent>
                                {loadingTeams ? (
                                    <SelectItem value="loading" disabled>Loading Teams...</SelectItem>
                                ) : teams.length === 0 ? (
                                    <SelectItem value="none" disabled>No Teams Formed Yet</SelectItem>
                                ) : (
                                    teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={() => setShowDistributeModal(true)}
                            variant="outline"
                            className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 gap-2"
                        >
                            <Zap className="h-4 w-4 fill-amber-500" />
                            Turbo Distribute
                        </Button>

                        <Button
                            onClick={handleDelegate}
                            disabled={assigning || selectedLeads.size === 0 || !selectedTeam}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] shadow-sm"
                        >
                            {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Push to Team
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-[60px] text-center">Select</th>
                                    <th className="px-6 py-4">Clinic / Lead Identity</th>
                                    <th className="px-6 py-4">Original CSV Data (City/Region)</th>
                                    <th className="px-6 py-4 text-center">Lead Source / Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {loadingLeads ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Scanning global pool...
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-lg">
                                            🎉 All leads successfully delegated!
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => toggleLeadSelection(lead.id)}
                                            className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.has(lead.id)}
                                                    readOnly
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 pointer-events-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 max-w-[400px] truncate" title={lead.lead_identity}>
                                                {lead.lead_identity}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                                    {lead.assignment_info || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                                                {lead.lead_type || 'New'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Distribute Modal */}
            {showDistributeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                                Turbo Distribute Leads
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Automatically pull unassigned leads matching team <b>{teams.find(t => t.id === selectedTeam)?.name || 'Unknown'}</b> and distribute them evenly across its SDRs.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="dist-count">Leads per SDR</Label>
                                <Input
                                    id="dist-count"
                                    type="number"
                                    value={distributeCount}
                                    onChange={(e) => setDistributeCount(e.target.value)}
                                    placeholder="e.g. 100"
                                />
                                <p className="text-[10px] text-slate-400">If the team has 5 SDRs and you enter 100, the top 500 leads will be assigned.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowDistributeModal(false)} disabled={distributing}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDistribute}
                                disabled={distributing || !distributeCount || !selectedTeam}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {distributing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                Distribute Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
