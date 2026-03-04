import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes check
    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    // Get current session
    const session = await getSession();

    // If no session, redirect to login page
    if (!session) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Basic Role Based Access Checks
    if (pathname.startsWith('/dashboard/admin') && session.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/queue', request.url));
    }
    if (pathname.startsWith('/dashboard/manager') && session.role !== 'MANAGER' && session.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/queue', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)'],
};
