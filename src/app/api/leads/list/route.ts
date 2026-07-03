import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { mapPrismaToLead } from '@/lib/leadService';
import { format } from 'date-fns';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { team: { select: { name: true } } }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');


        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!dbUser.lastActiveAt || dbUser.lastActiveAt < fiveMinutesAgo) {
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { lastActiveAt: now }
            });
        }


        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '25');
        const search = url.searchParams.get('search') || '';
        const city = url.searchParams.get('city') || 'all';
        const sdrIdFilter = url.searchParams.get('sdrId') || 'all';
        const leadStatus = url.searchParams.get('status') || 'Active';
        const nextAction = url.searchParams.get('nextAction') || 'all';
        const isOverdueFilter = url.searchParams.get('overdue'); // 'true' or 'false'
        const scheduleFilter = url.searchParams.get('schedule') || 'all'; // 'all', 'today', 'yesterday-overdue', 'future'

        const skip = (page - 1) * limit;

        // 3. Keep Overdue Flag and Priority Scores Sync'd with Date Progressions
        // Marks active leads whose scheduled date has passed as overdue (+100 priority score)
        const overdueNeedSync = await prisma.lead.findFirst({
            where: {
                lead_status: 'Active',
                next_action_date: { lt: todayStr },
                overdue: false
            },
            select: { id: true }
        });

        if (overdueNeedSync) {
            await prisma.lead.updateMany({
                where: {
                    lead_status: 'Active',
                    next_action_date: { lt: todayStr },
                    overdue: false
                },
                data: {
                    overdue: true,
                    priority_score: { increment: 100 }
                }
            });
        }

        // 4. Implement Dynamic 75-Lead Daily Auto-Queue for SDRs
        // If an SDR fetches their active queue and their due leads are < 75, we auto-assign unassigned leads
        if (dbUser.role === 'SDR' && leadStatus === 'Active') {
            const currentDueCount = await prisma.lead.count({
                where: {
                    sdr_id: dbUser.id,
                    lead_status: 'Active',
                    OR: [
                        { next_action_date: { lte: todayStr } },
                        { next_action_date: null }
                    ]
                }
            });

            if (currentDueCount < 75 && dbUser.team_id) {
                const topUpNeeded = 75 - currentDueCount;


                const newLeads = await prisma.lead.findMany({
                    where: {
                        team_id: dbUser.team_id,
                        sdr_id: null,
                        lead_status: 'Active'
                    },
                    orderBy: [
                        { priority_score: 'desc' },
                        { createdAt: 'asc' }
                    ],
                    take: topUpNeeded,
                    select: { id: true }
                });

                if (newLeads.length > 0) {
                    await prisma.lead.updateMany({
                        where: {
                            id: { in: newLeads.map(l => l.id) }
                        },
                        data: {
                            sdr_id: dbUser.id,
                            assigned_to: dbUser.name || dbUser.email,
                            assigned_date: now.toISOString(),
                            next_action_date: todayStr // Schedule for today
                        }
                    });
                }
            }
        }

        // Calculate Tomorrow Forecast Count
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        
        let tomorrowWhere: any = {
            lead_status: 'Active',
            next_action_date: tomorrowStr
        };
        if (dbUser.role === 'SDR') {
            tomorrowWhere.sdr_id = dbUser.id;
        } else if (dbUser.role === 'MANAGER' && dbUser.team_id) {
            tomorrowWhere.team_id = dbUser.team_id;
        }
        const tomorrowForecast = await prisma.lead.count({
            where: tomorrowWhere
        });

        const whereClause: any = {
            lead_status: leadStatus
        };


        if (dbUser.role === 'SDR') {
            whereClause.sdr_id = dbUser.id;
            if (leadStatus === 'Active') {
                if (scheduleFilter === 'today') {
                    whereClause.next_action_date = todayStr;
                } else if (scheduleFilter === 'yesterday-overdue') {
                    whereClause.next_action_date = { lt: todayStr };
                } else if (isOverdueFilter === 'false') {
                    // SDR checking future tab
                    whereClause.next_action_date = { gt: todayStr };
                } else {
                    whereClause.OR = [
                        { next_action_date: { lte: todayStr } },
                        { next_action_date: null }
                    ];
                }
            }
        } else if (dbUser.role === 'MANAGER') {
            if (dbUser.team_id) {
                whereClause.team_id = dbUser.team_id;
            } else {
                return NextResponse.json({ leads: [], total: 0, page, totalPages: 0, teamName: 'Unassigned' });
            }
        }

        // Apply admin/manager filters
        if (dbUser.role !== 'SDR') {
            if (sdrIdFilter !== 'all') {
                if (sdrIdFilter === 'unassigned') {
                    whereClause.sdr_id = null;
                } else {
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sdrIdFilter);
                    if (isUuid) {
                        whereClause.sdr_id = sdrIdFilter;
                    } else {
                        const sdrUser = await prisma.user.findFirst({
                            where: {
                                OR: [
                                    { name: sdrIdFilter },
                                    { email: sdrIdFilter }
                                ]
                            },
                            select: { id: true }
                        });
                        if (sdrUser) {
                            whereClause.sdr_id = sdrUser.id;
                        } else {
                            whereClause.assigned_to = sdrIdFilter;
                        }
                    }
                }
            }
            if (city !== 'all') {
                whereClause.city = { equals: city, mode: 'insensitive' };
            }


            if (leadStatus === 'Active') {
                if (scheduleFilter === 'today') {
                    whereClause.next_action_date = todayStr;
                } else if (scheduleFilter === 'yesterday-overdue') {
                    whereClause.next_action_date = { lt: todayStr };
                } else if (scheduleFilter === 'future') {
                    whereClause.next_action_date = { gt: todayStr };
                } else {

                    if (isOverdueFilter === 'true') {
                        whereClause.next_action_date = { lte: todayStr };
                    } else if (isOverdueFilter === 'false') {
                        whereClause.next_action_date = { gt: todayStr };
                    } else {
                        whereClause.OR = [
                            { next_action_date: { lte: todayStr } },
                            { next_action_date: null }
                        ];
                    }
                }
            }
        }


        if (nextAction !== 'all') {
            if (nextAction === 'follow-up') {
                whereClause.next_action_type = {
                    contains: 'follow',
                    mode: 'insensitive'
                };
            } else if (nextAction === 'reattempt') {
                whereClause.next_action_type = 'Reattempt call';
            } else if (nextAction === 'new') {
                whereClause.next_action_type = 'New';
            } else {
                whereClause.next_action_type = nextAction;
            }
        }

        if (isOverdueFilter === 'true') {
            whereClause.overdue = true;
        } else if (isOverdueFilter === 'false') {
            whereClause.overdue = false;
        }


        if (search) {
            whereClause.OR = [
                { clinic_name: { contains: search, mode: 'insensitive' } },
                { phone_number: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { lead_identity: { contains: search, mode: 'insensitive' } }
            ];
        }


        const [dbLeads, total] = await Promise.all([
            prisma.lead.findMany({
                where: whereClause,
                include: {
                    logs: {
                        orderBy: { createdAt: 'desc' },
                        include: { sdr: { select: { name: true, email: true } } }
                    }
                },
                orderBy: [
                    { priority_score: 'desc' },
                    { touch_count: 'asc' }
                ],
                take: dbUser.role === 'SDR' ? 75 : limit,
                skip: dbUser.role === 'SDR' ? 0 : skip,
            }),
            prisma.lead.count({
                where: whereClause
            })
        ]);

        const leads = dbLeads.map(mapPrismaToLead);
        const totalPages = Math.ceil(total / limit);

        // Fetch active SDRs scoped to user's role/team boundary
        const sdrListWhere: any = { role: 'SDR' };
        if (dbUser.role === 'MANAGER' && dbUser.team_id) {
            sdrListWhere.team_id = dbUser.team_id;
        }
        const activeSdrs = await prisma.user.findMany({
            where: sdrListWhere,
            select: { name: true, email: true }
        });
        const sdrsList = activeSdrs.map(s => s.name || s.email).filter(Boolean);

        return NextResponse.json({
            leads,
            total,
            page,
            totalPages,
            teamName: dbUser.team?.name || 'Unassigned',
            tomorrowForecast,
            sdrs: sdrsList
        });

    } catch (e: any) {
        console.error("Error fetching leads list:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
