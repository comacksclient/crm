import { auth } from '@/auth';
import { getMeetings } from '@/lib/googleSheets';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ManagerDashboard() {
    const session = await auth();

    if (!session || !session.user || ((session.user as any).role !== 'MANAGER' && (session.user as any).role !== 'ADMIN')) {
        redirect('/queue');
    }

    const meetings = await getMeetings();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Manager Dashboard</h1>
                        <p className="text-slate-500 text-sm">Welcome back, {session.user.name || session.user.email}</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/queue">
                            <Button variant="outline">Back to Queue</Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1 md:col-span-3">
                        <CardHeader>
                            <CardTitle>Team Meetings Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {meetings.length === 0 ? (
                                <p className="text-slate-500 text-center py-6">No meetings booked yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-4 py-3">Lead Identity</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Time</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Booked By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {meetings.map((m, i) => (
                                                <tr key={i} className="border-b dark:border-slate-800">
                                                    <td className="px-4 py-3 font-medium truncate max-w-[150px]">{m.lead_identity}</td>
                                                    <td className="px-4 py-3">{m.meeting_date}</td>
                                                    <td className="px-4 py-3">{m.meeting_time}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                                                            {m.meeting_status || 'booked'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">{m.booked_by}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
