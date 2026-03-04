import { getCallQueue } from '@/lib/googleSheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, PhoneOutgoing, Calendar, ShieldAlert } from 'lucide-react';

export default async function ManagerDashboard() {
    const { leads } = await getCallQueue();

    const activeCount = leads.filter(l => l.lead_status === 'Active').length;
    const bookedCount = leads.filter(l => l.lead_status === 'Meeting Booked').length;
    const disqualifiedCount = leads.filter(l => l.lead_status === 'Disqualified').length;
    const totalTouches = leads.reduce((acc, lead) => acc + (lead.touch_count || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Manager Dashboard</h1>
                        <p className="text-sm text-slate-500">Overview of queue health and SDR performance</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                            <Users className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeCount}</div>
                            <p className="text-xs text-slate-500">Currently in queue</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Meetings Booked</CardTitle>
                            <Calendar className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{bookedCount}</div>
                            <p className="text-xs text-slate-500">Total conversions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Touches</CardTitle>
                            <PhoneOutgoing className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalTouches}</div>
                            <p className="text-xs text-slate-500">Total calls placed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Disqualified</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{disqualifiedCount}</div>
                            <p className="text-xs text-slate-500">Invalid or un-interested</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
