import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Upload, Database } from 'lucide-react';

export default async function AdminDashboard() {

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Control Center</h1>
                        <p className="text-sm text-slate-500">System configuration and data management</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="hover:border-indigo-500 transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-indigo-600" />
                                Upload Leads
                            </CardTitle>
                            <CardDescription>Import CSV directly into Google Sheets</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">Manage bulk insertion of lead data into the Active Queue.</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-indigo-500 transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-600" />
                                Automation Rules
                            </CardTitle>
                            <CardDescription>Adjust disqualification limits</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">Configure global settings like max touch count thresholds.</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-indigo-500 transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-600" />
                                System Maintenance
                            </CardTitle>
                            <CardDescription>Archive workflows</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">Trigger routines to archive Disqualified/Booked leads to cold storage.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
