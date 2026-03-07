import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';



export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                team_id: true,
                team: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                ...dbUser,
                teamName: dbUser.team?.name || 'Unassigned'
            }
        });
    } catch (e: any) {
        console.error("Profile Fetch Error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
