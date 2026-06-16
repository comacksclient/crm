'use client';

import { useState, useEffect, useCallback } from 'react';
import { CandidateTable } from '@/components/hr/CandidateTable';
import { AddCandidateModal, EditCandidateModal, BulkUploadCandidateModal } from '@/components/hr/CandidateModals';
import { Candidate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Users,
    UserPlus,
    Briefcase,
    CalendarCheck,
    CheckCircle2,
    TrendingUp,
    Search,
    RefreshCw,
    Loader2,
    Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function HRDashboard() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

    const fetchCandidates = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch('/api/hr/candidates');
            if (res.ok) {
                const data = await res.json();
                setCandidates(data.candidates || []);
            } else if (res.status === 403) {
                toast.error('Access Denied. HR or Admin role required.');
            } else {
                toast.error('Failed to load candidate data');
            }
        } catch (e) {
            toast.error('Network error while loading candidates');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery) ||
        (c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Stats calculation
    const totalCandidates = candidates.length;
    const interviewing = candidates.filter(c => c.status === 'Interview Scheduled' || c.status === 'Interview Taken').length;
    const hired = candidates.filter(c => c.status === 'Hired').length;
    const conversionRate = totalCandidates > 0 ? ((hired / totalCandidates) * 100).toFixed(1) : '0';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">HR Recruitment Center</h1>
                            <p className="text-sm text-slate-500">Manage your hiring pipeline and interview schedules.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search candidates..."
                                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fetchCandidates(true)}
                            className="shrink-0"
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="gap-2 shrink-0 border-slate-200 dark:border-slate-800"
                        >
                            <Upload className="h-4 w-4 text-slate-500" />
                            Import CSV
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0 shadow-lg shadow-indigo-600/20"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add Candidate
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 border-l-4 border-indigo-600 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Applied</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{totalCandidates}</h3>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-5 border-l-4 border-amber-500 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In Interview</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{interviewing}</h3>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600">
                                <CalendarCheck className="h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-5 border-l-4 border-emerald-500 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hired Total</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{hired}</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-5 border-l-4 border-violet-500 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hiring Rate</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{conversionRate}%</h3>
                            </div>
                            <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Main Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Candidate Registry</h2>
                        <span className="text-xs text-slate-400 font-medium tracking-wide">Showing {filteredCandidates.length} relevant entries</span>
                    </div>

                    <CandidateTable
                        candidates={filteredCandidates}
                        isLoading={loading}
                        onEdit={(c) => setEditingCandidate(c)}
                        onRefresh={() => fetchCandidates(true)}
                    />
                </div>
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <AddCandidateModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchCandidates(true);
                    }}
                />
            )}

            {editingCandidate && (
                <EditCandidateModal
                    candidate={editingCandidate}
                    onClose={() => setEditingCandidate(null)}
                    onSuccess={() => {
                        setEditingCandidate(null);
                        fetchCandidates(true);
                    }}
                />
            )}

            {isUploadModalOpen && (
                <BulkUploadCandidateModal
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={() => {
                        setIsUploadModalOpen(false);
                        fetchCandidates(true);
                    }}
                />
            )}
        </div>
    );
}
