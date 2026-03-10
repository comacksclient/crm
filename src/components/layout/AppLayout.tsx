'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    LayoutDashboard,
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
    MessageCircle
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
        // Shared items
        const menu = [
            { name: 'CRM Dashboard', href: '/queue', icon: PhoneCall },
            { name: 'Scheduled Appointments', href: '/meetings', icon: CalendarDays },
            { name: 'Team Directory', href: '/team', icon: Users },
        ];

        // Role-specific items
        if (user.role === 'ADMIN') {
            menu.unshift({ name: 'Admin Control Panel', href: '/dashboard/admin', icon: Settings });
            menu.unshift({ name: 'Lead DistributionCenter', href: '/dashboard/admin/delegation', icon: Target });
            menu.unshift({ name: 'Master Lead Registry', href: '/dashboard/admin/assigned', icon: ClipboardList });
            menu.unshift({ name: 'Staff Management', href: '/dashboard/admin/users', icon: Briefcase });
            menu.unshift({ name: 'WhatsApp Broadcast Hub', href: '/dashboard/whatsapp', icon: MessageCircle });
        } else if (user.role === 'MANAGER') {
            menu.unshift({ name: 'Master Lead Registry', href: '/dashboard/admin/assigned', icon: ClipboardList });
            menu.unshift({ name: 'WhatsApp Broadcast Hub', href: '/dashboard/whatsapp', icon: MessageCircle });
            menu.unshift({ name: 'Team Management Engine', href: '/dashboard/manager', icon: Briefcase });
        }

        return menu;
    };

    const navigation = getNavigationMenu();

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Brand Header */}
                <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                            <Target className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight">ComacksPro </span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* User Badge */}
                <div className="p-4 mx-4 mt-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="font-semibold text-slate-200 truncate text-sm">{user.name || user.email.split('@')[0]}</div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-400 truncate w-[130px]" title={user.email}>{user.email}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {user.role}
                        </span>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-2">Navigation</div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }
                `}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">

                {/* Mobile Header bar */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Target className="h-6 w-6 text-indigo-600" />
                        <span className="font-bold text-slate-900 dark:text-white">ComacksPro</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                        <Menu className="h-6 w-6" />
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
