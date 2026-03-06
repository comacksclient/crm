'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, BriefcaseMedical, CheckSquare, Square, Link as LinkIcon, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

interface AssignableLead {
    id: string;
    lead_identity: string;
    assignment_info: string;
    lead_type: string;
    createdAt: string;
}

interface SDR {
    id: string;
    name: string | null;
    email: string;
}

export default function ManagerDashboard() {
    const [leads, setLeads] = useState<AssignableLead[]>([]);
    const [sdrs, setSdrs] = useState<SDR[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingSdrs, setLoadingSdrs] = useState(true);

    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [selectedSdr, setSelectedSdr] = useState<string>('');
    const [assigning, setAssigning] = useState(false);

    const [managerTeamId, setManagerTeamId] = useState<string | null>(null);
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoadingLeads(true);
        setLoadingSdrs(true);

        try {
            // Fetch unassigned leads available to this manager
            const resLeads = await fetch('/api/leads/assignable');
            if (resLeads.ok) {
                const data = await resLeads.json();
                setLeads(data.leads || []);
            } else if (resLeads.status === 403) {
                toast.error('Manager privileges required to view assignment desk.');
            }

            // Fetch list of SDRs to assign to
            const resSdrs = await fetch('/api/users/sdrs');
            if (resSdrs.ok) {
                const data = await resSdrs.json();
                setSdrs(data.sdrs || []);
                if (data.managerTeamId) {
                    setManagerTeamId(data.managerTeamId);
                }
            }
        } catch (e) {
            toast.error('Network error fetching pipeline data');
        } finally {
            setLoadingLeads(false);
            setLoadingSdrs(false);
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

    const handleAssign = async () => {
        if (selectedLeads.size === 0) {
            toast.error("Please select at least one lead to assign.");
            return;
        }
        if (!selectedSdr) {
            toast.error("Please select an SDR from the dropdown.");
            return;
        }

        setAssigning(true);
        try {
            const res = await fetch('/api/leads/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds: Array.from(selectedLeads),
                    sdrId: selectedSdr
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Successfully mapped ${data.count} leads to the selected SDR!`);
                setSelectedLeads(new Set());
                fetchData(); // Refresh remaining unassigned queue
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to map leads');
            }
        } catch (e) {
            toast.error('Network error during bulk assignment');
        } finally {
            setAssigning(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!managerTeamId) return;
        setGeneratingInvite(true);
        try {
            const res = await fetch('/api/teams/invite/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: managerTeamId })
            });

            if (res.ok) {
                const data = await res.json();
                const inviteUrl = `${window.location.origin}/invite/${data.inviteId}`;
                await navigator.clipboard.writeText(inviteUrl);
                toast.success('Secure Invite Link copied to your clipboard!');
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 3000);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to generate invite');
            }
        } catch (e) {
            toast.error('Network error generating invite');
        } finally {
            setGeneratingInvite(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <BriefcaseMedical className="h-6 w-6 text-indigo-600" />
                            Manager Assignment Desk
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Select raw active leads given to your Team framework and assign them directly to your SDRs.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {managerTeamId && (
                            <Button
                                variant="outline"
                                onClick={handleGenerateInvite}
                                disabled={generatingInvite}
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 gap-2"
                            >
                                {generatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : copiedInvite ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                                {copiedInvite ? 'Copied Link!' : 'Invite SDRs to Team'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Select value={selectedSdr} onValueChange={setSelectedSdr}>
                        <SelectTrigger className="w-[220px] bg-white dark:bg-slate-900">
                            <SelectValue placeholder="Select target SDR..." />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingSdrs ? (
                                <SelectItem value="loading" disabled>Loading SDRs...</SelectItem>
                            ) : sdrs.length === 0 ? (
                                <SelectItem value="none" disabled>No SDRs found</SelectItem>
                            ) : (
                                sdrs.map(sdr => (
                                    <SelectItem key={sdr.id} value={sdr.id}>{sdr.name || 'Anonymous User'} ({sdr.email})</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleAssign}
                            disabled={assigning || selectedLeads.size === 0 || !selectedSdr}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                        >
                            {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Assign {selectedLeads.size} Leads
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-2">
                    <Button variant="outline" size="sm" onClick={selectAll} className="text-slate-600 dark:text-slate-300">
                        {selectedLeads.size === leads.length && leads.length > 0 ? (
                            <><CheckSquare className="h-4 w-4 mr-2" /> Deselect All</>
                        ) : (
                            <><Square className="h-4 w-4 mr-2" /> Select All</>
                        )}
                    </Button>
                    <span className="text-sm text-slate-500 font-medium">Showing {leads.length} unassigned leads in your Team queue</span>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-[60px] text-center">Select</th>
                                    <th className="px-6 py-4">Clinic / Lead Identity</th>
                                    <th className="px-6 py-4">City / Region</th>
                                    <th className="px-6 py-4 text-center">Lead Source / Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {loadingLeads ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Scanning team assignment block for raw leads...
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            No unassigned leads found. Your queue is clear!
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
                                                    onChange={() => { }} // Controlled via row click
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 pointer-events-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 max-w-[300px] truncate" title={lead.lead_identity}>
                                                {lead.lead_identity}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 rounded w-fit inline-flex mt-2 ml-4">
                                                {lead.assignment_info}
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
        </div>
    );
}
