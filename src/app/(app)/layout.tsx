import { auth } from '@/auth';
import AppLayout from '@/components/layout/AppLayout';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Pass user info down to client layout
    return (
        <AppLayout
            user={{
                name: session.user.name || undefined,
                email: session.user.email || '',
                role: (session.user as any)?.role || 'SDR'
            }}
        >
            {children}
        </AppLayout>
    );
}
