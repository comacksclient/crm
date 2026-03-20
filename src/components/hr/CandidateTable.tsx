'use client';

import { Candidate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Phone, Mail, Calendar, CheckCircle2, Clock, XCircle, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CandidateTableProps {
    candidates: Candidate[];
    isLoading: boolean;
    onEdit: (candidate: Candidate) => void;
    onRefresh: () => void;
}

const statusStyles: Record<string, string> = {
    'Applied': 'bg-blue-100 text-blue-700 border-blue-200',
    'Interview Scheduled': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Interview Taken': 'bg-teal-100 text-teal-700 border-teal-200',
    'Hired': 'bg-green-100 text-green-700 border-green-200',
    'Rejected': 'bg-rose-100 text-rose-700 border-rose-200',
};

export function CandidateTable({ candidates, isLoading, onEdit, onRefresh }: CandidateTableProps) {
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to permanently remove candidate ${name}?`)) return;

        try {
            const res = await fetch(`/api/hr/candidates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Candidate removed');
                onRefresh();
            } else {
                toast.error('Failed to remove candidate');
            }
        } catch (e) {
            toast.error('Network error during deletion');
        }
    };

    if (isLoading) {
        return (
            <div className="p-12 text-center text-slate-500">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-3 opacity-20" />
                <p>Loading candidate registry...</p>
            </div>
        );
    }

    if (candidates.length === 0) {
        return (
            <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent">
                <div className="max-w-xs mx-auto space-y-3">
                    <UserPlus className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-medium">No candidates in the database yet.</p>
                    <p className="text-xs text-slate-400">Add your first candidate to start tracking interviews and hiring.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Candidate Identity</th>
                            <th className="px-6 py-4">Contact info</th>
                            <th className="px-6 py-4 text-center">Interview Taken</th>
                            <th className="px-6 py-4">Current Status</th>
                            <th className="px-6 py-4">Schedule / Hiring info</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">{candidate.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">Added {format(new Date(candidate.createdAt), 'MMM dd, yyyy')}</div>
                                </td>
                                <td className="px-6 py-4 space-y-1">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Phone className="h-3 w-3" />
                                        <span>{candidate.phone_number}</span>
                                    </div>
                                    {candidate.email && (
                                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                                            <Mail className="h-3 w-3" />
                                            <span>{candidate.email}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {candidate.interview_taken ? (
                                        <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 mx-auto">
                                            <CheckCircle2 className="h-3 w-3" /> YES
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 mx-auto">
                                            <Clock className="h-3 w-3" /> PENDING
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusStyles[candidate.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {candidate.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 max-w-[200px]">
                                    {candidate.status === 'Hired' ? (
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-md">
                                            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5 tracking-wider">Hired Timing</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{candidate.hired_timing || 'Immediate'}</p>
                                        </div>
                                    ) : candidate.scheduled_date ? (
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                            <Calendar className="h-4 w-4 text-indigo-500" />
                                            <div>
                                                <p className="text-xs font-semibold">{format(new Date(candidate.scheduled_date), 'MMM dd, yyyy')}</p>
                                                <p className="text-[10px] text-slate-500">{candidate.scheduled_time || 'No time set'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Not scheduled</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => onEdit(candidate)}
                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => handleDelete(candidate.id, candidate.name)}
                                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
