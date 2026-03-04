'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, ExternalLink, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const [generating, setGenerating] = useState(false);
    const [sheetUrl, setSheetUrl] = useState<string | null>(null);

    // Wait for auth resolution
    if (status === 'loading') return <div className="p-12 text-center text-slate-500">Loading admin controls...</div>;

    if (!session || (session as any).role !== 'ADMIN') {
        redirect('/queue');
    }

    const generateSystemSheet = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/sheets/create', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                toast.success('System Spreadsheet Generated!');
                setSheetUrl(data.url);
            } else {
                toast.error(data.error || 'Failed to generate spreadsheet');
            }
        } catch (e) {
            toast.error('Network error during connection');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Controls</h1>
                        <p className="text-slate-500 text-sm">System configuration and ingestion</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/dashboard/manager">
                            <Button variant="outline">Manager View</Button>
                        </Link>
                        <Link href="/queue">
                            <Button variant="outline">SDR Queue View</Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Ingestion Engine</CardTitle>
                            <CardDescription>Instructions for importing Leads into the Outbound system.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                The system reads directly from the connected Google Sheet. To ingest leads, open your Google Sheet and paste rows directly into the <strong>Call_Queue</strong> sheet.
                            </p>
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                                <h4 className="font-semibold text-sm mb-2">Required Columns Map:</h4>
                                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-mono">
                                    <li>A: lead_identity (UUID mapping)</li>
                                    <li>B: assignment_info (Manager/City)</li>
                                    <li>C - F: Leave blank (Filled by SDRs)</li>
                                    <li>G - N: Leave blank (Auto computed)</li>
                                    <li>O: lead_status (Set to &ldquo;Active&rdquo;)</li>
                                </ul>
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                <h4 className="font-semibold text-sm">Don't have a configured sheet yet?</h4>
                                <p className="text-xs text-slate-500">
                                    Click below to automatically generate a brand new Google Spreadsheet containing the exact architecture required by the system.
                                </p>

                                {sheetUrl ? (
                                    <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg">
                                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">Sheet Generated Successfully!</p>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                                            <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                                                Open New System Sheet <ExternalLink className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                                            <strong>Important:</strong> Copy the long ID from the URL above and save it as your <code>SPREADSHEET_ID</code> in the `.env` file to link it to the backend forever.
                                        </p>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full gap-2"
                                        onClick={generateSystemSheet}
                                        disabled={generating}
                                    >
                                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                        {generating ? 'Generating Sheet structure...' : 'Generate New System Sheet'}
                                    </Button>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button className="w-full gap-2" variant="outline" asChild>
                                    <a href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SPREADSHEET_ID || ''}`} target="_blank" rel="noopener noreferrer">
                                        Open Current Connected Sheet <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>System Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-green-800 dark:text-green-300">Action Engine</span>
                                    <span className="text-xs font-bold text-green-600 uppercase px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded-full">Online</span>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400">Automated rules and priority routing are processing.</p>
                            </div>

                            <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-blue-800 dark:text-blue-300">Google Sheets Sync</span>
                                    <span className="text-xs font-bold text-blue-600 uppercase px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full">Connected</span>
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Successfully reading and writing to Spreadsheet ID.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
