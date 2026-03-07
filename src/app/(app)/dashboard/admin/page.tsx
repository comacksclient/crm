'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, ExternalLink, PlusCircle, UploadCloud, FileSpreadsheet, Download, ShieldCheck, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const [generating, setGenerating] = useState(false);
    const [sheetUrl, setSheetUrl] = useState<string | null>(null);
    const [profile, setProfile] = useState<{ role: string, teamName: string } | null>(null);

    const [uploading, setUploading] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // Manual Entry State
    const [addingManual, setAddingManual] = useState(false);
    const [manualClinicName, setManualClinicName] = useState('');
    const [manualPhoneNumber, setManualPhoneNumber] = useState('');
    const [manualCity, setManualCity] = useState('');
    const [manualLeadType, setManualLeadType] = useState('');

    const [exporting, setExporting] = useState(false);

    useState(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => {
                if (data.user) setProfile({ role: data.user.role, teamName: data.user.teamName });
            });
    });

    // Wait for auth resolution
    if (status === 'loading') return <div className="p-12 text-center text-slate-500">Loading admin controls...</div>;

    if (!session) {
        redirect('/login');
    }

    if (profile && profile.role !== 'ADMIN') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
                <Card className="max-w-md w-full shadow-sm border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center p-8">
                    <ShieldCheck className="h-16 w-16 mx-auto text-rose-500 mb-4" />
                    <h2 className="text-xl font-bold text-rose-900 dark:text-rose-100 mb-2">Access Restricted</h2>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mb-6">
                        System Setup, CSV ingestion, and Database Exports are strictly restricted to Administrators. Your current role is {profile.role}.
                    </p>
                    <Link href="/queue">
                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">Return to safe zone</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    // Logic for obsolete generateSystemSheet removed

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

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualClinicName || !manualPhoneNumber || !manualCity) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setAddingManual(true);
        try {
            const newLead = {
                clinicName: manualClinicName,
                phoneNumber: manualPhoneNumber,
                city: manualCity,
                leadType: manualLeadType
            };

            const res = await fetch('/api/leads/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads: [newLead] })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Lead added successfully!");
                // Reset form
                setManualClinicName('');
                setManualPhoneNumber('');
                setManualCity('');
                setManualLeadType('');
            } else {
                toast.error(data.error || 'Failed to add lead');
            }
        } catch (err) {
            console.error("Manual add error:", err);
            toast.error("An error occurred while adding the lead");
        } finally {
            setAddingManual(false);
        }
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const res = await fetch('/api/admin/export');
            if (res.ok) {
                const data = await res.json();
                const leads = data.leads;

                if (!leads || leads.length === 0) {
                    toast.error("No leads available in the database to export.");
                    setExporting(false);
                    return;
                }

                // Initialize jsPDF (landscape for wide tables)
                const doc = new jsPDF('landscape');

                // Set Title
                doc.setFontSize(18);
                doc.text('CRM Lead Pipeline Database Export', 14, 22);
                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
                doc.text(`Total Active/Disqualified Records: ${data.total}`, 14, 36);

                // Setup Table Headers and Body
                const tableColumn = ["Identity", "City", "Status", "Priority", "Touches", "Outcome", "Action Date", "Team", "Caller"];
                const tableRows = leads.map((lead: any) => [
                    lead.Identity,
                    lead.City,
                    lead.Status,
                    lead.Priority.toString(),
                    lead.Touches.toString(),
                    lead.Outcome,
                    lead["Action Date"],
                    lead.Team,
                    lead.Caller
                ]);

                // Generate table
                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 45,
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
                    alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
                });

                // Download locally
                doc.save(`CRM_Lead_Export_${new Date().toISOString().split('T')[0]}.pdf`);
                toast.success('Database fully exported alongside relational graphs as a PDF document!');

            } else {
                toast.error("You are not authorized to export the master database.");
            }
        } catch (e) {
            toast.error("A network error occurred during the master export.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">System Setup</h1>
                        <p className="text-slate-500 text-sm">Sheet configuration and data ingestion</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <UserCircle2 className="h-4 w-4 text-indigo-500" />
                            Logged in as {session.user?.name || session.user?.email}
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 border-indigo-200 capitalize">{profile?.role.toLowerCase() || '...'}</Badge>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 border-emerald-200">{profile?.teamName || '...'}</Badge>
                        </div>
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
                                        Upload a CSV file with columns: <b>Clinic Name</b>, <b>Phone Number</b>, and <b>City</b>. The system will automatically map and parse these directly into the internal PostgreSQL database.
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
                                <h4 className="font-semibold text-sm">Add Lead Manually</h4>
                                <form onSubmit={handleManualSubmit} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <PlusCircle className="h-4 w-4 text-slate-600" />
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">Single Entry</p>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Clinic Name *"
                                            value={manualClinicName}
                                            onChange={(e) => setManualClinicName(e.target.value)}
                                            className="text-sm border p-2 rounded w-full bg-white dark:bg-slate-950"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Phone Number *"
                                            value={manualPhoneNumber}
                                            onChange={(e) => setManualPhoneNumber(e.target.value)}
                                            className="text-sm border p-2 rounded w-full bg-white dark:bg-slate-950"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="City *"
                                            value={manualCity}
                                            onChange={(e) => setManualCity(e.target.value)}
                                            className="text-sm border p-2 rounded w-full bg-white dark:bg-slate-950"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Lead Type (e.g., Hot, Cold)"
                                            value={manualLeadType}
                                            onChange={(e) => setManualLeadType(e.target.value)}
                                            className="text-sm border p-2 rounded w-full bg-white dark:bg-slate-950"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full mt-2"
                                        disabled={addingManual}
                                    >
                                        {addingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                        {addingManual ? 'Adding...' : 'Add Lead'}
                                    </Button>
                                </form>
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

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm">Database Export</h4>
                                    <p className="text-xs text-slate-500 mt-1 mb-3">Download a structured PDF of the entire CRM including relational Team/Caller maps and calculated Action metrics.</p>
                                </div>
                                <Button
                                    onClick={handleExportPDF}
                                    disabled={exporting}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2"
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    {exporting ? "Compiling PDF..." : "Export Lead Database (PDF)"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
