'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Loader2, ArrowRightCircle, CheckSquare, Square,
    ArrowLeft, UserCircle2, Zap, MapPin, Search, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
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
    city: string | null;
    createdAt: string;
}

interface Team {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string;
    team_id: string | null;
}

export default function AdminDelegationDesk() {
    const [leads, setLeads] = useState<UnassignedLead[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedManager, setSelectedManager] = useState<string>('');
    const [selectedSdr, setSelectedSdr] = useState<string>('');
    const [assigning, setAssigning] = useState(false);
    const [profile, setProfile] = useState<{ role: string, teamName: string } | null>(null);

    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [distributeCount, setDistributeCount] = useState('75');
    const [distributing, setDistributing] = useState(false);
    const [deleting, setDeleting] = useState(false);


    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('all');
    const [page, setPage] = useState(1);
    const rowsPerPage = 25;

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
        setLoadingUsers(true);

        try {
            const resLeads = await fetch('/api/leads/unassigned');
            if (resLeads.ok) {
                const data = await resLeads.json();
                setLeads(data.leads || []);
            } else if (resLeads.status === 403) {
                toast.error('Only Admins can delegate leads globally.');
            }

            const resTeams = await fetch('/api/teams/list');
            if (resTeams.ok) {
                const data = await resTeams.json();
                setTeams(data.teams || []);
            }

            const resUsers = await fetch('/api/users/list');
            if (resUsers.ok) {
                const data = await resUsers.json();
                setAllUsers(data.users || []);
            }
        } catch (e) {
            toast.error('Network error fetching pipeline data');
        } finally {
            setLoadingLeads(false);
            setLoadingTeams(false);
            setLoadingUsers(false);
        }
    };


    const cityGroups = useMemo(() => {
        const groups: Record<string, UnassignedLead[]> = {};
        leads.forEach(lead => {
            const cityKey = lead.city || lead.assignment_info || 'Unspecified';
            if (!groups[cityKey]) groups[cityKey] = [];
            groups[cityKey].push(lead);
        });
        return Object.entries(groups).map(([city, items]) => ({
            city,
            count: items.length,
            leadsList: items
        })).sort((a, b) => b.count - a.count);
    }, [leads]);


    const handleDelegateCity = async (cityLeads: UnassignedLead[], cityName: string) => {
        if (!selectedTeam) {
            toast.error("Please select a target Team from the delegation bar first!");
            return;
        }

        const leadIds = cityLeads.map(l => l.id);
        setAssigning(true);
        try {
            const res = await fetch('/api/leads/delegate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds,
                    teamId: selectedTeam,
                    managerId: selectedManager !== 'none' && selectedManager ? selectedManager : null,
                    sdrId: selectedSdr !== 'none' && selectedSdr ? selectedSdr : null
                })
            });

            if (res.ok) {
                toast.success(`Successfully pushed all ${leadIds.length} ${cityName} leads into the selected Team!`);
                setSelectedLeads(new Set());
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delegate city batch');
            }
        } catch (err) {
            toast.error('Network error delegating batch');
        } finally {
            setAssigning(false);
        }
    };

    // Table checkbox selection
    const toggleLeadSelection = (id: string) => {
        const _set = new Set(selectedLeads);
        if (_set.has(id)) _set.delete(id);
        else _set.add(id);
        setSelectedLeads(_set);
    };

    // Manual bulk selection
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
                    teamId: selectedTeam,
                    managerId: selectedManager !== 'none' ? selectedManager : null,
                    sdrId: selectedSdr !== 'none' ? selectedSdr : null
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Successfully pushed ${data.count} leads to the selected Team!`);
                setSelectedLeads(new Set());
                setSelectedManager('');
                setSelectedSdr('');
                fetchData();
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

    const handleDelete = async () => {
        if (selectedLeads.size === 0) {
            toast.error("Please select at least one lead to delete.");
            return;
        }

        if (!confirm(`CRITICAL WARNING: You are about to permanently delete ${selectedLeads.size} leads from the database. This action cannot be undone. Are you absolutely sure?`)) {
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch('/api/leads/purge', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: Array.from(selectedLeads) })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || `Successfully purged ${selectedLeads.size} leads.`);
                setSelectedLeads(new Set());
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete leads');
            }
        } catch (e) {
            toast.error('Network error during deletion');
        } finally {
            setDeleting(false);
        }
    };

    // Client-side filtering & sorting of unassigned leads
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const key = lead.city || lead.assignment_info || 'Unspecified';
            const matchesSearch = !searchQuery || [
                lead.lead_identity,
                lead.assignment_info,
                lead.city,
                lead.lead_type
            ].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCity = cityFilter === 'all' || key === cityFilter;

            return matchesSearch && matchesCity;
        });
    }, [leads, searchQuery, cityFilter]);

    // Pagination calculations
    const paginatedLeads = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredLeads.slice(start, start + rowsPerPage);
    }, [filteredLeads, page]);

    const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Banner */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                📊 Lead Distribution Center
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">Push uploaded raw leads downward into specific Corporate Teams.</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <UserCircle2 className="h-4 w-4 text-indigo-500" />
                                Admin: {profile?.role.toLowerCase() || '...'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* City Pool Batches Summary Cards */}
                {leads.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-indigo-600" /> Unassigned Lead Pools (Grouped by Region)
                        </h2>
                        {loadingLeads ? (
                            <div className="p-8 text-center bg-white rounded-xl border"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {cityGroups.map(({ city, count, leadsList }) => (
                                    <Card key={city} className="shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 truncate max-w-[150px]">{city}</h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">Unassigned Pool</p>
                                                </div>
                                                <Badge className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200 hover:bg-indigo-50 text-sm px-2.5 py-1">
                                                    {count} leads
                                                </Badge>
                                            </div>

                                            {/* Push Pool button */}
                                            <div className="pt-2 border-t flex flex-col gap-1.5">
                                                <Button
                                                    size="sm"
                                                    disabled={!selectedTeam || assigning}
                                                    onClick={() => handleDelegateCity(leadsList, city)}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold h-8 disabled:opacity-40"
                                                >
                                                    Push Entire Pool
                                                </Button>
                                                <p className="text-[10px] text-slate-400 text-center">Select target team below to unlock</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Delegation Global Toolbar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (selectedLeads.size === filteredLeads.length) setSelectedLeads(new Set());
                                else setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
                            }}
                            className="text-slate-700 bg-slate-50 border-slate-200 rounded-lg text-xs"
                        >
                            {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? 'Deselect All' : 'Select All Filtered'}
                        </Button>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                            {selectedLeads.size} leads selected
                        </span>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col gap-1">
                            <Label className="text-[9px] text-slate-400 font-bold uppercase ml-1">1. Target Team *</Label>
                            <Select value={selectedTeam} onValueChange={(val) => { setSelectedTeam(val); setSelectedManager(''); setSelectedSdr(''); }}>
                                <SelectTrigger className="w-[170px] bg-white rounded-lg h-9 font-medium">
                                    <SelectValue placeholder="Select Team..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingTeams ? (
                                        <SelectItem value="loading" disabled>Loading Teams...</SelectItem>
                                    ) : teams.length === 0 ? (
                                        <SelectItem value="none" disabled>No Teams Found</SelectItem>
                                    ) : (
                                        teams.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className="text-[9px] text-slate-400 font-bold uppercase ml-1">2. Target Manager</Label>
                            <Select value={selectedManager} onValueChange={setSelectedManager} disabled={!selectedTeam}>
                                <SelectTrigger className="w-[170px] bg-white rounded-lg h-9 font-medium disabled:opacity-50">
                                    <SelectValue placeholder="Skip / Team Default" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="italic text-slate-500">None / Skip</SelectItem>
                                    {allUsers
                                        .filter(u => u.team_id === selectedTeam && u.role === 'MANAGER')
                                        .map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className="text-[9px] text-slate-400 font-bold uppercase ml-1">3. Target SDR</Label>
                            <Select value={selectedSdr} onValueChange={setSelectedSdr} disabled={!selectedTeam}>
                                <SelectTrigger className="w-[170px] bg-white rounded-lg h-9 font-medium disabled:opacity-50">
                                    <SelectValue placeholder="Skip / Team Default" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="italic text-slate-500">None / Skip</SelectItem>
                                    {allUsers
                                        .filter(u => u.team_id === selectedTeam && u.role === 'SDR')
                                        .map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowDistributeModal(true)}
                                variant="outline"
                                disabled={!selectedTeam}
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 h-9 px-3 rounded-lg"
                                title="Turbo Distribute unassigned leads into this Team"
                            >
                                <Zap className="h-4 w-4 fill-amber-500" />
                            </Button>

                            <Button
                                onClick={handleDelegate}
                                disabled={assigning || selectedLeads.size === 0 || !selectedTeam}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px] shadow-sm h-9 rounded-lg text-xs font-bold"
                            >
                                {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Push Selected
                            </Button>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                disabled={deleting || selectedLeads.size === 0}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 h-9 px-3 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Individual Unassigned Leads Table list */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                placeholder="Search leads pool table..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="pl-9 h-9 bg-white"
                            />
                        </div>

                        <div className="w-48">
                            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
                                <SelectTrigger className="h-9 bg-white">
                                    <SelectValue placeholder="City Pool" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cities</SelectItem>
                                    {cityGroups.map(cg => <SelectItem key={cg.city} value={cg.city}>{cg.city}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                                ) : filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                                            🎉 No unassigned leads matching your filters are left!
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => toggleLeadSelection(lead.id)}
                                            className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.has(lead.id)}
                                                    readOnly
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[400px] truncate" title={lead.lead_identity}>
                                                {lead.lead_identity}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                                                    {lead.city || lead.assignment_info || 'N/A'}
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

                    {/* Pagination control footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                            <span className="text-xs text-slate-500">
                                Showing {(page - 1) * rowsPerPage + 1} - {Math.min(page * rowsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
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
                                    placeholder="e.g. 75"
                                />
                                <p className="text-[10px] text-slate-400">If the team has 5 SDRs and you enter 75, the top 375 leads will be assigned.</p>
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
