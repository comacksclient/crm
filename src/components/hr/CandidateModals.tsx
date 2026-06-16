'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, X } from 'lucide-react';
import { Candidate } from '@/lib/types';
import Papa from 'papaparse';

interface AddCandidateModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

export function AddCandidateModal({ onSuccess, onClose }: AddCandidateModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        email: '',
        notes: '',
        scheduled_date: '',
        scheduled_time: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/hr/candidates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Candidate added successfully!');
                onSuccess();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to add candidate');
            }
        } catch (e) {
            toast.error('Network error while adding candidate');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-600" />
                        Add New Candidate
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                            id="name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            placeholder="John Doe"
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input 
                                id="phone" 
                                value={formData.phone_number} 
                                onChange={(e) => setFormData({...formData, phone_number: e.target.value})} 
                                placeholder="+91..."
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input 
                                id="email" 
                                type="email"
                                value={formData.email} 
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Scheduled Date</Label>
                            <Input 
                                id="date" 
                                type="date"
                                value={formData.scheduled_date} 
                                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input 
                                id="time" 
                                type="time"
                                value={formData.scheduled_time} 
                                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})} 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Initial Notes</Label>
                        <Textarea 
                            id="notes" 
                            value={formData.notes} 
                            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                            placeholder="Source, experience, etc."
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Record'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface EditCandidateModalProps {
    candidate: Candidate;
    onSuccess: () => void;
    onClose: () => void;
}

export function EditCandidateModal({ candidate, onSuccess, onClose }: EditCandidateModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: candidate.name,
        phone_number: candidate.phone_number,
        email: candidate.email || '',
        status: candidate.status,
        notes: candidate.notes || '',
        hired_timing: candidate.hired_timing || '',
        scheduled_date: candidate.scheduled_date || '',
        scheduled_time: candidate.scheduled_time || '',
        interview_taken: candidate.interview_taken
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/hr/candidates/${candidate.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Candidate updated successfully');
                onSuccess();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update candidate');
            }
        } catch (e) {
            toast.error('Network error while updating candidate');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Edit className="h-5 w-5 text-amber-600" />
                        Manage Candidate
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="status">Hiring Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Applied">Applied</SelectItem>
                                <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                                <SelectItem value="Interview Taken">Interview Taken</SelectItem>
                                <SelectItem value="Hired">Hired</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Scheduled Date</Label>
                            <Input 
                                id="date" 
                                type="date"
                                value={formData.scheduled_date} 
                                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Scheduled Time</Label>
                            <Input 
                                id="time" 
                                type="time"
                                value={formData.scheduled_time} 
                                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})} 
                            />
                        </div>
                    </div>

                    {formData.status === 'Hired' && (
                        <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                            <Label htmlFor="hired_timing">Hired Timing / Onboarding</Label>
                            <Input 
                                id="hired_timing" 
                                placeholder="e.g. Next Monday at 10 AM"
                                value={formData.hired_timing} 
                                onChange={(e) => setFormData({...formData, hired_timing: e.target.value})} 
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="notes">Candidate Notes</Label>
                        <Textarea 
                            id="notes" 
                            value={formData.notes} 
                            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                            placeholder="Add interview feedback..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="taken"
                            checked={formData.interview_taken} 
                            onChange={(e) => setFormData({...formData, interview_taken: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <Label htmlFor="taken" className="text-sm font-medium cursor-pointer">Interview Taken</Label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface BulkUploadCandidateModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

export function BulkUploadCandidateModal({ onSuccess, onClose }: BulkUploadCandidateModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setParsing(true);

            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const mapped = results.data.map((row: any) => {
                        const getField = (keys: string[]) => {
                            for (const k of keys) {
                                if (row[k] !== undefined) return row[k];
                                const match = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
                                if (match) return row[match];
                            }
                            return undefined;
                        };

                        const name = getField(['name', 'full name', 'candidate name', 'first name', 'first_name']);
                        const phone_number = getField(['phone', 'phone number', 'contact', 'mobile', 'phone_number', 'phone_no']);
                        const email = getField(['email', 'email address', 'email_address', 'mail']);
                        const notes = getField(['notes', 'remarks', 'comment', 'feedback', 'notes_info']);
                        const scheduled_date = getField(['scheduled_date', 'scheduled date', 'interview date', 'date', 'interview_date']);
                        const scheduled_time = getField(['scheduled_time', 'scheduled time', 'interview time', 'time', 'interview_time']);

                        return { name, phone_number, email, notes, scheduled_date, scheduled_time };
                    }).filter(c => c.name || c.phone_number);

                    setPreview(mapped);
                    setParsing(false);
                },
                error: (err) => {
                    toast.error('Failed to parse CSV file: ' + err.message);
                    setParsing(false);
                }
            });
        }
    };

    const handleUpload = async () => {
        if (preview.length === 0) return;
        setUploading(true);

        try {
            const res = await fetch('/api/hr/candidates/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidates: preview })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Successfully imported ${data.count} candidates!`);
                onSuccess();
            } else {
                toast.error(data.error || 'Failed to import candidates.');
            }
        } catch (e) {
            toast.error('Network error during candidate import.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] space-y-6">
                <div className="flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-650" />
                        Bulk Import Candidates (CSV)
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/10">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload-input"
                        />
                        <label
                            htmlFor="csv-upload-input"
                            className="cursor-pointer inline-flex flex-col items-center space-y-2 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <span className="p-3 bg-white dark:bg-slate-900 shadow-sm border rounded-xl">
                                <Plus className="h-6 w-6 text-indigo-600" />
                            </span>
                            <span className="text-sm font-semibold">
                                {file ? file.name : 'Click to select CSV File'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                Column headers mapped: Name, Phone, Email, Notes, Date, Time
                            </span>
                        </label>
                    </div>

                    {parsing && (
                        <div className="text-center p-4 text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            Parsing candidate details...
                        </div>
                    )}

                    {!parsing && preview.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                <span>Preview parsed list ({preview.length} rows found)</span>
                                <span className="text-[10px] text-amber-600">Existing phone numbers will be skipped automatically</span>
                            </div>
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 border-b">
                                        <tr>
                                            <th className="px-4 py-2">Name</th>
                                            <th className="px-4 py-2">Phone</th>
                                            <th className="px-4 py-2">Email</th>
                                            <th className="px-4 py-2">Notes</th>
                                            <th className="px-4 py-2">Schedule</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                        {preview.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-200">
                                                    {row.name || <span className="text-rose-500 italic">Missing</span>}
                                                </td>
                                                <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">
                                                    {row.phone_number || <span className="text-rose-500 italic">Missing</span>}
                                                </td>
                                                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{row.email || '-'}</td>
                                                <td className="px-4 py-2 text-slate-400 truncate max-w-[150px]">{row.notes || '-'}</td>
                                                <td className="px-4 py-2 text-slate-500">
                                                    {row.scheduled_date ? `${row.scheduled_date} ${row.scheduled_time || ''}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading || preview.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-650/15 font-semibold"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {uploading ? 'Importing...' : `Import ${preview.length} Candidates`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
