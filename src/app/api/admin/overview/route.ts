import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, role: true, team_id: true }
        });

        if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Forbidden: Admins and Managers only.' }, { status: 403 });
        }

        // --- IDEMPOTENT BACKGROUND BACKFILL SYSTEM ---
        // Dynamically seeds the CallLog table from older lead records to preserve analytics
        const unloggedLeadsCount = await prisma.lead.count({
            where: {
                call_outcome: { not: null },
                last_call_date: { not: null },
                logs: { none: {} }
            }
        });

        const unloggedMeetingsCount = await prisma.meeting.count({
            where: {
                lead: {
                    logs: { none: {} }
                }
            }
        });

        if (unloggedLeadsCount > 0 || unloggedMeetingsCount > 0) {
            console.log(`[Backfill] Syncing data: Found ${unloggedLeadsCount} unlogged leads & ${unloggedMeetingsCount} unlogged meetings.`);
            
            if (unloggedLeadsCount > 0) {
                const leadsToBackfill = await prisma.lead.findMany({
                    where: {
                        call_outcome: { not: null },
                        last_call_date: { not: null },
                        logs: { none: {} }
                    },
                    select: {
                        id: true,
                        call_outcome: true,
                        doctor_type: true,
                        interest_level: true,
                        call_notes: true,
                        last_call_date: true,
                        sdr_id: true,
                        assigned_to: true
                    }
                });

                for (const lead of leadsToBackfill) {
                    let sdrId = lead.sdr_id;
                    if (!sdrId && lead.assigned_to) {
                        const user = await prisma.user.findFirst({
                            where: {
                                OR: [
                                    { email: lead.assigned_to },
                                    { name: lead.assigned_to }
                                ]
                            },
                            select: { id: true }
                        });
                        if (user) sdrId = user.id;
                    }

                    if (!sdrId) {
                        const defaultUser = await prisma.user.findFirst({
                            where: { role: 'SDR' },
                            select: { id: true }
                        }) || await prisma.user.findFirst({
                            select: { id: true }
                        });
                        if (defaultUser) sdrId = defaultUser.id;
                    }

                    if (!sdrId) continue;

                    let callDate = new Date();
                    if (lead.last_call_date) {
                        const parsed = new Date(lead.last_call_date);
                        if (!isNaN(parsed.getTime())) {
                            callDate = parsed;
                        }
                    }

                    await prisma.callLog.create({
                        data: {
                            lead_id: lead.id,
                            sdr_id: sdrId,
                            outcome: lead.call_outcome || 'Unknown',
                            doctor_type: lead.doctor_type,
                            interest_level: lead.interest_level,
                            notes: lead.call_notes || 'Backfilled historical call log',
                            createdAt: callDate
                        }
                    });
                }
            }

            if (unloggedMeetingsCount > 0) {
                const meetingsToBackfill = await prisma.meeting.findMany({
                    where: {
                        lead: {
                            logs: { none: {} }
                        }
                    },
                    include: {
                        lead: {
                            select: {
                                sdr_id: true,
                                doctor_type: true
                            }
                        }
                    }
                });

                for (const meeting of meetingsToBackfill) {
                    let sdrId = meeting.lead?.sdr_id;
                    if (!sdrId && meeting.booked_by) {
                        const user = await prisma.user.findFirst({
                            where: { email: meeting.booked_by },
                            select: { id: true }
                        });
                        if (user) sdrId = user.id;
                    }

                    if (!sdrId) {
                        const defaultUser = await prisma.user.findFirst({
                            where: { role: 'SDR' },
                            select: { id: true }
                        }) || await prisma.user.findFirst({
                            select: { id: true }
                        });
                        if (defaultUser) sdrId = defaultUser.id;
                    }

                    if (!sdrId) continue;

                    let meetingDate = new Date();
                    const parsed = new Date(meeting.meeting_date);
                    if (!isNaN(parsed.getTime())) {
                        meetingDate = parsed;
                    } else if (meeting.createdAt) {
                        meetingDate = meeting.createdAt;
                    }

                    await prisma.callLog.create({
                        data: {
                            lead_id: meeting.lead_id,
                            sdr_id: sdrId,
                            outcome: 'Doctor Connected',
                            doctor_type: meeting.lead?.doctor_type || null,
                            interest_level: 5,
                            notes: meeting.meeting_notes || 'Backfilled meeting booking call log',
                            createdAt: meetingDate
                        }
                    });
                }
            }
            console.log(`[Backfill] Database backfill sync completed successfully.`);
        }

        // 1. Configure Scope (Managers see their team, Admins see everything)
        const leadScope: any = {};
        const logScope: any = {};
        const meetingScope: any = {};

        if (dbUser.role === 'MANAGER' && dbUser.team_id) {
            leadScope.team_id = dbUser.team_id;
            logScope.lead = { team_id: dbUser.team_id };
            meetingScope.lead = { team_id: dbUser.team_id };
        }

        // Time periods
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfDay(subDays(now, 7));

        // 2. Fetch General Lead Status Counts & Meeting Counts
        const [
            totalLeads,
            activeLeads,
            bookedLeads,
            disqualifiedLeads,
            overdueLeads,
            totalMeetings,
            scheduledCount,
            noShowCount
        ] = await Promise.all([
            prisma.lead.count({ where: leadScope }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Active' } }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Meeting Booked' } }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Disqualified' } }),
            prisma.lead.count({ where: { ...leadScope, lead_status: 'Active', overdue: true } }),
            prisma.meeting.count({ where: meetingScope }),
            prisma.meeting.count({ where: { ...meetingScope, meeting_status: 'Scheduled' } }),
            prisma.meeting.count({ where: { ...meetingScope, meeting_status: 'No Show' } })
        ]);

        // 3. Fetch Call Counts and Connections (Daily vs Weekly)
        // Daily Logs
        const dailyLogs = await prisma.callLog.findMany({
            where: {
                ...logScope,
                createdAt: { gte: todayStart }
            },
            select: { outcome: true, interest_level: true }
        });

        // Weekly Logs
        const weeklyLogs = await prisma.callLog.findMany({
            where: {
                ...logScope,
                createdAt: { gte: weekStart }
            },
            select: { outcome: true, interest_level: true }
        });

        // Compute metrics helper
        const processCallMetrics = (logs: Array<{ outcome: string, interest_level: number | null }>) => {
            const totalCalls = logs.length;
            let connected = 0;
            let noPickup = 0;
            let invalid = 0;
            let callbackReq = 0;
            let interested = 0;

            logs.forEach(log => {
                if (log.outcome === 'Doctor Connected') {
                    connected++;
                    if (log.interest_level && log.interest_level >= 3) {
                        interested++;
                    }
                } else if (log.outcome === 'Not Picked') {
                    noPickup++;
                } else if (log.outcome === 'Invalid') {
                    invalid++;
                } else if (log.outcome === 'Call back requested' || log.outcome === 'Assistant picked') {
                    callbackReq++;
                }
            });

            const connectRate = totalCalls > 0 ? ((connected / totalCalls) * 100).toFixed(1) : '0.0';
            const interestRate = connected > 0 ? ((interested / connected) * 100).toFixed(1) : '0.0';

            return {
                totalCalls,
                connected,
                noPickup,
                invalid,
                callbackReq,
                interested,
                connectRate,
                interestRate
            };
        };

        const dailyMetrics = processCallMetrics(dailyLogs);
        const weeklyMetrics = processCallMetrics(weeklyLogs);

        // 4. Fetch Meeting Metrics (Created daily vs weekly)
        const [meetingsToday, meetingsThisWeek] = await Promise.all([
            prisma.meeting.count({
                where: {
                    ...meetingScope,
                    createdAt: { gte: todayStart }
                }
            }),
            prisma.meeting.count({
                where: {
                    ...meetingScope,
                    createdAt: { gte: weekStart }
                }
            })
        ]);

        // 5. SDR Live Leaderboard & Performance Tickers
        const sdrWhere: any = { role: 'SDR' };
        if (dbUser.team_id) {
            sdrWhere.team_id = dbUser.team_id;
        }

        const sdrs = await prisma.user.findMany({
            where: sdrWhere,
            select: { id: true, name: true, email: true, lastActiveAt: true }
        });

        const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
        const sdrLeaderboard = [];

        for (const sdr of sdrs) {
            const [assignedLeads, callsTodaySdr, meetingsBookedToday, meetingsBookedTotal] = await Promise.all([
                prisma.lead.count({ where: { sdr_id: sdr.id, lead_status: 'Active' } }),
                prisma.callLog.count({ where: { sdr_id: sdr.id, createdAt: { gte: todayStart } } }),
                prisma.meeting.count({ where: { booked_by: sdr.email, createdAt: { gte: todayStart } } }),
                prisma.meeting.count({ where: { booked_by: sdr.email } })
            ]);

            const isLive = sdr.lastActiveAt ? new Date(sdr.lastActiveAt) > sixMinutesAgo : false;

            sdrLeaderboard.push({
                id: sdr.id,
                name: sdr.name || sdr.email.split('@')[0],
                email: sdr.email,
                assignedLeads,
                callsToday: callsTodaySdr,
                meetingsBookedToday,
                meetingsBookedTotal,
                meetingsBooked: meetingsBookedTotal, // backward compatibility
                conversionRate: assignedLeads > 0 ? ((meetingsBookedTotal / (assignedLeads + meetingsBookedTotal)) * 100).toFixed(1) : '0.0', // backward compatibility
                status: isLive ? 'LIVE' : 'OFFLINE'
            });
        }

        // Sort leaderboard by calls completed today
        sdrLeaderboard.sort((a, b) => b.callsToday - a.callsToday);

        // 6. Recent Meetings (last 8)
        const recentMeetings = await prisma.meeting.findMany({
            where: meetingScope,
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                id: true,
                clinic_name: true,
                phone_number: true,
                meeting_date: true,
                meeting_time: true,
                meeting_status: true,
                booked_by: true,
                createdAt: true
            }
        });

        // 7. Calculate Efficiency Metrics (Daily & Weekly)
        const dailyMeetingRate = dailyMetrics.connected > 0 ? ((meetingsToday / dailyMetrics.connected) * 100).toFixed(1) : '0.0';
        const weeklyMeetingRate = weeklyMetrics.connected > 0 ? ((meetingsThisWeek / weeklyMetrics.connected) * 100).toFixed(1) : '0.0';

        return NextResponse.json({
            // Lead Status Tickers
            totalLeads,
            activeLeads,
            bookedLeads,
            disqualifiedLeads,
            overdueLeads,

            // Compatibility Fields for Dashboard UI
            callsToday: dailyMetrics.totalCalls,
            meetingsToday,
            totalMeetings,
            scheduledCount,
            noShowCount,

            // Daily Stats
            dailyCalls: dailyMetrics.totalCalls,
            dailyConnected: dailyMetrics.connected,
            dailyNoPickup: dailyMetrics.noPickup,
            dailyInvalid: dailyMetrics.invalid,
            dailyCallback: dailyMetrics.callbackReq,
            dailyMeetingsBooked: meetingsToday,
            dailyConnectRate: dailyMetrics.connectRate,
            dailyInterestRate: dailyMetrics.interestRate,
            dailyMeetingBookingRate: dailyMeetingRate,

            // Weekly Stats
            weeklyCalls: weeklyMetrics.totalCalls,
            weeklyConnected: weeklyMetrics.connected,
            weeklyNoPickup: weeklyMetrics.noPickup,
            weeklyInvalid: weeklyMetrics.invalid,
            weeklyCallback: weeklyMetrics.callbackReq,
            weeklyMeetingsBooked: meetingsThisWeek,
            weeklyConnectRate: weeklyMetrics.connectRate,
            weeklyInterestRate: weeklyMetrics.interestRate,
            weeklyMeetingBookingRate: weeklyMeetingRate,

            // SDR Leaderboard
            sdrLeaderboard,
            recentMeetings,
            generatedAt: new Date().toISOString()
        });

    } catch (e: any) {
        console.error('Error fetching admin dashboard overview data:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
