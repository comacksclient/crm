import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes check
    if (publicRoutes.includes(pathname) || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Get current session directly using the auth wrapper config
    const session = await auth();

    // If no session, redirect to login page
    if (!session || !session.user) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const role = (session.user as any).role;

    // Role Based Access Checks
    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/queue', request.url));
    }
    if (pathname.startsWith('/dashboard/manager') && role !== 'MANAGER' && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/queue', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)'],
};
