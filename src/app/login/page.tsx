'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Logged in successfully');
                if (data.role === 'ADMIN') {
                    router.push('/dashboard/admin');
                } else if (data.role === 'MANAGER') {
                    router.push('/dashboard/manager');
                } else {
                    router.push('/queue');
                }
                router.refresh();
            } else {
                toast.error(data.error || 'Invalid credentials');
            }
        } catch (e) {
            toast.error('Network error during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
            <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="space-y-2 text-center pb-6">
                    <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        Smart Queue
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        Sign in to access the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="e.g., sdr1"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="bg-white dark:bg-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white dark:bg-slate-900"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
                            disabled={loading}
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-sm transition-colors border border-indigo-100 dark:border-indigo-900/50">
                        <p className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Internal Users Only</p>
                        <p className="text-xs opacity-75 text-indigo-700 dark:text-indigo-400">
                            Please use the credentials provided by your manager. Initial setup: admin / admin123.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
