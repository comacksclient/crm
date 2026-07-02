'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AssignedLead {
    id: string;
    lead_identity: string;
    clinic_name: string | null;
    city: string | null;
    teamName: string;
    sdrName: string;
    assigned_date: string;
    assigned_by: string;
    status: string;
    touches: number;
    lead_type?: string;
    call_outcome?: string;
    next_action_type?: string;
    interest_level?: number | null;
}

export default function AssignedLeadsPage() {
    const [leads, setLeads] = useState<AssignedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    
    // Advanced Filtering States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSdrFilter, setSelectedSdrFilter] = useState('all');
    const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
    const [selectedCityFilter, setSelectedCityFilter] = useState('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
    const [selectedLeadTypeFilter, setSelectedLeadTypeFilter] = useState('all');
    const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState('all');
    const [selectedActionFilter, setSelectedActionFilter] = useState('all');
    const [sdrList, setSdrList] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/leads/assigned');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setSdrList(data.sdrs || []);
            } else if (res.status === 403) {
                toast.error('Manager privileges required to view assigned desk.');
            }
        } catch (e) {
            toast.error('Network error fetching pipeline data');
        } finally {
            setLoading(false);
        }
    };

    const toggleLeadSelection = (id: string) => {
        const _set = new Set(selectedLeads);
        if (_set.has(id)) _set.delete(id);
        else _set.add(id);
        setSelectedLeads(_set);
    };

    const selectAll = () => {
        if (selectedLeads.size === filteredLeads.length) {
            setSelectedLeads(new Set()); // Deselect all
        } else {
            setSelectedLeads(new Set(filteredLeads.map(l => l.id))); // Select all explicitly filtered leads
        }
    };

    // Extract unique filter dropdown values from leads data
    const uniqueSdrs = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.sdrName).filter((s): s is string => !!s))).sort();
    }, [leads]);

    const uniqueTeams = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.teamName).filter((t): t is string => !!t))).sort();
    }, [leads]);

    const uniqueCities = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.city).filter((c): c is string => !!c))).sort();
    }, [leads]);

    const uniqueLeadTypes = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.lead_type).filter((t): t is string => !!t))).sort();
    }, [leads]);

    const uniqueOutcomes = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.call_outcome).filter((o): o is string => !!o))).sort();
    }, [leads]);

    const uniqueActions = useMemo(() => {
        return Array.from(new Set(leads.map(lead => lead.next_action_type).filter((a): a is string => !!a))).sort();
    }, [leads]);

    // Client-side dynamic search & filtering
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSdr = selectedSdrFilter === 'all' || lead.sdrName === selectedSdrFilter;
            const matchesTeam = selectedTeamFilter === 'all' || lead.teamName === selectedTeamFilter;
            const matchesCity = selectedCityFilter === 'all' || lead.city === selectedCityFilter;
            const matchesStatus = selectedStatusFilter === 'all' || lead.status === selectedStatusFilter;
            const matchesLeadType = selectedLeadTypeFilter === 'all' || lead.lead_type === selectedLeadTypeFilter;
            const matchesOutcome = selectedOutcomeFilter === 'all' || lead.call_outcome === selectedOutcomeFilter;
            const matchesAction = selectedActionFilter === 'all' || lead.next_action_type === selectedActionFilter;
            
            const matchesSearch = !searchQuery || [
                lead.lead_identity,
                lead.city,
                lead.teamName,
                lead.sdrName,
                lead.status,
                lead.lead_type,
                lead.call_outcome,
                lead.next_action_type
            ].some(val => val?.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesSdr && matchesTeam && matchesCity && matchesStatus && matchesLeadType && matchesOutcome && matchesAction && matchesSearch;
        });
    }, [leads, searchQuery, selectedSdrFilter, selectedTeamFilter, selectedCityFilter, selectedStatusFilter, selectedLeadTypeFilter, selectedOutcomeFilter, selectedActionFilter]);

    const handleDelete = async () => {
        if (selectedLeads.size === 0) {
            toast.error("Please select at least one lead to revoke and delete.");
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete ${selectedLeads.size} leads from the database? This cannot be undone.`)) {
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
                toast.success(data.message);
                setSelectedLeads(new Set());
                fetchData(); // Refresh queue
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete leads');
            }
        } catch (e) {
            toast.error('Network error during bulk deletion');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-600" />
                            Master Lead Registry
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Global view of strictly assigned operational active and disqualified leads.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleDelete}
                            disabled={deleting || selectedLeads.size === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${selectedLeads.size > 0 ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Revoke & Delete Selected
                        </Button>
                    </div>
                </div>

                {/* Search & Advanced Filters Bar */}
                {!loading && (
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Text Search */}
                            <div className="flex-1 min-w-[240px] relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <Input
                                    placeholder="Search clinic, phone, city, team, SDR..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-slate-50 rounded-xl pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* SDR filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedSdrFilter} onValueChange={setSelectedSdrFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All SDRs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All SDRs</SelectItem>
                                        {Array.from(new Set(sdrList.length > 0 ? sdrList : uniqueSdrs)).map(sdr => (
                                            <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Team filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Teams" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Teams</SelectItem>
                                        {uniqueTeams.map(team => (
                                            <SelectItem key={team} value={team}>{team}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Region/City filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Regions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Regions</SelectItem>
                                        {uniqueCities.map(city => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
                                        <SelectItem value="Disqualified">Disqualified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lead Type filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedLeadTypeFilter} onValueChange={setSelectedLeadTypeFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Lead Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Lead Types</SelectItem>
                                        {uniqueLeadTypes.map(lt => (
                                            <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Call Outcome filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedOutcomeFilter} onValueChange={setSelectedOutcomeFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Outcomes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Outcomes</SelectItem>
                                        {uniqueOutcomes.map(out => (
                                            <SelectItem key={out} value={out}>{out}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Next Action filter */}
                            <div className="w-40 shrink-0">
                                <Select value={selectedActionFilter} onValueChange={setSelectedActionFilter}>
                                    <SelectTrigger className="bg-slate-50 rounded-xl h-9 text-xs">
                                        <SelectValue placeholder="All Actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        {uniqueActions.map(act => (
                                            <SelectItem key={act} value={act}>{act}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reset Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedSdrFilter('all');
                                    setSelectedTeamFilter('all');
                                    setSelectedCityFilter('all');
                                    setSelectedStatusFilter('all');
                                    setSelectedLeadTypeFilter('all');
                                    setSelectedOutcomeFilter('all');
                                    setSelectedActionFilter('all');
                                }}
                                className="text-xs h-9 rounded-xl px-4"
                            >
                                Reset
                            </Button>
                        </div>
                    </Card>
                )}

                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <button onClick={selectAll} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                            {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tracking {filteredLeads.length} assigned leads</span>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-[60px] text-center">Select</th>
                                    <th className="px-6 py-4">Clinic / Lead Identity</th>
                                    <th className="px-6 py-4">Corporate Team</th>
                                    <th className="px-6 py-4 text-indigo-700 dark:text-indigo-300">Assigned SDR</th>
                                    <th className="px-6 py-4">Assigned On</th>
                                    <th className="px-6 py-4 text-center">Status / Touches</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Scanning mapping infrastructure...
                                        </td>
                                    </tr>
                                ) : filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No assigned leads found matching your filter selection.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <tr key={lead.id}
                                            onClick={() => toggleLeadSelection(lead.id)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-1 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.has(lead.id)}
                                                    onChange={() => { }} // Controlled via row click
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 pointer-events-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.lead_identity}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{lead.city || 'No City'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium font-mono text-slate-600 dark:text-slate-400">
                                                    {lead.teamName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-indigo-700 dark:text-indigo-300">
                                                {lead.sdrName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {format(new Date(lead.assigned_date), 'MMM dd, yyyy')}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-medium">
                                                    By {lead.assigned_by}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.status === 'Disqualified' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : lead.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-slate-100 text-slate-700'}`}>
                                                        {lead.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1.5 font-semibold">
                                                    {lead.touches} / 5 Touches
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

