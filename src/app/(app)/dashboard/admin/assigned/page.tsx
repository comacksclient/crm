'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';

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
}

export default function AssignedLeadsPage() {
    const [leads, setLeads] = useState<AssignedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/leads/assigned');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
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
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set()); // Deselect all
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id))); // Select all
        }
    };

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
                <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-600" />
                            Assigned Leads Matrix
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Global view of strictly assigned operational active and disqualified leads.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleDelete}
                            disabled={deleting || selectedLeads.size === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedLeads.size > 0 ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-800/50' : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'}`}
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Revoke & Delete Selected
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-2">
                    <button onClick={selectAll} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                        {selectedLeads.size === leads.length && leads.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-slate-500 font-medium">Tracking {leads.length} explicitly assigned leads</span>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-[60px] text-center">Select</th>
                                    <th className="px-6 py-4">Clinic / Lead Identity</th>
                                    <th className="px-6 py-4">Corporate Team</th>
                                    <th className="px-6 py-4 text-indigo-600 dark:text-indigo-400">Assigned SDR</th>
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
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No assigned leads found. Your SDR pipelines are empty.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
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
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{lead.lead_identity}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{lead.city || 'No City'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium font-mono text-slate-600 dark:text-slate-400">
                                                    {lead.teamName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-indigo-700 dark:text-indigo-300">
                                                {lead.sdrName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {format(new Date(lead.assigned_date), 'MMM dd, yyyy')}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                                                    By {lead.assigned_by}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div>
                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${lead.status === 'Disqualified' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : lead.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-slate-100 text-slate-700'}`}>
                                                        {lead.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1.5 font-medium">
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
