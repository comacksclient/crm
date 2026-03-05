'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, ExternalLink, PlusCircle, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const [generating, setGenerating] = useState(false);
    const [sheetUrl, setSheetUrl] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
        }
    };

    const processCSVAndUpload = () => {
        if (!csvFile) return;
        setUploading(true);

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    // Try to flexibly map required fields from the CSV
                    const mappedLeads = results.data.map((row: any) => {
                        // Look for common variations of headers
                        const clinicName = row['Clinic Name'] || row['clinic'] || row['name'] || row['Clinic'];
                        const phoneNumber = row['Phone Number'] || row['phone'] || row['Phone'];
                        const city = row['City'] || row['city'] || row['Location'];

                        return { clinicName, phoneNumber, city };
                    }).filter(l => l.clinicName || l.phoneNumber); // Remove totally blank rows

                    if (mappedLeads.length === 0) {
                        toast.error("Could not find required columns (Clinic Name, Phone Number, City) in CSV.");
                        setUploading(false);
                        return;
                    }

                    const res = await fetch('/api/leads/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leads: mappedLeads })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        toast.success(`Successfully uploaded ${mappedLeads.length} leads!`);
                        setCsvFile(null); // Reset form
                    } else {
                        toast.error(data.error || 'Failed to upload leads');
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                    toast.error("An error occurred while dispatching leads");
                } finally {
                    setUploading(false);
                }
            },
            error: (error) => {
                toast.error(`CSV Parsing error: ${error.message}`);
                setUploading(false);
            }
        });
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
                                <h4 className="font-semibold text-sm">Upload Leads via CSV</h4>
                                <div className="space-y-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Fast Ingestion</p>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Upload a CSV file with columns: <b>Clinic Name</b>, <b>Phone Number</b>, and <b>City</b>. The system will automatically map and append these to your connected Google Sheet.
                                    </p>

                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="text-sm border p-2 rounded w-full bg-white dark:bg-slate-900 mb-2 cursor-pointer"
                                    />

                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                                        onClick={processCSVAndUpload}
                                        disabled={uploading || !csvFile}
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                        {uploading ? 'Parsing and Uploading...' : 'Upload CSV Leads'}
                                    </Button>
                                </div>
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
                            <CardTitle>Google OAuth System</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                This system requires a linked Google Account to read/write from <b>Google Sheets</b>.
                                Since Service Account Private Keys are blocked by organizational policy, you must authorize your personal or workspace Google Account below.
                            </p>

                            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('oauth') === 'success' && (
                                <div className="p-3 mb-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
                                    Google Account linked successfully! System is now running.
                                </div>
                            )}

                            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') && (
                                <div className="p-3 mb-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium">
                                    OAuth Error: {new URLSearchParams(window.location.search).get('error')}
                                </div>
                            )}

                            <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2" asChild>
                                <a href="/api/auth/google">Link Google Account (OAuth)</a>
                            </Button>

                            <div className="text-xs text-slate-500 mt-2 space-y-1 bg-slate-100 p-3 rounded">
                                <p><strong>Required setup before clicking:</strong></p>
                                <li>Ensure `GOOGLE_CLIENT_ID` is in `.env`</li>
                                <li>Ensure `GOOGLE_CLIENT_SECRET` is in `.env`</li>
                                <li>Redirect URI in GCP must be EXACTLY: <br /><code>{process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback</code></li>
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
