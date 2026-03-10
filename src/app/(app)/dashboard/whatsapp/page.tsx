'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface PendingWhatsApp {
    id: string;
    name: string;
    phone_number: string;
    city: string;
    sdrName: string;
    interest_level: number;
    call_notes: string;
    next_action_date: string | null;
    whatsapp_status: string;
}

export default function WhatsAppDesk() {
    const [leads, setLeads] = useState<PendingWhatsApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/whatsapp/pending');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            } else if (res.status === 403) {
                toast.error('Privilege escalation error: WhatsApp management is restricted to Admins & Managers.');
            }
        } catch (e) {
            toast.error('Network error fetching whatsapp pipeline');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkSent = async (id: string, phone: string) => {
        setProcessingId(id);

        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: id })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message);

                // Remove it from the local queue to give instant feedback
                setLeads((prev) => prev.filter(l => l.id !== id));
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to trigger workflow auto-routing');
            }
        } catch (e) {
            toast.error('Network error executing whatsapp automated dispatch');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-emerald-50/50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-emerald-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-500 flex items-center gap-2">
                            <MessageCircle className="h-6 w-6 text-emerald-600" />
                            WhatsApp Broadcast Hub
                        </h1>
                        <p className="text-sm text-emerald-700/70 dark:text-emerald-400/60 mt-1">Pending leads requiring custom messaging. Actioning these will automatically assign them back to the SDR's queue for Tomorrow.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between px-2">
                    <span className="text-sm text-emerald-800/60 dark:text-emerald-500/50 font-medium">Tracking {leads.length} pending broadcasts</span>
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-emerald-200/60 dark:border-slate-800 overflow-hidden ring-1 ring-emerald-100 dark:ring-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                            <thead className="bg-emerald-50/50 dark:bg-slate-800 text-emerald-800 dark:text-emerald-200/80 font-semibold border-b border-emerald-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 whitespace-nowrap">Name</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Phone Number</th>
                                    <th className="px-6 py-4 whitespace-nowrap">City</th>
                                    <th className="px-6 py-4 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Linked SDR</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">Interest</th>
                                    <th className="px-6 py-4 max-w-[200px] whitespace-nowrap">SDR Call Notes</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-emerald-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Scanning active SDR actions for WhatsApp triggers...
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-emerald-500/70">
                                            Everything is processed! SDRs have not flagged any pending WhatsApp deliveries.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-emerald-50/30 dark:hover:bg-slate-800/50 flex-1 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                                {lead.name}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {lead.phone_number}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {lead.city}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                                {lead.sdrName}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-xs font-bold border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                                                    Level {lead.interest_level}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate whitespace-nowrap" title={lead.call_notes}>
                                                {lead.call_notes}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                                                    {lead.whatsapp_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <Button
                                                    onClick={() => handleMarkSent(lead.id, lead.phone_number)}
                                                    disabled={processingId === lead.id}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-transform active:scale-95 whitespace-nowrap"
                                                >
                                                    {processingId === lead.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <><Send className="h-3 w-3" /> Mark Sent</>
                                                    )}
                                                </Button>
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
