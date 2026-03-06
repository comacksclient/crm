'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldCheck, Mail, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useSession, signIn } from 'next-auth/react';

export default function InviteLandingPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();

    const [teamName, setTeamName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);

    const token = params.token as string;

    useEffect(() => {
        if (!token) return;

        const verifyToken = async () => {
            try {
                const res = await fetch(`/api/teams/invite/info/${token}`);
                if (res.ok) {
                    const data = await res.json();
                    setTeamName(data.teamName);
                } else {
                    const data = await res.json();
                    setError(data.error || 'This invite link is invalid or expired.');
                }
            } catch (e) {
                setError('Failed to securely verify this invitation.');
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleAcceptInvite = async () => {
        if (!session) {
            // Force them to log in first, Google Auth will redirect them right back here
            signIn('google', { callbackUrl: `/invite/${token}` });
            return;
        }

        setAccepting(true);
        try {
            const res = await fetch('/api/teams/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (res.ok) {
                toast.success(`Welcome to ${teamName}!`);
                router.push('/queue'); // Instantly drop them into work
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to accept invitation.');
                setError(data.error);
            }
        } catch (e) {
            toast.error('Network error while joining team.');
        } finally {
            setAccepting(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="h-6 w-6 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Invalid Invitation</h1>
                    <p className="text-slate-500">{error}</p>
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full mt-4">
                        Return Home
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

            <Card className="max-w-md w-full p-8 text-center space-y-6 relative z-10 shadow-xl border-slate-200/60 bg-white/90 backdrop-blur-sm">
                <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-2">
                    <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-slate-900">You've been invited!</h1>
                    <p className="text-slate-500 mt-2">
                        You have been invited to join <span className="font-semibold text-indigo-600">{teamName}</span> as an SDR.
                    </p>
                </div>

                {!session ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-sm text-slate-600">Please authenticate with your corporate Google account to accept this invitation.</p>
                        <Button
                            onClick={handleAcceptInvite}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign in with Google
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-left">
                            <p className="text-xs text-indigo-800 font-semibold uppercase tracking-wider mb-1">Authenticated As</p>
                            <div className="flex items-center gap-3">
                                {session.user.image ? (
                                    <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full border border-indigo-200" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                                        {session.user.email?.[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-900 truncate">{session.user.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleAcceptInvite}
                            disabled={accepting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg h-12 shadow-md gap-2"
                        >
                            {accepting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                            Accept & Join Queue
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
