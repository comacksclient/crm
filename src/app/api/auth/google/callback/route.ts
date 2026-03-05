import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    const session = await auth();

    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL(`/dashboard/admin?error=${error}`, req.url));
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Missing OAuth credentials in environment' }, { status: 500 });
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            throw new Error(tokens.error_description || tokens.error);
        }

        // We specifically need the refresh token. If it's absent, it usually means 
        // the user has authorized before and prompt=consent wasn't forced, but our
        // auth URL forces it.
        const refreshToken = tokens.refresh_token;

        if (refreshToken) {
            // Save it globally for the system
            await prisma.systemConfig.upsert({
                where: { key: 'google_refresh_token' },
                update: { value: refreshToken },
                create: { key: 'google_refresh_token', value: refreshToken }
            });

            return NextResponse.redirect(new URL('/dashboard/admin?oauth=success', req.url));
        } else {
            // If somehow we didn't get a refresh token, but auth succeeded
            return NextResponse.redirect(new URL('/dashboard/admin?oauth=no_refresh_token', req.url));
        }

    } catch (e: any) {
        console.error('OAuth Callback Error:', e);
        return NextResponse.redirect(new URL(`/dashboard/admin?error=exchange_failed`, req.url));
    }
}
