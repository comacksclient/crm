'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users, ArrowLeft, Save, Plus, Link as LinkIcon, Check, ShieldCheck, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Team {
    id: string;
    name: string;
    _count: { users: number, leads: number };
}

interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'MANAGER' | 'SDR';
    team_id: string | null;
    team: { name: string } | null;
}

export default function UsersManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [profile, setProfile] = useState<{ role: string, teamName: string } | null>(null);

    // Team Builder
    const [newTeamName, setNewTeamName] = useState('');
    const [creatingTeam, setCreatingTeam] = useState(false);

    // Editing state per user ID to allow inline modifications
    const [editingRoles, setEditingRoles] = useState<Record<string, 'ADMIN' | 'MANAGER' | 'SDR'>>({});
    const [editingTeams, setEditingTeams] = useState<Record<string, string>>({});

    const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);
    const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            setProfile({ role: data.user.role, teamName: data.user.teamName });
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resUsers, resTeams] = await Promise.all([
                fetch('/api/users/list'),
                fetch('/api/teams/list')
            ]);

            if (resUsers.ok) {
                const data = await resUsers.json();
                setUsers(data.users || []);
            } else if (resUsers.status === 403) {
                toast.error('You do not have Administrator privileges to view this page.');
            }

            if (resTeams.ok) {
                const data = await resTeams.json();
                setTeams(data.teams || []);
            }
        } catch (e) {
            toast.error('Network error fetching platform data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            toast.error("Please enter a team name");
            return;
        }

        setCreatingTeam(true);
        try {
            const res = await fetch('/api/teams/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTeamName })
            });

            if (res.ok) {
                toast.success('Team created successfully!');
                setNewTeamName('');
                fetchData(); // Refresh everything
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create team');
            }
        } catch (e) {
            toast.error('Network error during team creation');
        } finally {
            setCreatingTeam(false);
        }
    };

    const handleRoleChange = (userId: string, newRole: 'ADMIN' | 'MANAGER' | 'SDR') => {
        setEditingRoles(prev => ({ ...prev, [userId]: newRole }));
    };

    const handleTeamChange = (userId: string, teamId: string) => {
        setEditingTeams(prev => ({ ...prev, [userId]: teamId }));
    };

    const handleSave = async (user: User) => {
        const hasRoleChange = editingRoles[user.id] !== undefined;
        const hasTeamChange = editingTeams[user.id] !== undefined;

        if (!hasRoleChange && !hasTeamChange) return;

        const role = editingRoles[user.id] || user.role;
        const team_id = editingTeams[user.id] !== undefined ? editingTeams[user.id] : (user.team_id || 'none');

        setSubmitting(user.id);
        try {
            const res = await fetch('/api/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, role, team_id })
            });

            if (res.ok) {
                toast.success('User explicit mappings saved!');
                // Clear dirty states and refresh
                setEditingRoles(prev => { const upd = { ...prev }; delete upd[user.id]; return upd; });
                setEditingTeams(prev => { const upd = { ...prev }; delete upd[user.id]; return upd; });
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update user');
            }
        } catch (e) {
            toast.error('Network error during save');
        } finally {
            setSubmitting(null);
        }
    };

    const handleGenerateInvite = async (teamId: string) => {
        setGeneratingInvite(teamId);
        try {
            const res = await fetch('/api/teams/invite/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId })
            });

            if (res.ok) {
                const data = await res.json();
                const inviteUrl = `${window.location.origin}/invite/${data.inviteId}`;
                await navigator.clipboard.writeText(inviteUrl);
                toast.success('Secure Invite Link copied to clipboard!');
                setCopiedInvite(teamId);
                setTimeout(() => setCopiedInvite(null), 3000);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to generate invite');
            }
        } catch (e) {
            toast.error('Network error generating invite');
        } finally {
            setGeneratingInvite(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-600" />
                            Team Control & Membership
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">View your corporate team and operational membership.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <UserCircle2 className="h-4 w-4 text-indigo-500" />
                            Joined Team: {profile?.teamName || '...'}
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 border-indigo-200 capitalize">Role: {profile?.role.toLowerCase() || '...'}</Badge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Column 1: Team Control or Squad Info */}
                    {profile?.role === 'ADMIN' ? (
                        <Card className="col-span-1 shadow-sm border-slate-200 dark:border-slate-800 h-fit">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-4">
                                <CardTitle className="text-lg">Build New Team</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="e.g. Alpha Squad"
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleCreateTeam}
                                    disabled={creatingTeam}
                                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {creatingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Initialize Team
                                </Button>

                                <div className="pt-6">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Pipeline Teams</h3>
                                    <div className="space-y-2">
                                        {teams.map(t => (
                                            <div key={t.id} className="text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                                                    <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{t._count.users} members</span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGenerateInvite(t.id)}
                                                    disabled={generatingInvite === t.id}
                                                    className="w-full h-8 text-xs gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    {generatingInvite === t.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : copiedInvite === t.id ? (
                                                        <Check className="h-3 w-3 text-green-600" />
                                                    ) : (
                                                        <LinkIcon className="h-3 w-3" />
                                                    )}
                                                    {copiedInvite === t.id ? 'Copied Link!' : 'Copy Joining Link'}
                                                </Button>
                                            </div>
                                        ))}
                                        {teams.length === 0 && !loading && (
                                            <div className="text-sm text-slate-500 text-center py-2 italic">No teams formed yet.</div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="col-span-1 shadow-sm border-slate-200 dark:border-slate-800 h-fit bg-indigo-50/10">
                            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900 border-b border-indigo-100 dark:border-indigo-800 pb-4">
                                <CardTitle className="text-lg text-indigo-900 dark:text-indigo-100">Your Current Squad</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="text-center py-4">
                                    <div className="text-4xl font-bold text-indigo-600 mb-1">{profile?.teamName || 'Unassigned'}</div>
                                    <p className="text-xs text-indigo-400 uppercase tracking-widest font-bold">Official Assignment</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 text-sm italic text-slate-600">
                                    "Your Manager is responsible for lead delegation. Please contact your Admin for any team re-assignments."
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Column 2-4: Registry or Restriction Message */}
                    {profile?.role === 'ADMIN' ? (
                        <Card className="col-span-1 md:col-span-3 shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4">SaaS Identity</th>
                                            <th className="px-6 py-4">System Role</th>
                                            <th className="px-6 py-4">Allocated Team</th>
                                            <th className="px-6 py-4 text-right">Commit Changes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                                    Loading registry...
                                                </td>
                                            </tr>
                                        ) : users.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => {
                                                const currentRoleState = editingRoles[user.id] || user.role;
                                                const currentTeamState = editingTeams[user.id] !== undefined ? editingTeams[user.id] : (user.team_id || 'none');
                                                const isDirty = editingRoles[user.id] !== undefined || editingTeams[user.id] !== undefined;

                                                return (
                                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900 dark:text-slate-100">{user.name || 'Anonymous User'}</div>
                                                            <div className="text-xs text-slate-500">{user.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Select value={currentRoleState} onValueChange={(val: any) => handleRoleChange(user.id, val)}>
                                                                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950">
                                                                    <SelectValue placeholder="Select Role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="SDR">SDR (Caller)</SelectItem>
                                                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                                                    <SelectItem value="ADMIN">God Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Select value={currentTeamState} onValueChange={(val) => handleTeamChange(user.id, val)}>
                                                                <SelectTrigger className={`w-[200px] bg-white dark:bg-slate-950 ${currentTeamState === 'none' ? 'text-slate-400 italic' : ''}`}>
                                                                    <SelectValue placeholder="Unassigned Float" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none" className="italic text-slate-500">Unassigned / Float</SelectItem>
                                                                    {teams.map(t => (
                                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSave(user)}
                                                                disabled={!isDirty || submitting === user.id}
                                                                className={`gap-2 ${isDirty ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400'}`}
                                                            >
                                                                {submitting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                                Save
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : (
                        <Card className="col-span-1 md:col-span-3 shadow-sm border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 italic flex flex-col items-center justify-center gap-4">
                            <ShieldCheck className="h-12 w-12 text-slate-200" />
                            <p>Administrative user registry and team management is restricted to Root Admins.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
