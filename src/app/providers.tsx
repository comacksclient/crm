'use client';

import { Toaster } from '@/components/ui/sonner';
import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <Toaster />
        </SessionProvider>
    );
}
