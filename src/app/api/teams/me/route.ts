import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            include: {
                team: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                                createdAt: true
                            },
                            orderBy: { role: 'asc' } // Managers first, then SDRs
                        }
                    }
                }
            }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!dbUser.team) {
            return NextResponse.json({
                hasTeam: false,
                message: "You are currently unassigned. Please ask your administrator to send you a team invite link."
            });
        }

        // Separate Managers and SDRs for the UI
        const managers = dbUser.team.users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');
        const sdrs = dbUser.team.users.filter(u => u.role === 'SDR');

        return NextResponse.json({
            hasTeam: true,
            team: {
                id: dbUser.team.id,
                name: dbUser.team.name,
                createdAt: dbUser.team.createdAt
            },
            managers,
            sdrs,
            currentUser: {
                id: dbUser.id,
                role: dbUser.role
            }
        });

    } catch (e: any) {
        console.error("Error fetching team roster:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
