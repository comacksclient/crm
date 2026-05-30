'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    Users,
    Briefcase,
    PhoneCall,
    CalendarDays,
    Settings,
    LogOut,
    Menu,
    X,
    Target,
    ClipboardList,
    MessageCircle,
    BarChart3
} from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
    user: {
        name?: string;
        email: string;
        role: string;
    };
}

export default function AppLayout({ children, user }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const getNavigationMenu = () => {
        const sections = [
            {
                title: 'Core Operations',
                items: [
                    { name: 'CRM Dashboard', href: '/queue', icon: PhoneCall },
                    { name: 'Scheduled Appointments', href: '/meetings', icon: CalendarDays },
                    { name: 'Team Directory', href: '/team', icon: Users },
                ]
            }
        ];

        const analyticsItems = [];
        if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            analyticsItems.push({ name: 'System Overview', href: '/dashboard/overview', icon: BarChart3 });
            analyticsItems.push({ name: 'WhatsApp Broadcast Hub', href: '/dashboard/whatsapp', icon: MessageCircle });
        }

        if (analyticsItems.length > 0) {
            sections.push({
                title: 'Analytics & Broadcasting',
                items: analyticsItems
            });
        }

        const adminItems = [];
        if (user.role === 'ADMIN') {
            adminItems.push({ name: 'Lead Distribution Center', href: '/dashboard/admin/delegation', icon: Target });
            adminItems.push({ name: 'Master Lead Registry', href: '/dashboard/admin/assigned', icon: ClipboardList });
            adminItems.push({ name: 'Staff Management', href: '/dashboard/admin/users', icon: Briefcase });
            adminItems.push({ name: 'Admin Control Panel', href: '/dashboard/admin', icon: Settings });
        } else if (user.role === 'MANAGER') {
            adminItems.push({ name: 'Master Lead Registry', href: '/dashboard/admin/assigned', icon: ClipboardList });
            adminItems.push({ name: 'Team Management Engine', href: '/dashboard/manager', icon: Briefcase });
        }

        if (user.role === 'ADMIN' || user.role === 'HR') {
            adminItems.push({ name: 'HR Recruits Portal', href: '/dashboard/hr', icon: Briefcase });
        }

        if (adminItems.length > 0) {
            sections.push({
                title: 'Administration',
                items: adminItems
            });
        }

        return sections;
    };

    const navigation = getNavigationMenu();

    // Compute initials for the user avatar
    const getInitials = () => {
        if (user.name) {
            return user.name
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase();
        }
        return user.email.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 lg:bg-slate-900/95 backdrop-blur-md border-r border-slate-900 lg:border-slate-800/50
                transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Header */}
                <div className="flex items-center justify-between h-16 px-6 bg-slate-950/80 border-b border-slate-900 lg:border-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-650 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:rotate-6 shrink-0">
                            <Target className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <span className="text-base font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                            ComacksGrow
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* User Glass Card Badge */}
                <div className="p-3 mx-4 mt-4 bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-800/60 flex items-center gap-3">
                    <div className="relative h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                        {getInitials()}
                        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-200 truncate leading-tight">
                            {user.name || user.email.split('@')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5" title={user.email}>
                            {user.email}
                        </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                        {user.role}
                    </span>
                </div>

                {/* Navigation Links Grouped by Segment */}
                <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto no-scrollbar">
                    {navigation.map((section) => (
                        <div key={section.title} className="space-y-1">
                            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest ml-3 mb-2">
                                {section.title}
                            </div>
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`
                                            group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative
                                            ${isActive
                                                ? 'bg-indigo-600 text-white border border-indigo-500/30 shadow-sm'
                                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                                            }
                                        `}
                                    >
                                        {isActive && (
                                            <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-400 rounded-r-full" />
                                        )}
                                        <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer Sign Out */}
                <div className="p-4 border-t border-slate-900 lg:border-slate-800/40 bg-slate-950/40">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="group flex items-center w-full gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200"
                    >
                        <LogOut className="h-4 w-4 text-slate-500 group-hover:text-rose-450 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">

                {/* Mobile Header bar */}
                <header className="lg:hidden flex items-center justify-between h-16 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-gradient-to-br from-indigo-650 to-violet-650 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <Target className="h-4.5 w-4.5 text-white" />
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">ComacksGrow</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 no-scrollbar">
                    {children}
                </div>
            </main>

        </div>
    );
}
